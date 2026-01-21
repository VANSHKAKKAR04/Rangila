# Razorpay Payment Integration

## Payment Flow Diagram

```
┌─────────────┐
│   Customer  │
│  Checkout   │
└──────┬──────┘
       │
       │ 1. Fill Shipping Address
       │ 2. Select Payment Method
       │ 3. Click "Pay Now"
       ▼
┌─────────────────────────────────────┐
│  Frontend (Checkout Page)           │
│  - Validates form                   │
│  - Creates order via API            │
└──────┬──────────────────────────────┘
       │
       │ POST /api/v1/orders
       │ (Create order, status: pending)
       ▼
┌─────────────────────────────────────┐
│  Backend: Create Order              │
│  - Validates cart                   │
│  - Reserves stock                   │
│  - Creates order record             │
│  - Returns order_id                 │
└──────┬──────────────────────────────┘
       │
       │ If Razorpay selected:
       │ POST /api/v1/payments/create-razorpay-order
       ▼
┌─────────────────────────────────────┐
│  Backend: Create Razorpay Order     │
│  - Creates Razorpay order           │
│  - Links to our order_id            │
│  - Returns razorpay_order_id & key  │
└──────┬──────────────────────────────┘
       │
       │ Opens Razorpay Checkout
       ▼
┌─────────────────────────────────────┐
│  Razorpay Checkout Modal            │
│  - User selects payment method      │
│  - Enters payment details           │
│  - Completes payment                │
└──────┬──────────────────────────────┘
       │
       │ Payment Success/Callback
       │ POST /api/v1/payments/verify
       ▼
┌─────────────────────────────────────┐
│  Backend: Verify Payment            │
│  - Verifies signature (HMAC SHA256) │
│  - Updates order status             │
│  - Stores payment details           │
└──────┬──────────────────────────────┘
       │
       │ Order Status: confirmed
       │ Redirect to success page
       ▼
┌─────────────────────────────────────┐
│  Success Page                       │
│  - Order confirmed                  │
│  - Cart cleared                     │
└─────────────────────────────────────┘

Alternative Flow (Webhook):
       │
       │ Razorpay sends webhook
       │ POST /api/v1/payments/webhook
       ▼
┌─────────────────────────────────────┐
│  Backend: Webhook Handler           │
│  - Verifies webhook signature       │
│  - Updates order status             │
│  - Handles payment events           │
└─────────────────────────────────────┘
```

## Security Checks

### 1. Payment Signature Verification
- **Location**: `verify_payment_signature()` in `payments.py`
- **Method**: HMAC SHA256
- **Formula**: `HMAC-SHA256(key_secret, razorpay_order_id|razorpay_payment_id)`
- **Purpose**: Ensures payment data integrity and authenticity

### 2. Webhook Signature Verification
- **Location**: `verify_webhook_signature()` in `payments.py`
- **Method**: HMAC SHA256
- **Formula**: `HMAC-SHA256(webhook_secret, raw_request_body)`
- **Header**: `X-Razorpay-Signature`
- **Purpose**: Prevents unauthorized webhook requests

### 3. Order Validation
- Order must belong to the authenticated user
- Order amount must match Razorpay order amount
- Order status must be "pending" before payment
- Order can only be paid once

### 4. Transaction Safety
- Orders are created in transactions
- Stock is reserved atomically
- Payment verification happens before order confirmation
- Failed payments don't confirm orders

## Setup Instructions

### Backend Configuration

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Add to `.env` file**:
   ```env
   RAZORPAY_KEY_ID=your_key_id_here
   RAZORPAY_KEY_SECRET=your_key_secret_here
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
   ```

3. **Update Database**:
   Run the migration script to add Razorpay fields to orders table:
   ```bash
   python fix_order_status_column.py  # If not already run
   # Then run init_db.py or create a migration for new fields
   ```

### Frontend Configuration

1. **No additional dependencies** - Razorpay SDK is loaded via script tag

