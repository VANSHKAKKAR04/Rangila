"""
Admin API endpoints for order management.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_admin_user
from app.db.models.order import Order, OrderItem, OrderStatus
from app.db.models.user import User
from app.db.session import get_db

router = APIRouter()


# ==================== Request/Response Models ====================

class OrderItemResponse(BaseModel):
    id: str
    product_name: str
    variant_name: Optional[str]
    sku: str
    price_cents: int
    quantity: int
    currency: str

    class Config:
        orm_mode = True


class ShippingAddressResponse(BaseModel):
    name: str
    address_line1: str
    address_line2: Optional[str]
    city: str
    state: str
    postal_code: str
    country: str


class OrderResponse(BaseModel):
    id: str
    order_number: str
    status: str
    user_id: str
    user_email: str
    user_name: Optional[str]
    subtotal_cents: int
    tax_cents: int
    shipping_cents: int
    total_cents: int
    currency: str
    shipping_address: Optional[ShippingAddressResponse]
    items: List[OrderItemResponse]
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True


class OrderStatusUpdate(BaseModel):
    status: str


class OrderListResponse(BaseModel):
    items: List[OrderResponse]
    total: int


# ==================== Order Endpoints ====================

@router.get("/orders", response_model=OrderListResponse)
def list_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
) -> OrderListResponse:
    """List all orders (admin view)."""
    query = db.query(Order)
    
    if status:
        try:
            order_status = OrderStatus(status.lower())
            query = query.filter(Order.status == order_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status}",
            )
    
    total = query.count()
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    
    items = []
    for order in orders:
        shipping_address = None
        if order.shipping_name:
            shipping_address = ShippingAddressResponse(
                name=order.shipping_name or "",
                address_line1=order.shipping_address_line1 or "",
                address_line2=order.shipping_address_line2,
                city=order.shipping_city or "",
                state=order.shipping_state or "",
                postal_code=order.shipping_postal_code or "",
                country=order.shipping_country or "",
            )
        
        items.append(
            OrderResponse(
                id=str(order.id),
                order_number=order.order_number,
                status=order.status,  # Status is stored as string
                user_id=str(order.user_id),
                user_email=order.user.email if order.user else "N/A",
                user_name=order.user.full_name if order.user else None,
                subtotal_cents=order.subtotal_cents,
                tax_cents=order.tax_cents,
                shipping_cents=order.shipping_cents,
                total_cents=order.total_cents,
                currency=order.currency,
                shipping_address=shipping_address,
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
                updated_at=order.updated_at.isoformat(),
            )
        )
    
    return OrderListResponse(items=items, total=total)


@router.get("/orders/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
) -> OrderResponse:
    """Get order details."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    shipping_address = None
    if order.shipping_name:
        shipping_address = ShippingAddressResponse(
            name=order.shipping_name or "",
            address_line1=order.shipping_address_line1 or "",
            address_line2=order.shipping_address_line2,
            city=order.shipping_city or "",
            state=order.shipping_state or "",
            postal_code=order.shipping_postal_code or "",
            country=order.shipping_country or "",
        )
    
    return OrderResponse(
        id=str(order.id),
        order_number=order.order_number,
        status=order.status,  # Status is stored as string
        user_id=str(order.user_id),
        user_email=order.user.email if order.user else "N/A",
        user_name=order.user.full_name if order.user else None,
        subtotal_cents=order.subtotal_cents,
        tax_cents=order.tax_cents,
        shipping_cents=order.shipping_cents,
        total_cents=order.total_cents,
        currency=order.currency,
        shipping_address=shipping_address,
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
        updated_at=order.updated_at.isoformat(),
    )


@router.patch("/orders/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: str,
    status_update: OrderStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
) -> OrderResponse:
    """Update order status."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    try:
        status_value = status_update.status.lower().strip()
        # Handle both old "shipped" and new "out_for_delivery"
        if status_value == "shipped":
            status_value = "out_for_delivery"
        new_status = OrderStatus(status_value)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {status_update.status}. Valid statuses: {[s.value for s in OrderStatus]}",
        ) from e
    
    order.status = new_status.value  # Store the enum value (string), not the enum object
    db.commit()
    db.refresh(order)
    
    shipping_address = None
    if order.shipping_name:
        shipping_address = ShippingAddressResponse(
            name=order.shipping_name or "",
            address_line1=order.shipping_address_line1 or "",
            address_line2=order.shipping_address_line2,
            city=order.shipping_city or "",
            state=order.shipping_state or "",
            postal_code=order.shipping_postal_code or "",
            country=order.shipping_country or "",
        )
    
    return OrderResponse(
        id=str(order.id),
        order_number=order.order_number,
        status=order.status,  # Status is stored as string
        user_id=str(order.user_id),
        user_email=order.user.email if order.user else "N/A",
        user_name=order.user.full_name if order.user else None,
        subtotal_cents=order.subtotal_cents,
        tax_cents=order.tax_cents,
        shipping_cents=order.shipping_cents,
        total_cents=order.total_cents,
        currency=order.currency,
        shipping_address=shipping_address,
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
        updated_at=order.updated_at.isoformat(),
    )
