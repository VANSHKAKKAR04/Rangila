"""
Admin API endpoints for category management.
"""
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


class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str

    class Config:
        orm_mode = True


# ==================== Category Endpoints ====================

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
