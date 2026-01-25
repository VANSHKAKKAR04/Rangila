"""
Admin API endpoints for category management.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_admin_user
from app.db.models.product import Category
from app.db.models.user import User
from app.db.session import get_db

router = APIRouter()


# ==================== Request/Response Models ====================

class CategoryCreate(BaseModel):
    name: str
    slug: str


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None


class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str

    class Config:
        orm_mode = True


# ==================== Category Endpoints ====================

@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
) -> List[CategoryResponse]:
    """List all categories."""
    categories = db.query(Category).order_by(Category.name.asc()).all()
    return [
        CategoryResponse(
            id=str(c.id),
            name=c.name,
            slug=c.slug,
        )
        for c in categories
    ]


@router.get("/categories/{category_id}", response_model=CategoryResponse)
def get_category(
    category_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
) -> CategoryResponse:
    """Get a category by ID."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    return CategoryResponse(
        id=str(category.id),
        name=category.name,
        slug=category.slug,
    )


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
) -> CategoryResponse:
    """Create a new category."""
    # Check if slug already exists
    existing = db.query(Category).filter(Category.slug == category_data.slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this slug already exists",
        )
    
    category = Category(
        name=category_data.name,
        slug=category_data.slug,
    )
    
    db.add(category)
    db.commit()
    db.refresh(category)
    
    return CategoryResponse(
        id=str(category.id),
        name=category.name,
        slug=category.slug,
    )


@router.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: str,
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
) -> CategoryResponse:
    """Update a category."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    
    # Check slug uniqueness if changing
    if category_data.slug and category_data.slug != category.slug:
        existing = db.query(Category).filter(Category.slug == category_data.slug).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this slug already exists",
            )
    
    # Update fields
    update_data = category_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)
    
    db.commit()
    db.refresh(category)
    
    return CategoryResponse(
        id=str(category.id),
        name=category.name,
        slug=category.slug,
    )


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Delete a category."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    
    # Check if category has products
    from app.db.models.product import Product
    product_count = db.query(Product).filter(Product.category_id == category_id).count()
    if product_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete category with {product_count} product(s). Please move or delete products first.",
        )
    
    db.delete(category)
    db.commit()
