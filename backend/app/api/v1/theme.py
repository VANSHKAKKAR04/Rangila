from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models.settings import Settings
from app.api.v1.admin.theme import ThemeResponse, ThemeColors, PREDEFINED_THEMES

router = APIRouter()


@router.get("/theme", response_model=ThemeResponse)
def get_current_theme(db: Session = Depends(get_db)):
    """Get the current active theme (public endpoint)."""
    setting = db.query(Settings).filter(Settings.key == "theme").first()
    
    if not setting or not setting.is_active:
        # Return default orange theme
        default_theme = PREDEFINED_THEMES["orange"]
        return ThemeResponse(
            name=default_theme["name"],
            colors=ThemeColors(**default_theme["colors"]),
            logo_url=None,
        )
    
    theme_data = setting.value
    return ThemeResponse(
        name=theme_data.get("name", "Orange"),
        colors=ThemeColors(**theme_data.get("colors", PREDEFINED_THEMES["orange"]["colors"])),
        logo_url=theme_data.get("logo_url"),
    )
