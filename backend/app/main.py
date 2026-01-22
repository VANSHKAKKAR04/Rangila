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
            # Production origins - will be updated after Vercel deployment
            *([str(origin) for origin in settings.backend_cors_origins] if settings.backend_cors_origins else []),
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

    return app


app = create_app()

