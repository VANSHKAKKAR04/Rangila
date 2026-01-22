"""
Database initialization endpoint for admin use.
Should be called once after deployment to create all tables.
"""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError

from app.db.base import Base
from app.db.models import user, product, cart, order  # Import all models to register them
from app.db.session import engine

router = APIRouter()


@router.get("/init-db", tags=["admin"])
@router.post("/init-db", tags=["admin"])
def init_database():
    """
    Initialize database tables.
    This endpoint creates all required tables in the database.
    Should only be called once after first deployment.
    """
    try:
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        
        # Get list of created tables
        table_names = list(Base.metadata.tables.keys())
        
        return {
            "status": "success",
            "message": "Database tables created successfully!",
            "tables_created": table_names,
            "count": len(table_names)
        }
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database initialization failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )
