"""
Helper script to create .env file interactively.
"""
import os

def create_env_file():
    print("=" * 60)
    print("Creating .env file for Rangila Backend")
    print("=" * 60)
    print()
    
    # Check if .env already exists
    if os.path.exists(".env"):
        response = input(".env file already exists. Overwrite? (y/n): ")
        if response.lower() != 'y':
            print("Cancelled.")
            return
    
    # Get database credentials
    print("PostgreSQL Database Configuration:")
    print("-" * 60)
    db_user = input("Database user [postgres]: ").strip() or "postgres"
    db_password = input("Database password: ").strip()
    if not db_password:
        print("Error: Password cannot be empty!")
        return
    
    db_host = input("Database host [localhost]: ").strip() or "localhost"
    db_port = input("Database port [5432]: ").strip() or "5432"
    db_name = input("Database name [rangila]: ").strip() or "rangila"
    
    print()
    print("Security Configuration:")
    print("-" * 60)
    secret_key = input("Secret key (leave empty to generate random): ").strip()
    if not secret_key:
        import secrets
        secret_key = secrets.token_urlsafe(32)
        print(f"Generated secret key: {secret_key}")
    
    # URL encode password if it contains special characters
    from urllib.parse import quote_plus
    encoded_password = quote_plus(db_password)
    
    # Create .env content
    env_content = f"""# Database Configuration
DATABASE_URL=postgresql+psycopg2://{db_user}:{encoded_password}@{db_host}:{db_port}/{db_name}

# Security
SECRET_KEY={secret_key}

# CORS Origins (optional - defaults to localhost:3000)
# BACKEND_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
"""
    
    # Write .env file
    with open(".env", "w") as f:
        f.write(env_content)
    
    print()
    print("✅ .env file created successfully!")
    print()
    print("Next steps:")
    print("  1. Review the .env file to ensure credentials are correct")
    print("  2. Run: python init_db.py")
    print("  3. Start server: uvicorn app.main:app --reload")

if __name__ == "__main__":
    try:
        create_env_file()
    except KeyboardInterrupt:
        print("\n\nCancelled.")
