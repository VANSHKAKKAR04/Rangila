"""
Quick script to check and validate .env file DATABASE_URL format.
"""
import os
from urllib.parse import urlparse

def check_env():
    if not os.path.exists(".env"):
        print("❌ .env file not found!")
        print("\nCreate one using: python setup_env.py")
        return
    
    print("Checking .env file...")
    print("-" * 60)
    
    with open(".env", "r") as f:
        lines = f.readlines()
    
    database_url = None
    secret_key = None
    
    for line in lines:
        line = line.strip()
        if line.startswith("#") or not line:
            continue
        if "DATABASE_URL" in line:
            database_url = line.split("=", 1)[1].strip()
        if "SECRET_KEY" in line:
            secret_key = line.split("=", 1)[1].strip()
    
    if not database_url:
        print("❌ DATABASE_URL not found in .env file")
        return
    
    print(f"DATABASE_URL found: {database_url[:30]}...")  # Show first 30 chars
    
    # Try to parse the URL
    try:
        # For SQLAlchemy connection strings, we need to extract parts manually
        if "postgresql+psycopg2://" in database_url:
            url_part = database_url.replace("postgresql+psycopg2://", "")
            parts = url_part.split("@")
            if len(parts) != 2:
                print("❌ Invalid DATABASE_URL format!")
                print("   Expected: postgresql+psycopg2://user:password@host:port/database")
                print(f"   Got: {database_url[:50]}...")
                return
            
            creds_part = parts[0]
            host_part = parts[1]
            
            if ":" in creds_part:
                user, password = creds_part.split(":", 1)
                print(f"✅ Username: {user}")
                print(f"✅ Password: {'*' * len(password)}")
            else:
                print("❌ No password found in credentials")
                return
            
            if "/" in host_part:
                host_port, db_name = host_part.split("/", 1)
                if ":" in host_port:
                    host, port = host_port.split(":")
                    print(f"✅ Host: {host}")
                    print(f"✅ Port: {port}")
                else:
                    print(f"✅ Host: {host_port}")
                    print("⚠️  Port not specified (defaults to 5432)")
                print(f"✅ Database: {db_name}")
            else:
                print("❌ Database name not found in URL")
                return
                
            print("\n✅ DATABASE_URL format looks correct!")
            
        else:
            print("❌ DATABASE_URL should start with 'postgresql+psycopg2://'")
            
    except Exception as e:
        print(f"❌ Error parsing DATABASE_URL: {e}")
        print("\nExpected format:")
        print("  DATABASE_URL=postgresql+psycopg2://username:password@localhost:5432/rangila")
        print("\nIf your password contains special characters, they need to be URL-encoded:")
        print("  @ → %40")
        print("  : → %3A")
        print("  / → %2F")
        print("  % → %25")
        print("  & → %26")
        print("  = → %3D")
        print("  + → %2B")
    
    if secret_key:
        print(f"\n✅ SECRET_KEY found: {secret_key[:20]}...")
    else:
        print("\n⚠️  SECRET_KEY not found")

if __name__ == "__main__":
    check_env()
