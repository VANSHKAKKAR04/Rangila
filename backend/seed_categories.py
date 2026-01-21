"""
Script to seed default categories in the database.
"""
from app.db.models.product import Category
from app.db.session import SessionLocal


def seed_categories():
    """Create default categories if they don't exist."""
    db = SessionLocal()
    
    categories = [
        {"name": "Stationery", "slug": "stationery"},
        {"name": "Novelties", "slug": "novelties"},
        {"name": "Toys", "slug": "toys"},
        {"name": "Crockery", "slug": "crockery"},
    ]
    
    try:
        for cat_data in categories:
            existing = db.query(Category).filter(Category.slug == cat_data["slug"]).first()
            if not existing:
                category = Category(name=cat_data["name"], slug=cat_data["slug"])
                db.add(category)
                print(f"✅ Created category: {cat_data['name']}")
            else:
                print(f"⏭️  Category already exists: {cat_data['name']}")
        
        db.commit()
        print("\n✅ Categories seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding categories: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Seeding categories...")
    seed_categories()
