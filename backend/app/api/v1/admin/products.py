"""
Admin API endpoints for product management (CRUD operations).
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_admin_user
from app.db.models.product import Category, Inventory, Product, ProductVariant
from app.db.models.user import User
from app.db.session import get_db

router = APIRouter()


# ==================== Request/Response Models ====================

class ProductCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    price_cents: Optional[int] = None
    mrp: Optional[float] = None
    offer_price: Optional[float] = None
    currency: str = "INR"
    category_id: str
    sku: Optional[str] = None
    is_active: bool = True
    main_image_url: Optional[str] = None
    initial_stock: int = 0  # Initial stock quantity


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    price_cents: Optional[int] = None
    mrp: Optional[float] = None
    offer_price: Optional[float] = None
    currency: Optional[str] = None
    category_id: Optional[str] = None
    sku: Optional[str] = None
    is_active: Optional[bool] = None
    main_image_url: Optional[str] = None


class ProductVariantCreate(BaseModel):
    name: str
    sku: str
    price_cents: Optional[int] = None
    is_active: bool = True


class ProductVariantUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    price_cents: Optional[int] = None
    is_active: Optional[bool] = None


class ProductVariantResponse(BaseModel):
    id: str
    name: str
    sku: str
    price_cents: Optional[int]
    is_active: bool
    stock_on_hand: int = 0
    stock_reserved: int = 0

    class Config:
        orm_mode = True


class ProductResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str]
    price_cents: int
    mrp: Optional[float]
    offer_price: Optional[float]
    currency: str
    sku: Optional[str]
    is_active: bool
    main_image_url: Optional[str]
    category_id: str
    category_name: str
    variants: List[ProductVariantResponse] = []

    class Config:
        orm_mode = True


# ==================== Product Endpoints ====================

@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
) -> ProductResponse:
    """Create a new product."""
    # Check if slug already exists
    existing = db.query(Product).filter(Product.slug == product_data.slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product with this slug already exists",
        )
    
    # Check if category exists
    category = db.query(Category).filter(Category.id == product_data.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    
    # Check SKU uniqueness if provided
    if product_data.sku:
        existing_sku = db.query(Product).filter(Product.sku == product_data.sku).first()
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product with this SKU already exists",
            )
    
    # Validate that either price_cents or offer_price is provided
    price_cents = product_data.price_cents
    if not price_cents and product_data.offer_price:
        # If price_cents is not provided, use offer_price * 100 (convert to cents)
        price_cents = int(product_data.offer_price * 100)
    
    if not price_cents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either price_cents or offer_price must be provided",
        )
    
    product = Product(
        name=product_data.name,
        slug=product_data.slug,
        description=product_data.description,
        price_cents=price_cents,
        mrp=product_data.mrp,
        offer_price=product_data.offer_price,
        currency=product_data.currency,
        category_id=product_data.category_id,
        sku=product_data.sku,
        is_active=product_data.is_active,
        main_image_url=product_data.main_image_url,
    )
    
    db.add(product)
    db.flush()  # Get product ID without committing
    
    # Create default variant for the product
    default_variant = ProductVariant(
        product_id=product.id,
        name="Default",
        sku=f"{product.slug}-default" if not product.sku else f"{product.sku}-default",
        price_cents=None,  # Use product price
        is_active=True,
    )
    db.add(default_variant)
    db.flush()  # Get variant ID
    
    # Create inventory record for the default variant if initial_stock > 0
    if product_data.initial_stock > 0:
        inventory = Inventory(
            variant_id=default_variant.id,
            stock_on_hand=product_data.initial_stock,
            stock_reserved=0,
        )
        db.add(inventory)
    
    db.commit()
    db.refresh(product)
    
    # Load category name
    db.refresh(category)
    
    # Load variants for response
    db.refresh(default_variant)
    variant_inventory = db.query(Inventory).filter(Inventory.variant_id == default_variant.id).first()
    
    return ProductResponse(
        id=str(product.id),
        name=product.name,
        slug=product.slug,
        description=product.description,
        price_cents=product.price_cents,
        mrp=float(product.mrp) if product.mrp else None,
        offer_price=float(product.offer_price) if product.offer_price else None,
        currency=product.currency,
        sku=product.sku,
        is_active=product.is_active,
        main_image_url=product.main_image_url,
        category_id=str(product.category_id),
        category_name=category.name,
        variants=[
            ProductVariantResponse(
                id=str(default_variant.id),
                name=default_variant.name,
                sku=default_variant.sku,
                price_cents=default_variant.price_cents,
                is_active=default_variant.is_active,
                stock_on_hand=variant_inventory.stock_on_hand if variant_inventory else 0,
                stock_reserved=variant_inventory.stock_reserved if variant_inventory else 0,
            )
        ],
    )


@router.get("/products", response_model=List[ProductResponse])
def list_products(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
) -> List[ProductResponse]:
    """List all products (admin view)."""
    products = db.query(Product).offset(skip).limit(limit).all()
    
    result = []
    for product in products:
        variants = []
        for variant in product.variants:
            inventory = db.query(Inventory).filter(Inventory.variant_id == variant.id).first()
            variants.append(
                ProductVariantResponse(
                    id=str(variant.id),
                    name=variant.name,
                    sku=variant.sku,
                    price_cents=variant.price_cents,
                    is_active=variant.is_active,
                    stock_on_hand=inventory.stock_on_hand if inventory else 0,
                    stock_reserved=inventory.stock_reserved if inventory else 0,
                )
            )
        
        result.append(
            ProductResponse(
                id=str(product.id),
                name=product.name,
                slug=product.slug,
                description=product.description,
                price_cents=product.price_cents,
                mrp=float(product.mrp) if product.mrp else None,
                offer_price=float(product.offer_price) if product.offer_price else None,
                currency=product.currency,
                sku=product.sku,
                is_active=product.is_active,
                main_image_url=product.main_image_url,
                category_id=str(product.category_id),
                category_name=product.category.name,
                variants=variants,
            )
        )
    
    return result


@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
) -> ProductResponse:
    """Get product details."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    variants = []
    for variant in product.variants:
        inventory = db.query(Inventory).filter(Inventory.variant_id == variant.id).first()
        variants.append(
            ProductVariantResponse(
                id=str(variant.id),
                name=variant.name,
                sku=variant.sku,
                price_cents=variant.price_cents,
                is_active=variant.is_active,
                stock_on_hand=inventory.stock_on_hand if inventory else 0,
                stock_reserved=inventory.stock_reserved if inventory else 0,
            )
        )
    
    return ProductResponse(
        id=str(product.id),
        name=product.name,
        slug=product.slug,
        description=product.description,
        price_cents=product.price_cents,
        mrp=float(product.mrp) if product.mrp else None,
        offer_price=float(product.offer_price) if product.offer_price else None,
        currency=product.currency,
        sku=product.sku,
        is_active=product.is_active,
        main_image_url=product.main_image_url,
        category_id=str(product.category_id),
        category_name=product.category.name,
        variants=variants,
    )


