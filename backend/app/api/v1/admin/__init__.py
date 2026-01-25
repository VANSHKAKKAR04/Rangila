"""
Admin API router aggregation.
"""
from fastapi import APIRouter

from . import categories, inventory, orders, products, users, theme

# Don't add prefix here - it's added in the main router
admin_router = APIRouter(tags=["admin"])

admin_router.include_router(categories.router, tags=["admin-categories"])
admin_router.include_router(products.router, tags=["admin-products"])
admin_router.include_router(inventory.router, tags=["admin-inventory"])
admin_router.include_router(orders.router, tags=["admin-orders"])
admin_router.include_router(users.router, tags=["admin-users"])
admin_router.include_router(theme.router, tags=["admin-theme"])