"""
Order management API endpoints.

Supports:
- Creating orders from cart (with transaction handling)
- Getting order details
- Listing user orders
- Order status updates (admin only - future)
"""
import secrets
from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_user
from app.db.models.cart import Cart, CartItem
from app.db.models.order import Order, OrderItem, OrderStatus
from app.db.models.product import Inventory, ProductVariant
from app.db.models.user import User
from app.db.session import get_db

router = APIRouter()


# ==================== Request/Response Models ====================

class ShippingAddress(BaseModel):
    """Shipping address information"""
    name: str = Field(..., min_length=1, max_length=200)
    address_line1: str = Field(..., min_length=1, max_length=200)
    address_line2: Optional[str] = Field(None, max_length=200)
    city: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=100)
    postal_code: str = Field(..., min_length=1, max_length=20)
    country: str = Field(..., min_length=1, max_length=100)


class OrderCreate(BaseModel):
    """Request model for creating order"""
    shipping_address: ShippingAddress


class OrderItemResponse(BaseModel):
    """Response model for order item"""
    id: str
    product_name: str
    variant_name: Optional[str]
    sku: str
    price_cents: int
    quantity: int
    currency: str

    class Config:
        orm_mode = True


class OrderResponse(BaseModel):
    """Response model for order"""
    id: str
    order_number: str
    status: str
    subtotal_cents: int
    tax_cents: int
    shipping_cents: int
    total_cents: int
    currency: str
    shipping_address: Optional[ShippingAddress]
    items: List[OrderItemResponse]
    created_at: str

    class Config:
        orm_mode = True


class OrderListResponse(BaseModel):
    """Response model for order list"""
    items: List[OrderResponse]
    total: int


# ==================== Helper Functions ====================

def generate_order_number() -> str:
    """
    Generate unique order number.
    Format: ORD-{timestamp}-{random}
    """
    import time
    timestamp = int(time.time())
    random_part = secrets.token_hex(4).upper()
    return f"ORD-{timestamp}-{random_part}"


def validate_cart_stock(cart: Cart, db: Session) -> List[Tuple[CartItem, ProductVariant, Inventory]]:
    """
    Validate all cart items have sufficient stock.
    
    Returns:
        List of tuples: (CartItem, ProductVariant, Inventory)
        
    Raises:
        HTTPException: If any item has insufficient stock or is unavailable
    """
    validated_items = []
    
    for cart_item in cart.items:
        variant = (
            db.query(ProductVariant)
            .filter(
                ProductVariant.id == cart_item.variant_id,
                ProductVariant.is_active.is_(True),
            )
            .first()
        )
        
        if not variant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product variant {cart_item.variant_id} not found or inactive",
            )
        
        if not variant.product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {variant.product.name} is not available",
            )
        
        inventory = db.query(Inventory).filter(Inventory.variant_id == variant.id).first()
        if not inventory:
            inventory = Inventory(variant_id=variant.id, stock_on_hand=0)
        
        available_stock = inventory.stock_on_hand - inventory.stock_reserved
        
        if available_stock < cart_item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {variant.product.name} ({variant.name}). "
                       f"Available: {available_stock}, Requested: {cart_item.quantity}",
            )
        
        validated_items.append((cart_item, variant, inventory))
    
    return validated_items


def reserve_stock(
    variant_id: str,
    quantity: int,
    db: Session,
) -> None:
    """
    Reserve stock for an order item.
    Updates inventory.stock_reserved atomically.
    
    This function assumes it's called within a transaction.
    """
    # Use SELECT FOR UPDATE to lock the row
    stmt = select(Inventory).where(Inventory.variant_id == variant_id).with_for_update()
    inventory = db.execute(stmt).scalar_one_or_none()
    
    if not inventory:
        # Create inventory record if it doesn't exist
        inventory = Inventory(variant_id=variant_id, stock_on_hand=0, stock_reserved=0)
        db.add(inventory)
    
    # Double-check available stock (with lock)
    available = inventory.stock_on_hand - inventory.stock_reserved
    
    if available < quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock after validation. Available: {available}, Requested: {quantity}",
        )
    
    # Reserve stock
    inventory.stock_reserved += quantity


def calculate_order_totals(
    validated_items: List[Tuple[CartItem, ProductVariant, Inventory]],
    db: Session,
) -> Tuple[int, int, int, int]:
    """
    Calculate order pricing totals.
    
    Returns:
        Tuple of (subtotal_cents, tax_cents, shipping_cents, total_cents)
    """
    subtotal = 0
    
    for cart_item, variant, _ in validated_items:
        price = variant.price_cents if variant.price_cents else variant.product.price_cents
        subtotal += price * cart_item.quantity
    
    # TODO: Implement tax calculation based on shipping address
    tax_cents = 0
    
    # TODO: Implement shipping calculation based on weight/address
    shipping_cents = 0
    
    total_cents = subtotal + tax_cents + shipping_cents
    
    return subtotal, tax_cents, shipping_cents, total_cents


