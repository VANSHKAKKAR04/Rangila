# Razorpay Payment Integration Setup Guide

This guide will help you set up Razorpay payments for local testing.

## Step 1: Get Razorpay Test Credentials

1. **Sign up for Razorpay Account** (if you don't have one):
   - Go to https://razorpay.com/
   - Click "Sign Up" and create an account
   - Complete the basic account setup

2. **Access Test Mode**:
   - Log in to your Razorpay Dashboard
   - Go to Settings → API Keys
   - Make sure you're in **Test Mode** (toggle in top right)
   - You'll see:
     - **Key ID** (starts with `rzp_test_...`)
     - **Key Secret** (starts with `rzp_test_...`)

3. **Copy Your Test Credentials**:
   ```
   Key ID: rzp_test_xxxxxxxxxxxxx
   Key Secret: rzp_test_xxxxxxxxxxxxx
   ```

## Step 2: Install Razorpay Python Package

Make sure the `razorpay` package is installed:

```powershell
cd backend
pip install razorpay
```

Or if using requirements.txt:
```powershell
pip install -r requirements.txt
```

## Step 3: Configure Environment Variables

Add your Razorpay credentials to your `.env` file in the `backend` directory:

```env
# Razorpay Configuration (Test Mode)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=rzp_test_xxxxxxxxxxxxx

# Optional: Webhook Secret (for production webhooks)
# RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

**Important**: 
- Replace `rzp_test_xxxxxxxxxxxxx` with your actual test credentials
- Never commit your `.env` file to git (it's already in `.gitignore`)
- Use test credentials for local development

## Step 4: Restart Backend Server

After adding the credentials, restart your backend server:

```powershell
# Stop the current server (Ctrl+C)
# Then restart:
uvicorn app.main:app --reload
```

## Step 5: Test Payment Flow

1. **Add items to cart** and proceed to checkout
2. **Select "Pay Online (Razorpay)"** as payment method
3. **Fill in shipping address** and click "Pay with Razorpay"
4. **Razorpay Test Card**:
   - Card Number: `4111 1111 1111 1111`
   - CVV: `123`
   - Expiry: Any future date (e.g., `12/25`)
   - Name: Any name

## Test Cards for Different Scenarios

Razorpay provides test cards for different scenarios:

### Successful Payment:
- Card: `4111 1111 1111 1111`
- CVV: `123`
- Expiry: Any future date

### Payment Failure:
- Card: `4000 0000 0000 0002`
- CVV: `123`
- Expiry: Any future date

### 3D Secure (OTP):
- Card: `4012 0010 3714 1112`
- CVV: `123`
- Expiry: Any future date
- OTP: `1234` (when prompted)

## Troubleshooting

### Error: "Payment service not configured"
- Check that `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set in `.env`
- Restart the backend server after adding credentials
- Verify credentials are correct (no extra spaces)

### Error: "Invalid API key"
- Make sure you're using **Test Mode** credentials
- Check that credentials are copied correctly (no typos)
- Verify you're using the correct Key ID and Key Secret

### Payment Not Processing
- Check browser console for errors
- Verify Razorpay SDK is loaded (check Network tab)
- Check backend logs for detailed error messages

## Production Setup

When deploying to production:

1. **Switch to Live Mode** in Razorpay Dashboard
2. **Get Live Credentials** (starts with `rzp_live_...`)
3. **Set up Webhook Secret** for webhook verification
4. **Update `.env`** with production credentials
5. **Never use test credentials in production**

## Additional Resources

- Razorpay Test Cards: https://razorpay.com/docs/payments/test-cards/
- Razorpay API Docs: https://razorpay.com/docs/api/
- Razorpay Dashboard: https://dashboard.razorpay.com/
