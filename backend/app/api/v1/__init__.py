from fastapi import APIRouter

from . import auth, cart, orders, products, upload, payments, theme
from .admin import admin_router
from .admin.init_db import router as init_db_router


api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(products.router, tags=["products"])
api_router.include_router(cart.router, tags=["cart"])
api_router.include_router(orders.router, tags=["orders"])
api_router.include_router(upload.router, tags=["upload"])
api_router.include_router(payments.router, tags=["payments"])
api_router.include_router(theme.router, tags=["theme"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(init_db_router, prefix="/admin", tags=["admin"])