@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: str,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
) -> ProductResponse:
    """Update a product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    # Check slug uniqueness if changing
    if product_data.slug and product_data.slug != product.slug:
        existing = db.query(Product).filter(Product.slug == product_data.slug).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product with this slug already exists",
            )
    
    # Check SKU uniqueness if changing
    if product_data.sku and product_data.sku != product.sku:
        existing_sku = db.query(Product).filter(Product.sku == product_data.sku).first()
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product with this SKU already exists",
            )
    
    # Update fields
    update_data = product_data.dict(exclude_unset=True)
    if "category_id" in update_data:
        category = db.query(Category).filter(Category.id == update_data["category_id"]).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )
    
    for key, value in update_data.items():
        setattr(product, key, value)
    
    db.commit()
    db.refresh(product)
    
    # Load variants with inventory
    variants = []
    for variant in product.variants:
        inventory = db.query(Inventory).filter(Inventory.variant_id == variant.id).first()
        variants.append(
            ProductVariantResponse(
                id=str(variant.id),
                name=variant.name,
                sku=variant.sku,
                price_cents=variant.price_cents,
                is_active=variant.is_active,
                stock_on_hand=inventory.stock_on_hand if inventory else 0,
                stock_reserved=inventory.stock_reserved if inventory else 0,
            )
        )
    
    return ProductResponse(
        id=str(product.id),
        name=product.name,
        slug=product.slug,
        description=product.description,
        price_cents=product.price_cents,
        mrp=float(product.mrp) if product.mrp else None,
        offer_price=float(product.offer_price) if product.offer_price else None,
        currency=product.currency,
        sku=product.sku,
        is_active=product.is_active,
        main_image_url=product.main_image_url,
        category_id=str(product.category_id),
        category_name=product.category.name,
        variants=variants,
    )


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Completely delete a product and its inventory."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # 🔥 Delete inventory → variants → product
    for variant in product.variants:
        db.query(Inventory).filter(
            Inventory.variant_id == variant.id
        ).delete()

    db.query(ProductVariant).filter(
        ProductVariant.product_id == product.id
    ).delete()

    db.delete(product)
    db.commit()


# ==================== Variant Endpoints ====================

@router.post("/products/{product_id}/variants", response_model=ProductVariantResponse, status_code=status.HTTP_201_CREATED)
def create_variant(
    product_id: str,
    variant_data: ProductVariantCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
) -> ProductVariantResponse:
    """Create a product variant."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    # Check SKU uniqueness
    existing = db.query(ProductVariant).filter(ProductVariant.sku == variant_data.sku).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Variant with this SKU already exists",
        )
    
    variant = ProductVariant(
        product_id=product_id,
        name=variant_data.name,
        sku=variant_data.sku,
        price_cents=variant_data.price_cents,
        is_active=variant_data.is_active,
    )
    
    db.add(variant)
    db.commit()
    db.refresh(variant)
    
    # Create inventory record
    inventory = Inventory(variant_id=variant.id, stock_on_hand=0, stock_reserved=0)
    db.add(inventory)
    db.commit()
    
    return ProductVariantResponse(
        id=str(variant.id),
        name=variant.name,
        sku=variant.sku,
        price_cents=variant.price_cents,
        is_active=variant.is_active,
        stock_on_hand=0,
        stock_reserved=0,
    )


@router.put("/variants/{variant_id}", response_model=ProductVariantResponse)
def update_variant(
    variant_id: str,
    variant_data: ProductVariantUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
) -> ProductVariantResponse:
    """Update a product variant."""
    variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variant not found",
        )
    
    # Check SKU uniqueness if changing
    if variant_data.sku and variant_data.sku != variant.sku:
        existing = db.query(ProductVariant).filter(ProductVariant.sku == variant_data.sku).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Variant with this SKU already exists",
            )
    
    update_data = variant_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(variant, key, value)
    
    db.commit()
    db.refresh(variant)
    
    inventory = db.query(Inventory).filter(Inventory.variant_id == variant.id).first()
    
    return ProductVariantResponse(
        id=str(variant.id),
        name=variant.name,
        sku=variant.sku,
        price_cents=variant.price_cents,
        is_active=variant.is_active,
        stock_on_hand=inventory.stock_on_hand if inventory else 0,
        stock_reserved=inventory.stock_reserved if inventory else 0,
    )


@router.delete("/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variant(
    variant_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Delete a variant (soft delete)."""
    variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variant not found",
        )
    
    variant.is_active = False
    db.commit()