# ==================== API Endpoints ====================

@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_data: OrderCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderResponse:
    """
    Create order from user's cart.
    
    This endpoint uses database transactions to ensure atomicity:
    1. Validates cart is not empty
    2. Validates all items have sufficient stock
    3. Reserves stock for all items (with row-level locking)
    4. Creates order and order items
    5. Clears cart
    6. Commits transaction (or rolls back on any error)
    
    All-or-nothing: Either entire order succeeds or nothing changes.
    
    Failure scenarios handled:
    - Empty cart → 400 Bad Request
    - Insufficient stock → 400 Bad Request (before transaction)
    - Stock race condition → 400 Bad Request (caught during reservation)
    - Database constraint violation → 500 Internal Server Error (rollback)
    - Any other exception → Rollback and re-raise
    """
    # Get user's cart
    cart = (
        db.query(Cart)
        .options(joinedload(Cart.items).joinedload(CartItem.variant).joinedload(ProductVariant.product))
        .filter(Cart.user_id == user.id)
        .first()
    )
    
    if not cart or not cart.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart is empty",
        )
    
    # Start transaction
    # FastAPI's get_db dependency manages the transaction automatically
    # We'll use explicit transaction control for clarity
    
    try:
        # Step 1: Validate all cart items have sufficient stock
        validated_items = validate_cart_stock(cart, db)
        
        # Step 2: Calculate totals
        subtotal, tax, shipping, total = calculate_order_totals(validated_items, db)
        
        # Step 3: Generate unique order number
        order_number = generate_order_number()
        
        # Ensure order number is unique (retry if collision - extremely rare)
        max_retries = 5
        for attempt in range(max_retries):
            existing = db.query(Order).filter(Order.order_number == order_number).first()
            if not existing:
                break
            if attempt == max_retries - 1:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to generate unique order number",
                )
            order_number = generate_order_number()
        
        # Step 4: Reserve stock atomically (with row locks)
        # This prevents race conditions where multiple orders try to reserve same stock
        for cart_item, variant, inventory in validated_items:
            reserve_stock(str(variant.id), cart_item.quantity, db)
        
        # Step 5: Create order record
        order = Order(
            user_id=user.id,
            order_number=order_number,
            status=OrderStatus.PENDING.value,
            subtotal_cents=subtotal,
            tax_cents=tax,
            shipping_cents=shipping,
            total_cents=total,
            currency=validated_items[0][1].product.currency if validated_items else "INR",
            shipping_name=order_data.shipping_address.name,
            shipping_address_line1=order_data.shipping_address.address_line1,
            shipping_address_line2=order_data.shipping_address.address_line2,
            shipping_city=order_data.shipping_address.city,
            shipping_state=order_data.shipping_address.state,
            shipping_postal_code=order_data.shipping_address.postal_code,
            shipping_country=order_data.shipping_address.country,
        )
        db.add(order)
        db.flush()  # Get order.id without committing
        
        # Step 6: Create order items (with product snapshots)
        order_items = []
        for cart_item, variant, _ in validated_items:
            price = variant.price_cents if variant.price_cents else variant.product.price_cents
            
            order_item = OrderItem(
                order_id=order.id,
                variant_id=variant.id,
                product_name=variant.product.name,
                variant_name=variant.name,
                sku=variant.sku,
                price_cents=price,
                quantity=cart_item.quantity,
                currency=variant.product.currency,
            )
            db.add(order_item)
            order_items.append(order_item)
        
        db.flush()  # Get order item IDs
        
        # Step 7: Clear cart (remove all items)
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        
        # Step 8: Commit entire transaction
        # If any step above fails, this won't execute and get_db will rollback
        db.commit()
        
        # Refresh order to get latest data
        db.refresh(order)
        order = (
            db.query(Order)
            .options(joinedload(Order.items))
            .filter(Order.id == order.id)
            .first()
        )
        
        # Build response
        items_response = [
            OrderItemResponse(
                id=str(item.id),
                product_name=item.product_name,
                variant_name=item.variant_name,
                sku=item.sku,
                price_cents=item.price_cents,
                quantity=item.quantity,
                currency=item.currency,
            )
            for item in order.items
        ]
        
        return OrderResponse(
            id=str(order.id),
            order_number=order.order_number,
            status=order.status,  # Status is stored as string
            subtotal_cents=order.subtotal_cents,
            tax_cents=order.tax_cents,
            shipping_cents=order.shipping_cents,
            total_cents=order.total_cents,
            currency=order.currency,
            shipping_address=ShippingAddress(
                name=order.shipping_name or "",
                address_line1=order.shipping_address_line1 or "",
                address_line2=order.shipping_address_line2,
                city=order.shipping_city or "",
                state=order.shipping_state or "",
                postal_code=order.shipping_postal_code or "",
                country=order.shipping_country or "",
            ) if order.shipping_name else None,
            items=items_response,
            created_at=order.created_at.isoformat(),
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions (these are expected failures)
        db.rollback()
        raise
    
    except IntegrityError as exc:
        # Database constraint violations (e.g., duplicate order number)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order due to database constraint violation",
        ) from exc
    
    except Exception as exc:
        # Any other unexpected error
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order",
        ) from exc


