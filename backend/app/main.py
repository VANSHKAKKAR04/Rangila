from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import settings


def create_app() -> FastAPI:
    """
    Application factory for the FastAPI backend.
    """
    app = FastAPI(title=settings.project_name, version="0.1.0")

    # Build CORS origins list
    cors_origins = [
        "http://localhost:3000",  # Next.js dev server
        "http://127.0.0.1:3000",
        "https://rangila-qwpm.vercel.app",  # Vercel production frontend
    ]
    
    # Add any additional origins from environment variable
    if settings.backend_cors_origins:
        additional_origins = [url.strip() for url in settings.backend_cors_origins.split(",") if url.strip()]
        cors_origins.extend(additional_origins)
    
    # Remove duplicates while preserving order
    cors_origins = list(dict.fromkeys(cors_origins))

    # Configure CORS middleware
    # Using allow_origin_regex to allow all Vercel preview URLs
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_origin_regex=r"https://.*\.vercel\.app",  # Allow all Vercel preview URLs
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
        expose_headers=["*"],
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
            "cors_origins": cors_origins,
            "backend_cors_origins_env": settings.backend_cors_origins,
        }

    return app


app = create_app()

