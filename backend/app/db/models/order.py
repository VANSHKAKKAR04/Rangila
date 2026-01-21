import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import (
    Column,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class OrderStatus(str, Enum):
    """Order lifecycle statuses"""
    PENDING = "pending"  # Created, awaiting payment/confirmation
    CONFIRMED = "confirmed"  # Payment confirmed, order processing
    PROCESSING = "processing"  # Being prepared
    OUT_FOR_DELIVERY = "out_for_delivery"  # Out for delivery
    DELIVERED = "delivered"  # Successfully delivered
    CANCELLED = "cancelled"  # Cancelled by user or system
    REFUNDED = "refunded"  # Order refunded


class Order(Base):
    """
    Customer order created from cart.
    Orders are immutable once created - changes create new orders.
    """
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        index=True,
    )
    order_number = Column(String, unique=True, nullable=False, index=True)
    status = Column(
        String(20),  # Increased length to accommodate "out_for_delivery" (16 chars)
        default=OrderStatus.PENDING.value,
        nullable=False,
        index=True,
    )
    
    # Pricing (stored at time of order)
    subtotal_cents = Column(Integer, nullable=False)  # Sum of items before tax
    tax_cents = Column(Integer, nullable=False, default=0)
    shipping_cents = Column(Integer, nullable=False, default=0)
    total_cents = Column(Integer, nullable=False)  # Final total
    currency = Column(String(3), nullable=False, default="INR")
    
    # Shipping information
    shipping_name = Column(String, nullable=True)
    shipping_address_line1 = Column(String, nullable=True)
    shipping_address_line2 = Column(String, nullable=True)
    shipping_city = Column(String, nullable=True)
    shipping_state = Column(String, nullable=True)
    shipping_postal_code = Column(String, nullable=True)
    shipping_country = Column(String, nullable=True)
    
    # Razorpay payment information
    razorpay_order_id = Column(String, nullable=True, unique=True, index=True)
    razorpay_payment_id = Column(String, nullable=True, index=True)
    razorpay_signature = Column(String, nullable=True)
    payment_method = Column(String, default="cod", nullable=False)  # razorpay, cod, etc.
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    user = relationship("User", back_populates="orders")
    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="OrderItem.created_at",
    )


class OrderItem(Base):
    """
    Individual item in an order.
    Stores product details at time of order (snapshot for historical accuracy).
    """
    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    variant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="SET NULL"),
        nullable=True,  # Nullable in case product is deleted
    )
    
    # Snapshot data (preserves order details even if product changes)
    product_name = Column(String, nullable=False)
    variant_name = Column(String, nullable=True)
    sku = Column(String, nullable=False)
    price_cents = Column(Integer, nullable=False)  # Price at time of order
    quantity = Column(Integer, nullable=False)
    currency = Column(String(3), nullable=False, default="INR")
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    order = relationship("Order", back_populates="items")
    variant = relationship("ProductVariant", lazy="joined")
