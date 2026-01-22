from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import settings


def create_app() -> FastAPI:
    """
    Application factory for the FastAPI backend.
    """
    app = FastAPI(title=settings.project_name, version="0.1.0")

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",  # Next.js dev server
            "http://127.0.0.1:3000",
            "https://rangila-qwpm.vercel.app",  # Vercel production frontend
            # Additional origins from environment variable (if set, comma-separated)
            *([url.strip() for url in settings.backend_cors_origins.split(",")] if settings.backend_cors_origins else []),
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include versioned API router
    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health", tags=["system"])
    async def health_check() -> dict:
        return {"status": "ok"}
    
    @app.get("/debug/config", tags=["system"])
    async def debug_config() -> dict:
        """Debug endpoint to check configuration (remove in production)"""
        import os
        return {
            "database_url_from_env": os.getenv("DATABASE_URL", "NOT SET"),
            "database_url_from_settings": settings.database_url[:50] + "..." if len(settings.database_url) > 50 else settings.database_url,
            "secret_key_set": bool(settings.secret_key and settings.secret_key != "change-me-in-env"),
        }

    return app


app = create_app()

