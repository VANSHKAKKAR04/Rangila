"""
Admin API endpoints for inventory management.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.dependencies import get_admin_user
from app.db.models.product import Category, Inventory, Product, ProductVariant
from app.db.models.user import User
from app.db.session import get_db

router = APIRouter()


# ==================== Request/Response Models ====================

class InventoryUpdate(BaseModel):
    stock_available: int  # This will update stock_on_hand, preserving reserved stock


class InventoryResponse(BaseModel):
    product_id: str
    product_name: str
    product_slug: str
    category_id: str
    category_name: str
    stock_available: int

    class Config:
        orm_mode = True


# ==================== Inventory Endpoints ====================

@router.get("/inventory", response_model=list[InventoryResponse])
def list_inventory(
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
) -> list[InventoryResponse]:
    """List all products with their available stock, optionally filtered by category."""
    # Build query
    query = db.query(Product).filter(Product.is_active.is_(True))
    
    # Filter by category if provided
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    products = query.offset(skip).limit(limit).all()
    
    result = []
    for product in products:
        # Get total available stock across all variants
        total_available = 0
        for variant in product.variants:
            if variant.is_active:
                inventory = db.query(Inventory).filter(Inventory.variant_id == variant.id).first()
                if inventory:
                    total_available += inventory.stock_on_hand - inventory.stock_reserved
        
        result.append(
            InventoryResponse(
                product_id=str(product.id),
                product_name=product.name,
                product_slug=product.slug,
                category_id=str(product.category_id),
                category_name=product.category.name,
                stock_available=total_available,
            )
        )
    
    return result


@router.get("/inventory/{product_id}", response_model=InventoryResponse)
def get_inventory(
    product_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
) -> InventoryResponse:
    """Get inventory for a specific product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    # Calculate total available stock across all variants
    total_available = 0
    for variant in product.variants:
        if variant.is_active:
            inventory = db.query(Inventory).filter(Inventory.variant_id == variant.id).first()
            if inventory:
                total_available += inventory.stock_on_hand - inventory.stock_reserved
    
    return InventoryResponse(
        product_id=str(product.id),
        product_name=product.name,
        product_slug=product.slug,
        category_id=str(product.category_id),
        category_name=product.category.name,
        stock_available=total_available,
    )


@router.put("/inventory/{product_id}", response_model=InventoryResponse)
def update_inventory(
    product_id: str,
    inventory_data: InventoryUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
) -> InventoryResponse:
    """Update inventory stock level for a product."""
    if inventory_data.stock_available < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock available cannot be negative",
        )
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    # Find or create default variant
    default_variant = (
        db.query(ProductVariant)
        .filter(ProductVariant.product_id == product.id, ProductVariant.name == "Default")
        .first()
    )
    
    if not default_variant:
        # Create default variant if it doesn't exist
        default_variant = ProductVariant(
            product_id=product.id,
            name="Default",
            sku=f"{product.slug}-default",
            price_cents=None,
            is_active=True,
        )
        db.add(default_variant)
        db.flush()
    
    # Get current inventory
    inventory = db.query(Inventory).filter(Inventory.variant_id == default_variant.id).first()
    
    # Calculate current reserved stock
    current_reserved = inventory.stock_reserved if inventory else 0
    
    # Set stock_on_hand to achieve desired available stock
    new_stock_on_hand = inventory_data.stock_available + current_reserved
    
    if not inventory:
        inventory = Inventory(
            variant_id=default_variant.id,
            stock_on_hand=new_stock_on_hand,
            stock_reserved=current_reserved,
        )
        db.add(inventory)
    else:
        inventory.stock_on_hand = new_stock_on_hand
    
    db.commit()
    db.refresh(product)
    
    return InventoryResponse(
        product_id=str(product.id),
        product_name=product.name,
        product_slug=product.slug,
        category_id=str(product.category_id),
        category_name=product.category.name,
        stock_available=inventory_data.stock_available,
    )