2. **Environment Variables** (optional, for production):
   - Razorpay key is provided by backend API response
   - No frontend configuration needed

## API Endpoints

### 1. Create Razorpay Order
```
POST /api/v1/payments/create-razorpay-order
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "order_id": "uuid-of-our-order",
  "amount_cents": 10000,
  "currency": "INR"
}

Response:
{
  "razorpay_order_id": "order_xxx",
  "amount": 10000,
  "currency": "INR",
  "key_id": "rzp_test_xxx",
  "order_id": "uuid-of-our-order"
}
```

### 2. Verify Payment
```
POST /api/v1/payments/verify
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx",
  "order_id": "uuid-of-our-order"
}

Response:
{
  "success": true,
  "message": "Payment verified and order confirmed",
  "order_id": "uuid-of-our-order",
  "status": "confirmed"
}
```

### 3. Webhook Handler
```
POST /api/v1/payments/webhook
X-Razorpay-Signature: <signature>

Request Body:
{
  "event": "payment.authorized",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_xxx",
        "order_id": "order_xxx",
        ...
      }
    }
  }
}

Response:
{
  "status": "ok"
}
```

## Database Schema Updates

### Orders Table
Added fields:
- `razorpay_order_id` (String, unique, indexed)
- `razorpay_payment_id` (String, indexed)
- `razorpay_signature` (String)
- `payment_method` (String, default: "razorpay")

## Payment Flow Details

### Successful Payment Flow
1. User fills checkout form
2. Frontend creates order (status: pending)
3. Frontend creates Razorpay order
4. Razorpay checkout modal opens
5. User completes payment
6. Frontend verifies payment signature
7. Backend updates order status to "confirmed"
8. User redirected to success page

### Failed Payment Flow
1. User initiates payment
2. Razorpay checkout modal opens
3. Payment fails (insufficient funds, card declined, etc.)
4. Error shown to user
5. Order remains in "pending" status
6. User can retry payment

### Webhook Flow (Backup)
1. Razorpay sends webhook on payment events
2. Backend verifies webhook signature
3. Backend updates order status based on event
4. Events handled:
   - `payment.authorized` → status: confirmed
   - `payment.captured` → status: confirmed
   - `payment.failed` → status: pending (for retry)
   - `order.paid` → status: confirmed

## Testing

### Test Mode
- Use Razorpay test keys from dashboard
- Test cards: https://razorpay.com/docs/payments/test-cards/
- Test UPI IDs: success@razorpay, failure@razorpay

### Test Scenarios
1. **Successful Payment**: Use test card `4111 1111 1111 1111`
2. **Payment Failure**: Use declined card `5104 0600 0000 0008`
3. **Payment Cancellation**: Close modal without paying
4. **Network Error**: Simulate network failure during verification
5. **Invalid Signature**: Test with tampered signature (should fail)

## Error Handling

### Frontend Errors
- **Razorpay SDK not loaded**: Retry loading script
- **Payment cancelled**: Show message, allow retry
- **Payment failed**: Show error, keep order in pending
- **Verification failed**: Show error, allow retry

### Backend Errors
- **Invalid signature**: Return 400 with error message
- **Order not found**: Return 404
- **Amount mismatch**: Return 400
- **Order already paid**: Return 400
- **Webhook verification failed**: Return 401

## Production Checklist

- [ ] Use production Razorpay keys
- [ ] Set up webhook URL in Razorpay dashboard
- [ ] Configure webhook secret
- [ ] Enable webhook signature verification
- [ ] Set up HTTPS (required for webhooks)
- [ ] Test all payment methods (cards, UPI, wallets)
- [ ] Implement retry mechanism for failed payments
- [ ] Set up monitoring/alerting for payment failures
- [ ] Review and test error handling
- [ ] Implement rate limiting on payment endpoints
- [ ] Set up proper logging for payment events

## Support

For issues or questions:
- Razorpay Documentation: https://razorpay.com/docs/
- Razorpay Support: support@razorpay.com
- Check logs: Payment events are logged in backend
