"""
Payment endpoints for Razorpay integration.
"""
from typing import Optional
import json
import razorpay
import hmac
import hashlib

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.db.models.order import Order, OrderStatus
from app.db.models.user import User
from app.db.session import get_db

router = APIRouter()

# Initialize Razorpay client
razorpay_client = razorpay.Client(
    auth=(settings.razorpay_key_id, settings.razorpay_key_secret)
) if settings.razorpay_key_id and settings.razorpay_key_secret else None


# ==================== Request/Response Models ====================

class RazorpayOrderRequest(BaseModel):
    """Request to create a Razorpay order."""
    amount_cents: int  # Amount in cents
    currency: str = "INR"
    order_id: str  # Our internal order ID (UUID)


class RazorpayOrderResponse(BaseModel):
    """Response containing Razorpay order details."""
    razorpay_order_id: str
    amount: int  # Amount in smallest currency unit (paise for INR)
    currency: str
    key_id: str
    order_id: str  # Our internal order ID


class PaymentVerificationRequest(BaseModel):
    """Request to verify payment signature."""
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    order_id: str  # Our internal order ID


class PaymentVerificationResponse(BaseModel):
    """Response after payment verification."""
    success: bool
    message: str
    order_id: str
    status: str


# ==================== Helper Functions ====================

def verify_payment_signature(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
) -> bool:
    """
    Verify Razorpay payment signature using HMAC SHA256.
    
    Args:
        razorpay_order_id: Razorpay order ID
        razorpay_payment_id: Razorpay payment ID
        razorpay_signature: Signature to verify
        
    Returns:
        True if signature is valid, False otherwise
    """
    if not settings.razorpay_key_secret:
        return False
    
    message = f"{razorpay_order_id}|{razorpay_payment_id}"
    generated_signature = hmac.new(
        settings.razorpay_key_secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(generated_signature, razorpay_signature)


def verify_webhook_signature(payload: str, signature: str) -> bool:
    """
    Verify Razorpay webhook signature.
    
    Args:
        payload: Raw request body as string
        signature: X-Razorpay-Signature header value
        
    Returns:
        True if signature is valid, False otherwise
    """
    if not settings.razorpay_webhook_secret:
        return False
    
    expected_signature = hmac.new(
        settings.razorpay_webhook_secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature)


# ==================== Endpoints ====================

@router.post("/payments/create-razorpay-order", response_model=RazorpayOrderResponse)
def create_razorpay_order(
    request: RazorpayOrderRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a Razorpay order for payment.
    
    This endpoint:
    1. Validates the internal order exists and belongs to the user
    2. Creates a Razorpay order with the specified amount
    3. Links the Razorpay order ID to our internal order
    4. Returns Razorpay order details for frontend integration
    """
    if not razorpay_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service not configured. Please contact support.",
        )
    
    # Validate internal order exists and belongs to user
    order = db.query(Order).filter(
        Order.id == request.order_id,
        Order.user_id == user.id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    # Validate amount matches order total
    if request.amount_cents != order.total_cents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Amount mismatch. Expected {order.total_cents}, got {request.amount_cents}",
        )
    
    # Validate order is in pending state
    if order.status != OrderStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot create payment for order with status: {order.status}",
        )
    
    # Convert cents to smallest currency unit (paise for INR)
    amount = request.amount_cents  # Already in smallest unit for INR
    
    try:
        # Create Razorpay order
        razorpay_order = razorpay_client.order.create({
            "amount": amount,
            "currency": request.currency,
            "receipt": order.order_number,
            "notes": {
                "order_id": str(order.id),
                "order_number": order.order_number,
                "user_id": str(user.id),
            }
        })
        
        # Store Razorpay order ID in our database
        order.razorpay_order_id = razorpay_order["id"]
        order.payment_method = "razorpay"
        db.commit()
        
        return RazorpayOrderResponse(
            razorpay_order_id=razorpay_order["id"],
            amount=amount,
            currency=request.currency,
            key_id=settings.razorpay_key_id,
            order_id=str(order.id),
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Razorpay order: {str(e)}",
        ) from e


@router.post("/payments/verify", response_model=PaymentVerificationResponse)
def verify_payment(
    request: PaymentVerificationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Verify Razorpay payment signature and update order status.
    
    This endpoint:
    1. Verifies the payment signature is valid
    2. Validates the order belongs to the user
    3. Updates order status to 'confirmed'
    4. Stores payment details in the order
    """
    # Verify payment signature
    if not verify_payment_signature(
        request.razorpay_order_id,
        request.razorpay_payment_id,
        request.razorpay_signature,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment signature",
        )
    
    # Get order
    order = db.query(Order).filter(
        Order.id == request.order_id,
        Order.user_id == user.id,
        Order.razorpay_order_id == request.razorpay_order_id,
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found or mismatch",
        )
    
    # Update order with payment details
    order.razorpay_payment_id = request.razorpay_payment_id
    order.razorpay_signature = request.razorpay_signature
    order.status = OrderStatus.CONFIRMED.value
    db.commit()
    db.refresh(order)
    
    return PaymentVerificationResponse(
        success=True,
        message="Payment verified and order confirmed",
        order_id=str(order.id),
        status=order.status,
    )


@router.post("/payments/webhook")
async def razorpay_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Handle Razorpay webhook events.
    
    This endpoint processes webhook events from Razorpay:
    - payment.authorized: Payment authorized, update order to confirmed
    - payment.captured: Payment captured (for manual capture)
    - payment.failed: Payment failed, update order status
    - order.paid: Order fully paid
    
    Note: Webhook signature verification is required for production.
    """
    try:
        # Get raw request body
        body = await request.body()
        body_str = body.decode("utf-8")
        
        # Get signature from headers
        signature = request.headers.get("X-Razorpay-Signature", "")
        
        # Verify webhook signature (important for security)
        if settings.razorpay_webhook_secret and not verify_webhook_signature(body_str, signature):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature",
            )
        
        # Parse webhook payload
        payload = json.loads(body_str)
        event = payload.get("event")
        payment = payload.get("payload", {}).get("payment", {})
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        
        razorpay_order_id = entity.get("order_id") or payment.get("order_id")
        razorpay_payment_id = entity.get("id") or payment.get("id")
        
        if not razorpay_order_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing order_id in webhook payload",
            )
        
        # Find order by Razorpay order ID
        order = db.query(Order).filter(
            Order.razorpay_order_id == razorpay_order_id
        ).first()
        
        if not order:
            # Order not found - log but don't fail (might be test webhook)
            print(f"Webhook received for unknown order: {razorpay_order_id}")
            return {"status": "ok", "message": "Order not found"}
        
        # Handle different webhook events
        if event == "payment.authorized":
            order.status = OrderStatus.CONFIRMED.value
            order.razorpay_payment_id = razorpay_payment_id
            db.commit()
            
        elif event == "payment.captured":
            order.status = OrderStatus.CONFIRMED.value
            order.razorpay_payment_id = razorpay_payment_id
            db.commit()
            
        elif event == "payment.failed":
            # Keep order as pending for retry
            # Optionally mark for manual review
            db.commit()
            
        elif event == "order.paid":
            order.status = OrderStatus.CONFIRMED.value
            if razorpay_payment_id:
                order.razorpay_payment_id = razorpay_payment_id
            db.commit()
        
        return {"status": "ok"}
        
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing failed: {str(e)}",
        ) from e
