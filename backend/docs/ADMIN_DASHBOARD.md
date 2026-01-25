# Admin Dashboard Documentation

This document describes the admin dashboard implementation for the Rangila Store, including API endpoints, authorization rules, and frontend structure.

## Overview

The admin dashboard provides comprehensive management capabilities for:
- **Product CRUD**: Create, read, update, and delete products and variants
- **Inventory Management**: Monitor and update stock levels
- **Order Management**: View all orders and update order status
- **User Management**: View and manage user accounts and roles

## 1. Authorization

### Admin Role Requirement

All admin endpoints require the user to have the `"admin"` role. The authorization is handled by the `get_admin_user` dependency in `backend/app/core/dependencies.py`.

### How It Works

1. **JWT Token**: User authentication is verified via JWT token
2. **Role Check**: The token payload contains a `roles` array that is checked for `"admin"` role
3. **Access Denied**: If user doesn't have admin role, a `403 Forbidden` response is returned

### Setting Up an Admin User

To create an admin user, you need to:

1. Create a user account (via signup or directly in database)
2. Create an "admin" role if it doesn't exist:
   ```sql
   INSERT INTO roles (id, name, description) 
   VALUES (gen_random_uuid(), 'admin', 'Administrator role');
   ```
3. Assign the admin role to the user:
   ```sql
   INSERT INTO user_roles (user_id, role_id)
   SELECT u.id, r.id
   FROM users u, roles r
   WHERE u.email = 'admin@example.com' AND r.name = 'admin';
   ```

Alternatively, you can use the admin API to add roles (once you have one admin user).

## 2. Backend API Endpoints

All admin endpoints are prefixed with `/api/v1/admin/` and require authentication.

### Products Management

#### List All Products
```
GET /api/v1/admin/products?skip=0&limit=100
```
Returns all products with their variants and inventory information.

#### Get Product
```
GET /api/v1/admin/products/{product_id}
```
Returns detailed product information.

#### Create Product
```
POST /api/v1/admin/products
Content-Type: application/json

{
  "name": "Product Name",
  "slug": "product-slug",
  "description": "Product description",
  "price_cents": 9999,
  "currency": "INR",
  "category_id": "uuid",
  "sku": "SKU-001",
  "is_active": true,
  "main_image_url": "https://..."
}
```

#### Update Product
```
PUT /api/v1/admin/products/{product_id}
Content-Type: application/json

{
  "name": "Updated Name",
  "is_active": false,
  // ... other optional fields
}
```

#### Delete Product (Soft Delete)
```
DELETE /api/v1/admin/products/{product_id}
```
Sets `is_active` to `false`.

#### Create Product Variant
```
POST /api/v1/admin/products/{product_id}/variants
Content-Type: application/json

{
  "name": "Variant Name",
  "sku": "VARIANT-SKU-001",
  "price_cents": 8999,
  "is_active": true
}
```

#### Update Variant
```
PUT /api/v1/admin/variants/{variant_id}
```

#### Delete Variant (Soft Delete)
```
DELETE /api/v1/admin/variants/{variant_id}
```

### Inventory Management

#### List All Inventory
```
GET /api/v1/admin/inventory?skip=0&limit=100
```
Returns inventory records for all active variants.

#### Get Inventory for Variant
```
GET /api/v1/admin/inventory/{variant_id}
```

#### Update Stock Level
```
PUT /api/v1/admin/inventory/{variant_id}
Content-Type: application/json

{
  "stock_on_hand": 100
}
```
**Validation**: New stock_on_hand cannot be less than current stock_reserved.

### Order Management

#### List All Orders
```
GET /api/v1/admin/orders?skip=0&limit=20&status=pending
```
Optional query parameter: `status` (pending, confirmed, processing, shipped, delivered, cancelled, refunded)

#### Get Order Details
```
GET /api/v1/admin/orders/{order_id}
```

#### Update Order Status
```
PATCH /api/v1/admin/orders/{order_id}/status
Content-Type: application/json

{
  "status": "shipped"
}
```
Valid statuses: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`

### User Management

#### List All Users
```
GET /api/v1/admin/users?skip=0&limit=20&is_active=true
```
Optional query parameter: `is_active` (boolean)

#### Get User Details
```
GET /api/v1/admin/users/{user_id}
```

#### Update User
```
PUT /api/v1/admin/users/{user_id}
Content-Type: application/json

{
  "email": "newemail@example.com",
  "full_name": "Full Name",
  "is_active": true,
  "password": "newpassword"  // Optional
}
```
**Protection**: Admins cannot deactivate themselves.

#### Add Role to User
```
POST /api/v1/admin/users/{user_id}/roles/{role_name}
```

#### Remove Role from User
```
DELETE /api/v1/admin/users/{user_id}/roles/{role_name}
```
**Protection**: Admins cannot remove their own admin role.

#### List All Roles
```
GET /api/v1/admin/roles
```

## 3. Frontend Structure

### Admin Routes

All admin pages are under `/admin`:
- `/admin` - Dashboard overview
- `/admin/products` - Product management
- `/admin/inventory` - Inventory management
- `/admin/orders` - Order management
- `/admin/users` - User management

### Admin Layout

The admin section uses a custom layout (`frontend/app/admin/layout.tsx`) that provides:
- Admin header with navigation
- Sidebar navigation
- Logout functionality
- Access to main site

### Protection

Admin routes are protected by `AdminProtectedRoute` component that:
1. Checks for authentication token
2. Decodes JWT to verify admin role
3. Redirects to login or home if not admin

### Key Components

- **`AdminProtectedRoute`**: Ensures only admin users can access admin pages
- **Admin Layout**: Provides consistent navigation and structure
- **Dashboard**: Overview with statistics and quick actions
- **Product Management**: Full CRUD interface for products
- **Inventory Management**: Stock level management with low stock alerts
- **Order Management**: Order listing and status updates
- **User Management**: User listing and role management

## 4. UI Features

### Dashboard
- Statistics cards (Products, Orders, Users, Low Stock)
- Quick action buttons
- Real-time data

### Products Page
- Product listing table
- Toggle active/inactive status
- Link to edit product (placeholder)
- Variant count display

### Inventory Page
- Stock level table
- Color-coded availability (green/yellow/orange)
- Inline stock editing
- Low stock highlighting

### Orders Page
- Order listing with status
- Status color coding
- Order detail sidebar
- Status update dropdown

### Users Page
- User listing table
- Role badges
- Toggle active/inactive
- Role management (add/remove roles)

## 5. Error Handling

All API endpoints return appropriate HTTP status codes:
- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Resource deleted
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not admin
- `404 Not Found` - Resource not found

Frontend components handle errors gracefully with user-friendly messages.

## 6. Security Considerations

1. **Role-Based Access**: Only users with "admin" role can access admin endpoints
2. **Self-Protection**: Admins cannot deactivate themselves or remove their own admin role
3. **Token Validation**: All requests require valid JWT token
4. **Input Validation**: All inputs are validated using Pydantic models
5. **SQL Injection Protection**: SQLAlchemy ORM provides protection
6. **Soft Deletes**: Products and variants are soft-deleted (is_active=False) to preserve data integrity

## 7. Next Steps / Future Enhancements

Potential improvements:
- Product creation/edit forms
- Bulk operations (bulk stock update, bulk status change)
- Order filtering and search
- User role assignment UI
- Category management
- Analytics and reporting
- Export functionality (CSV, PDF)
- Activity logs/audit trail
- Image upload for products