@router.get("/orders", response_model=OrderListResponse, status_code=status.HTTP_200_OK)
def list_orders(
    skip: int = 0,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderListResponse:
    """
    Get list of user's orders.
    """
    orders = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    total = db.query(Order).filter(Order.user_id == user.id).count()
    
    items_response = []
    for order in orders:
        items_response.append(
            OrderResponse(
                id=str(order.id),
                order_number=order.order_number,
                status=order.status,  # Status is stored as string
                subtotal_cents=order.subtotal_cents,
                tax_cents=order.tax_cents,
                shipping_cents=order.shipping_cents,
                total_cents=order.total_cents,
                currency=order.currency,
                shipping_address=ShippingAddress(
                    name=order.shipping_name or "",
                    address_line1=order.shipping_address_line1 or "",
                    address_line2=order.shipping_address_line2,
                    city=order.shipping_city or "",
                    state=order.shipping_state or "",
                    postal_code=order.shipping_postal_code or "",
                    country=order.shipping_country or "",
                ) if order.shipping_name else None,
                items=[
                    OrderItemResponse(
                        id=str(item.id),
                        product_name=item.product_name,
                        variant_name=item.variant_name,
                        sku=item.sku,
                        price_cents=item.price_cents,
                        quantity=item.quantity,
                        currency=item.currency,
                    )
                    for item in order.items
                ],
                created_at=order.created_at.isoformat(),
            )
        )
    
    return OrderListResponse(items=items_response, total=total)


@router.get("/orders/{order_id}", response_model=OrderResponse, status_code=status.HTTP_200_OK)
def get_order(
    order_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderResponse:
    """
    Get order details by ID.
    Users can only view their own orders.
    """
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id, Order.user_id == user.id)
        .first()
    )
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    return OrderResponse(
        id=str(order.id),
        order_number=order.order_number,
        status=order.status.value,
        subtotal_cents=order.subtotal_cents,
        tax_cents=order.tax_cents,
        shipping_cents=order.shipping_cents,
        total_cents=order.total_cents,
        currency=order.currency,
        shipping_address=ShippingAddress(
            name=order.shipping_name or "",
            address_line1=order.shipping_address_line1 or "",
            address_line2=order.shipping_address_line2,
            city=order.shipping_city or "",
            state=order.shipping_state or "",
            postal_code=order.shipping_postal_code or "",
            country=order.shipping_country or "",
        ) if order.shipping_name else None,
        items=[
            OrderItemResponse(
                id=str(item.id),
                product_name=item.product_name,
                variant_name=item.variant_name,
                sku=item.sku,
                price_cents=item.price_cents,
                quantity=item.quantity,
                currency=item.currency,
            )
            for item in order.items
        ],
        created_at=order.created_at.isoformat(),
    )


@router.patch("/orders/{order_id}/cancel", response_model=OrderResponse, status_code=status.HTTP_200_OK)
def cancel_order(
    order_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderResponse:
    """
    Cancel an order.
    Users can only cancel their own orders, and only if status is not 'out_for_delivery', 'delivered', or 'cancelled'.
    """
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id, Order.user_id == user.id)
        .first()
    )
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    # Check if order can be cancelled (compare with string values since status is stored as string)
    if order.status == OrderStatus.OUT_FOR_DELIVERY.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel order that is out for delivery",
        )
    
    if order.status == OrderStatus.DELIVERED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel order that has been delivered",
        )
    
    if order.status == OrderStatus.CANCELLED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order is already cancelled",
        )
    
    # Update status to cancelled
    order.status = OrderStatus.CANCELLED.value
    db.commit()
    db.refresh(order)
    
    return OrderResponse(
        id=str(order.id),
        order_number=order.order_number,
        status=order.status.value,
        subtotal_cents=order.subtotal_cents,
        tax_cents=order.tax_cents,
        shipping_cents=order.shipping_cents,
        total_cents=order.total_cents,
        currency=order.currency,
        shipping_address=ShippingAddress(
            name=order.shipping_name or "",
            address_line1=order.shipping_address_line1 or "",
            address_line2=order.shipping_address_line2,
            city=order.shipping_city or "",
            state=order.shipping_state or "",
            postal_code=order.shipping_postal_code or "",
            country=order.shipping_country or "",
        ) if order.shipping_name else None,
        items=[
            OrderItemResponse(
                id=str(item.id),
                product_name=item.product_name,
                variant_name=item.variant_name,
                sku=item.sku,
                price_cents=item.price_cents,
                quantity=item.quantity,
                currency=item.currency,
            )
            for item in order.items
        ],
        created_at=order.created_at.isoformat(),
    )
