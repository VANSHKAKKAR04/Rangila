from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.db.models.settings import Settings
from app.core.dependencies import get_admin_user
from app.db.models.user import User

router = APIRouter()


class ThemeColors(BaseModel):
    primary_50: str = "#fff7ed"
    primary_100: str = "#ffedd5"
    primary_200: str = "#fed7aa"
    primary_300: str = "#fdba74"
    primary_400: str = "#fb923c"
    primary_500: str = "#f97316"
    primary_600: str = "#ea580c"
    primary_700: str = "#c2410c"
    primary_800: str = "#9a3412"
    primary_900: str = "#7c2d12"


class ThemeUpdate(BaseModel):
    name: str
    colors: ThemeColors
    logo_url: Optional[str] = None


class ThemeResponse(BaseModel):
    name: str
    colors: ThemeColors
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True


# Predefined themes
PREDEFINED_THEMES = {
    "orange": {
        "name": "Orange",
        "colors": {
            "primary_50": "#fff7ed",
            "primary_100": "#ffedd5",
            "primary_200": "#fed7aa",
            "primary_300": "#fdba74",
            "primary_400": "#fb923c",
            "primary_500": "#f97316",
            "primary_600": "#ea580c",
            "primary_700": "#c2410c",
            "primary_800": "#9a3412",
            "primary_900": "#7c2d12",
        },
    },
    "blue": {
        "name": "Blue",
        "colors": {
            "primary_50": "#eff6ff",
            "primary_100": "#dbeafe",
            "primary_200": "#bfdbfe",
            "primary_300": "#93c5fd",
            "primary_400": "#60a5fa",
            "primary_500": "#3b82f6",
            "primary_600": "#2563eb",
            "primary_700": "#1d4ed8",
            "primary_800": "#1e40af",
            "primary_900": "#1e3a8a",
        },
    },
    "green": {
        "name": "Green",
        "colors": {
            "primary_50": "#f0fdf4",
            "primary_100": "#dcfce7",
            "primary_200": "#bbf7d0",
            "primary_300": "#86efac",
            "primary_400": "#4ade80",
            "primary_500": "#22c55e",
            "primary_600": "#16a34a",
            "primary_700": "#15803d",
            "primary_800": "#166534",
            "primary_900": "#14532d",
        },
    },
    "purple": {
        "name": "Purple",
        "colors": {
            "primary_50": "#faf5ff",
            "primary_100": "#f3e8ff",
            "primary_200": "#e9d5ff",
            "primary_300": "#d8b4fe",
            "primary_400": "#c084fc",
            "primary_500": "#a855f7",
            "primary_600": "#9333ea",
            "primary_700": "#7e22ce",
            "primary_800": "#6b21a8",
            "primary_900": "#581c87",
        },
    },
    "pink": {
        "name": "Pink",
        "colors": {
            "primary_50": "#fdf2f8",
            "primary_100": "#fce7f3",
            "primary_200": "#fbcfe8",
            "primary_300": "#f9a8d4",
            "primary_400": "#f472b6",
            "primary_500": "#ec4899",
            "primary_600": "#db2777",
            "primary_700": "#be185d",
            "primary_800": "#9f1239",
            "primary_900": "#831843",
        },
    },
    "red": {
        "name": "Red",
        "colors": {
            "primary_50": "#fef2f2",
            "primary_100": "#fee2e2",
            "primary_200": "#fecaca",
            "primary_300": "#fca5a5",
            "primary_400": "#f87171",
            "primary_500": "#ef4444",
            "primary_600": "#dc2626",
            "primary_700": "#b91c1c",
            "primary_800": "#991b1b",
            "primary_900": "#7f1d1d",
        },
    },
    "yellow": {
        "name": "Yellow",
        "colors": {
            "primary_50": "#fefce8",
            "primary_100": "#fef9c3",
            "primary_200": "#fef08a",
            "primary_300": "#fde047",
            "primary_400": "#facc15",
            "primary_500": "#eab308",
            "primary_600": "#ca8a04",
            "primary_700": "#a16207",
            "primary_800": "#854d0e",
            "primary_900": "#713f12",
        },
    },
    "black": {
        "name": "Black",
        "colors": {
            "primary_50": "#f9fafb",
            "primary_100": "#f3f4f6",
            "primary_200": "#e5e7eb",
            "primary_300": "#d1d5db",
            "primary_400": "#9ca3af",
            "primary_500": "#6b7280",
            "primary_600": "#4b5563",
            "primary_700": "#374151",
            "primary_800": "#1f2937",
            "primary_900": "#111827",
        },
    },
    "teal": {
        "name": "Teal",
        "colors": {
            "primary_50": "#f0fdfa",
            "primary_100": "#ccfbf1",
            "primary_200": "#99f6e4",
            "primary_300": "#5eead4",
            "primary_400": "#2dd4bf",
            "primary_500": "#14b8a6",
            "primary_600": "#0d9488",
            "primary_700": "#0f766e",
            "primary_800": "#115e59",
            "primary_900": "#134e4a",
        },
    },
    "indigo": {
        "name": "Indigo",
        "colors": {
            "primary_50": "#eef2ff",
            "primary_100": "#e0e7ff",
            "primary_200": "#c7d2fe",
            "primary_300": "#a5b4fc",
            "primary_400": "#818cf8",
            "primary_500": "#6366f1",
            "primary_600": "#4f46e5",
            "primary_700": "#4338ca",
            "primary_800": "#3730a3",
            "primary_900": "#312e81",
        },
    },
    "cyan": {
        "name": "Cyan",
        "colors": {
            "primary_50": "#ecfeff",
            "primary_100": "#cffafe",
            "primary_200": "#a5f3fc",
            "primary_300": "#67e8f9",
            "primary_400": "#22d3ee",
            "primary_500": "#06b6d4",
            "primary_600": "#0891b2",
            "primary_700": "#0e7490",
            "primary_800": "#155e75",
            "primary_900": "#164e63",
        },
    },
    "amber": {
        "name": "Amber",
        "colors": {
            "primary_50": "#fffbeb",
            "primary_100": "#fef3c7",
            "primary_200": "#fde68a",
            "primary_300": "#fcd34d",
            "primary_400": "#fbbf24",
            "primary_500": "#f59e0b",
            "primary_600": "#d97706",
            "primary_700": "#b45309",
            "primary_800": "#92400e",
            "primary_900": "#78350f",
        },
    },
    "emerald": {
        "name": "Emerald",
        "colors": {
            "primary_50": "#ecfdf5",
            "primary_100": "#d1fae5",
            "primary_200": "#a7f3d0",
            "primary_300": "#6ee7b7",
            "primary_400": "#34d399",
            "primary_500": "#10b981",
            "primary_600": "#059669",
            "primary_700": "#047857",
            "primary_800": "#065f46",
            "primary_900": "#064e3b",
        },
    },
    "rose": {
        "name": "Rose",
        "colors": {
            "primary_50": "#fff1f2",
            "primary_100": "#ffe4e6",
            "primary_200": "#fecdd3",
            "primary_300": "#fda4af",
            "primary_400": "#fb7185",
            "primary_500": "#f43f5e",
            "primary_600": "#e11d48",
            "primary_700": "#be123c",
            "primary_800": "#9f1239",
            "primary_900": "#881337",
        },
    },
}


@router.get("/theme", response_model=ThemeResponse)
def get_current_theme(db: Session = Depends(get_db)):
    """Get the current active theme."""
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


@router.put("/theme", response_model=ThemeResponse)
def update_theme(
    theme_data: ThemeUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Update the website theme."""
    setting = db.query(Settings).filter(Settings.key == "theme").first()
    
    theme_value = {
        "name": theme_data.name,
        "colors": theme_data.colors.dict(),
        "logo_url": theme_data.logo_url,
    }
    
    if setting:
        setting.value = theme_value
        setting.is_active = True
    else:
        setting = Settings(
            key="theme",
            value=theme_value,
            description="Website theme configuration",
            is_active=True,
        )
        db.add(setting)
    
    db.commit()
    db.refresh(setting)
    
    return ThemeResponse(
        name=theme_data.name,
        colors=theme_data.colors,
        logo_url=theme_data.logo_url,
    )


@router.get("/theme/presets")
def get_theme_presets():
    """Get all predefined theme presets."""
    return {
        "presets": [
            {
                "id": key,
                "name": value["name"],
                "colors": value["colors"],
            }
            for key, value in PREDEFINED_THEMES.items()
        ]
    }
