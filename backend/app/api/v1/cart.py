"""
Cart management API endpoints.

Supports:
- Adding items to cart
- Updating item quantities
- Removing items from cart
- Getting cart with items
- Clearing entire cart
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_user
from app.db.models.cart import Cart, CartItem
from app.db.models.product import Inventory, ProductVariant
from app.db.models.user import User
from app.db.session import get_db

router = APIRouter()


# ==================== Request/Response Models ====================

class CartItemAdd(BaseModel):
    """Request model for adding/updating cart item"""
    variant_id: str = Field(..., description="Product variant UUID")
    quantity: int = Field(..., gt=0, le=100, description="Quantity (1-100)")


class CartItemResponse(BaseModel):
    """Response model for cart item"""
    id: str
    variant_id: str
    product_id: str
    product_name: str
    variant_name: str
    sku: str
    price_cents: int
    currency: str
    quantity: int
    stock_available: int

    class Config:
        orm_mode = True


class CartResponse(BaseModel):
    """Response model for cart with items"""
    id: str
    item_count: int
    total_cents: int
    currency: str
    items: List[CartItemResponse]


# ==================== Helper Functions ====================

def get_or_create_cart(user: User, db: Session) -> Cart:
    """
    Get existing cart for user or create a new one.
    
    Returns:
        Cart: User's cart
    """
    cart = db.query(Cart).filter(Cart.user_id == user.id).first()
    if not cart:
        cart = Cart(user_id=user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


from typing import Tuple

def validate_stock(variant_id: str, quantity: int, db: Session) -> Tuple[ProductVariant, Inventory]:
    """
    Validate that variant exists and has sufficient stock.
    
    Args:
        variant_id: Product variant UUID
        quantity: Desired quantity
        
    Returns:
        Tuple of (ProductVariant, Inventory)
        
    Raises:
        HTTPException: If variant not found, inactive, or insufficient stock
    """
    variant = (
        db.query(ProductVariant)
        .filter(ProductVariant.id == variant_id, ProductVariant.is_active.is_(True))
        .first()
    )
    
    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product variant not found or inactive",
        )
    
    # Check product is active
    if not variant.product.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product is not available",
        )
    
    # Get inventory
    inventory = db.query(Inventory).filter(Inventory.variant_id == variant_id).first()
    if not inventory:
        inventory = Inventory(variant_id=variant_id, stock_on_hand=0)
        db.add(inventory)
        db.flush()
    
    # Check available stock (on hand - reserved)
    available_stock = inventory.stock_on_hand - inventory.stock_reserved
    
    if available_stock < quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock. Available: {available_stock}, Requested: {quantity}",
        )
    
    return variant, inventory


def calculate_cart_total(cart: Cart, db: Session) -> tuple[int, int]:
    """
    Calculate cart total and item count.
    
    Returns:
        Tuple of (total_cents, item_count)
    """
    total = 0
    count = 0
    
    for item in cart.items:
        # Use variant price if available, otherwise product price
        price = item.variant.price_cents if item.variant.price_cents else item.variant.product.price_cents
        total += price * item.quantity
        count += item.quantity
    
    return total, count


# ==================== API Endpoints ====================

@router.get("/cart", response_model=CartResponse, status_code=status.HTTP_200_OK)
def get_cart(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartResponse:
    """
    Get current user's cart with all items.
    
    Returns empty cart if user has no cart yet.
    """
    cart = get_or_create_cart(user, db)
    
    # Load items with related data
    cart = (
        db.query(Cart)
        .options(
            joinedload(Cart.items).joinedload(CartItem.variant).joinedload(ProductVariant.product),
            joinedload(Cart.items).joinedload(CartItem.variant).joinedload(ProductVariant.inventory),
        )
        .filter(Cart.id == cart.id)
        .first()
    )
    
    total_cents, item_count = calculate_cart_total(cart, db)
    
    items = []
    for item in cart.items:
        variant = item.variant
        inventory = variant.inventory if variant.inventory else Inventory(variant_id=variant.id, stock_on_hand=0)
        available_stock = inventory.stock_on_hand - inventory.stock_reserved
        
        items.append(
            CartItemResponse(
                id=str(item.id),
                variant_id=str(variant.id),
                product_id=str(variant.product.id),
                product_name=variant.product.name,
                variant_name=variant.name,
                sku=variant.sku,
                price_cents=variant.price_cents if variant.price_cents else variant.product.price_cents,
                currency=variant.product.currency,
                quantity=item.quantity,
                stock_available=available_stock,
            )
        )
    
    return CartResponse(
        id=str(cart.id),
        item_count=item_count,
        total_cents=total_cents,
        currency=items[0].currency if items else "INR",
        items=items,
    )


@router.post("/cart/items", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
def add_cart_item(
    item: CartItemAdd,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartItemResponse:
    """
    Add item to cart or update quantity if item already exists.
    
    Validates stock availability before adding.
    """
    # Validate stock
    variant, inventory = validate_stock(item.variant_id, item.quantity, db)
    
    # Get or create cart
    cart = get_or_create_cart(user, db)
    
    # Check if item already exists in cart
    existing_item = (
        db.query(CartItem)
        .filter(CartItem.cart_id == cart.id, CartItem.variant_id == item.variant_id)
        .first()
    )
    
    if existing_item:
        # Update quantity - validate total quantity
        new_quantity = existing_item.quantity + item.quantity
        available_stock = inventory.stock_on_hand - inventory.stock_reserved
        
        if available_stock < new_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock. Available: {available_stock}, Requested total: {new_quantity}",
            )
        
        existing_item.quantity = new_quantity
        db.commit()
        db.refresh(existing_item)
        cart_item = existing_item
    else:
        # Create new cart item
        cart_item = CartItem(
            cart_id=cart.id,
            variant_id=item.variant_id,
            quantity=item.quantity,
        )
        db.add(cart_item)
        
        try:
            db.commit()
            db.refresh(cart_item)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item already exists in cart",
            )
    
    # Refresh variant data
    db.refresh(variant)
    variant = (
        db.query(ProductVariant)
        .options(
            joinedload(ProductVariant.product),
            joinedload(ProductVariant.inventory),
        )
        .filter(ProductVariant.id == variant.id)
        .first()
    )
    
    inventory = variant.inventory if variant.inventory else Inventory(variant_id=variant.id, stock_on_hand=0)
    available_stock = inventory.stock_on_hand - inventory.stock_reserved
    
    return CartItemResponse(
        id=str(cart_item.id),
        variant_id=str(variant.id),
        product_id=str(variant.product.id),
        product_name=variant.product.name,
        variant_name=variant.name,
        sku=variant.sku,
        price_cents=variant.price_cents if variant.price_cents else variant.product.price_cents,
        currency=variant.product.currency,
        quantity=cart_item.quantity,
        stock_available=available_stock,
    )


class CartItemUpdate(BaseModel):
    """Request model for updating cart item quantity"""
    quantity: int = Field(..., gt=0, le=100, description="Quantity (1-100)")


@router.put("/cart/items/{item_id}", response_model=CartItemResponse, status_code=status.HTTP_200_OK)
def update_cart_item(
    item_id: str,
    update: CartItemUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartItemResponse:
    """
    Update quantity of a cart item.
    
    Args:
        item_id: Cart item UUID
        quantity: New quantity (must be > 0)
    """
    cart = get_or_create_cart(user, db)
    
    cart_item = (
        db.query(CartItem)
        .filter(CartItem.id == item_id, CartItem.cart_id == cart.id)
        .first()
    )
    
    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found",
        )
    
    # Validate stock for new quantity
    variant, inventory = validate_stock(str(cart_item.variant_id), update.quantity, db)
    
    cart_item.quantity = update.quantity
    db.commit()
    db.refresh(cart_item)
    
    # Refresh variant data
    variant = (
        db.query(ProductVariant)
        .options(
            joinedload(ProductVariant.product),
            joinedload(ProductVariant.inventory),
        )
        .filter(ProductVariant.id == variant.id)
        .first()
    )
    
    inventory = variant.inventory if variant.inventory else Inventory(variant_id=variant.id, stock_on_hand=0)
    available_stock = inventory.stock_on_hand - inventory.stock_reserved
    
    return CartItemResponse(
        id=str(cart_item.id),
        variant_id=str(variant.id),
        product_id=str(variant.product.id),
        product_name=variant.product.name,
        variant_name=variant.name,
        sku=variant.sku,
        price_cents=variant.price_cents if variant.price_cents else variant.product.price_cents,
        currency=variant.product.currency,
        quantity=cart_item.quantity,
        stock_available=available_stock,
    )


@router.delete("/cart/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_cart_item(
    item_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Remove item from cart.
    """
    cart = get_or_create_cart(user, db)
    
    cart_item = (
        db.query(CartItem)
        .filter(CartItem.id == item_id, CartItem.cart_id == cart.id)
        .first()
    )
    
    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found",
        )
    
    db.delete(cart_item)
    db.commit()


@router.delete("/cart", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Clear all items from cart.
    """
    cart = get_or_create_cart(user, db)
    
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()
