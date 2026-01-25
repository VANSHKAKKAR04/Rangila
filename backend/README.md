# Rangila Backend API

FastAPI backend for the Rangila Store application.

## Setup

1. **Create and activate a virtual environment** (recommended):
   ```powershell
   # From the backend directory
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

2. **Install dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

3. **Set up PostgreSQL database**:
   - Install PostgreSQL if not already installed
   - Create a database named `rangila`:
     ```sql
     CREATE DATABASE rangila;
     ```
   - Create a user (or use existing postgres user):
     ```sql
     CREATE USER your_user WITH PASSWORD 'your_password';
     GRANT ALL PRIVILEGES ON DATABASE rangila TO your_user;
     ```

4. **Set up environment variables**:
   
   **Option A - Interactive setup (Recommended):**
   ```powershell
   python setup_env.py
   ```
   This will guide you through creating the `.env` file with the correct credentials.
   
   **Option B - Manual setup:**
   Create a `.env` file in the `backend` directory with:
   ```
   DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/rangila
   SECRET_KEY=your-secret-key-here-change-this-in-production
   ```
   
   **Important**: 
   - Replace `YOUR_PASSWORD` with your actual PostgreSQL password for the `postgres` user
   - If you're using a different user, replace `postgres` with that username
   - The secret key should be a random string (you can generate one using `python -c "import secrets; print(secrets.token_urlsafe(32))"`)

5. **Initialize database tables**:
   ```powershell
   # This will create all required tables in your database
   python init_db.py
   ```
   
   You should see output like:
   ```
   Creating database tables...
   ✅ Database tables created successfully!
   
   Created tables:
     - users
     - roles
     - user_roles
     - categories
     - products
     - product_variants
     - inventory
     - carts
     - cart_items
     - orders
     - order_items
   ```

6. **Run the development server**:
   ```powershell
   # From the backend directory (not backend/app)
   uvicorn app.main:app --reload
   ```
   
   Or using Python module syntax:
   ```powershell
   python -m uvicorn app.main:app --reload
   ```

## API Endpoints

- Health check: `GET /health`
- API docs: `GET /docs` (Swagger UI)
- Alternative docs: `GET /redoc` (ReDoc)

## Project Structure

- `app/main.py` - FastAPI application entry point
- `app/api/v1/` - API route handlers
- `app/core/` - Core configuration and security utilities
- `app/db/` - Database models and session management
