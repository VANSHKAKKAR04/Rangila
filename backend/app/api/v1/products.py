from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.db.models.product import Category, Product, ProductVariant
from app.db.session import get_db


router = APIRouter()


class CategoryOut(BaseModel):
    id: str
    name: str
    slug: str
    parent_id: Optional[str] = None

    class Config:
        orm_mode = True


class ProductListItem(BaseModel):
    id: str
    name: str
    slug: str
    price_cents: int
    currency: str
    short_description: Optional[str] = None
    main_image_url: Optional[str] = None
    category: CategoryOut
    default_variant_id: Optional[str] = None  # ID of the default variant for adding to cart

    class Config:
        orm_mode = True


class ProductDetail(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    price_cents: int
    currency: str
    main_image_url: Optional[str] = None
    category: CategoryOut
    default_variant_id: Optional[str] = None  # ID of the default variant for adding to cart

    class Config:
        orm_mode = True


class PaginatedProducts(BaseModel):
    items: List[ProductListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


@router.get("/products", response_model=PaginatedProducts)
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    category_slug: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
) -> PaginatedProducts:
    stmt = (
        select(Product)
        .options(joinedload(Product.category))
        .where(Product.is_active.is_(True))
    )

    if category_slug:
        stmt = stmt.join(Category).where(Category.slug == category_slug)

    if search:
        pattern = f"%{search.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Product.name).like(pattern),
                func.lower(Product.description).like(pattern),
            )
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    stmt = stmt.order_by(Product.created_at.desc())
    products = (
        db.execute(
            stmt.limit(page_size).offset((page - 1) * page_size)
        )
        .scalars()
        .all()
    )

    total_pages = (total + page_size - 1) // page_size if page_size else 1

    items: List[ProductListItem] = []
    for p in products:
        # Get default variant ID (first active variant, or first variant if none are active)
        default_variant_id = None
        if p.variants:
            default_variant = next((v for v in p.variants if v.name == "Default" and v.is_active), None)
            if not default_variant:
                default_variant = next((v for v in p.variants if v.is_active), None)
            if not default_variant:
                default_variant = p.variants[0] if p.variants else None
            if default_variant:
                default_variant_id = str(default_variant.id)
        
        items.append(
            ProductListItem(
                id=str(p.id),
                name=p.name,
                slug=p.slug,
                price_cents=p.price_cents,
                currency=p.currency,
                short_description=p.description[:140] if p.description else None,
                main_image_url=p.main_image_url,
                category=CategoryOut(
                    id=str(p.category.id),
                    name=p.category.name,
                    slug=p.category.slug,
                    parent_id=str(p.category.parent_id) if p.category.parent_id else None,
                ),
                default_variant_id=default_variant_id,
            )
        )

    return PaginatedProducts(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/products/{slug}", response_model=ProductDetail)
def get_product(slug: str, db: Session = Depends(get_db)) -> ProductDetail:
    product = (
        db.query(Product)
        .options(joinedload(Product.category), joinedload(Product.variants))
        .filter(Product.slug == slug, Product.is_active.is_(True))
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )

    # Get default variant ID
    default_variant_id = None
    if product.variants:
        default_variant = next((v for v in product.variants if v.name == "Default" and v.is_active), None)
        if not default_variant:
            default_variant = next((v for v in product.variants if v.is_active), None)
        if not default_variant:
            default_variant = product.variants[0] if product.variants else None
        if default_variant:
            default_variant_id = str(default_variant.id)

    return ProductDetail(
        id=str(product.id),
        name=product.name,
        slug=product.slug,
        default_variant_id=default_variant_id,
        description=product.description,
        price_cents=product.price_cents,
        currency=product.currency,
        main_image_url=product.main_image_url,
        category=CategoryOut(
            id=str(product.category.id),
            name=product.category.name,
            slug=product.category.slug,
            parent_id=str(product.category.parent_id)
            if product.category.parent_id
            else None,
        ),
    )


@router.get("/categories", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db)) -> List[CategoryOut]:
    categories = db.query(Category).order_by(Category.name.asc()).all()
    return [
        CategoryOut(
            id=str(c.id),
            name=c.name,
            slug=c.slug,
            parent_id=str(c.parent_id) if c.parent_id else None,
        )
        for c in categories
    ]


@router.get("/categories/{slug}", response_model=CategoryOut)
def get_category(slug: str, db: Session = Depends(get_db)) -> CategoryOut:
    category = db.query(Category).filter(Category.slug == slug).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    return CategoryOut(
        id=str(category.id),
        name=category.name,
        slug=category.slug,
        parent_id=str(category.parent_id) if category.parent_id else None,
    )

