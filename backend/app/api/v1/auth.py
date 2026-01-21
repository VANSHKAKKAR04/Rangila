from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.db.models.user import Role, User
from app.db.session import get_db


router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class SignupPayload(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None


class AdminSignupPayload(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    admin_key: str  # Secret key for admin signup (in production, use proper secret management)


@router.post("/signup", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupPayload, db: Session = Depends(get_db)) -> TokenPair:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)

    # assign default customer role
    role = db.query(Role).filter(Role.name == "customer").first()
    if role is None:
        role = Role(name="customer", description="Default customer role")
        db.add(role)
        db.flush()
    user.roles.append(role)

    db.commit()
    db.refresh(user)

    roles = [r.name for r in user.roles]
    access = create_access_token(str(user.id), roles=roles)
    refresh = create_refresh_token(str(user.id))
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/admin/signup", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
def admin_signup(payload: AdminSignupPayload, db: Session = Depends(get_db)) -> TokenPair:
    """
    Admin signup endpoint.
    Requires an admin_key to prevent unauthorized admin account creation.
    In production, use environment variables for the admin key.
    """
    # Simple admin key check (in production, use environment variable)
    # For development, we'll use a simple check
    # In production, use: ADMIN_SIGNUP_KEY from environment
    expected_admin_key = "admin123"  # TODO: Move to environment variable
    
    if payload.admin_key != expected_admin_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin signup key"
        )
    
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)

    # Create admin role if it doesn't exist
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if admin_role is None:
        admin_role = Role(name="admin", description="Administrator role")
        db.add(admin_role)
        db.flush()
    
    # Assign admin role
    user.roles.append(admin_role)

    # Also assign customer role
    customer_role = db.query(Role).filter(Role.name == "customer").first()
    if customer_role is None:
        customer_role = Role(name="customer", description="Default customer role")
        db.add(customer_role)
        db.flush()
    user.roles.append(customer_role)

    db.commit()
    db.refresh(user)

    roles = [r.name for r in user.roles]
    access = create_access_token(str(user.id), roles=roles)
    refresh = create_refresh_token(str(user.id))
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=TokenPair)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> TokenPair:
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    roles = [r.name for r in user.roles]
    access_expires = timedelta(minutes=settings.access_token_expires_minutes)
    access = create_access_token(str(user.id), roles=roles, expires_delta=access_expires)
    refresh = create_refresh_token(str(user.id))
    return TokenPair(access_token=access, refresh_token=refresh)
