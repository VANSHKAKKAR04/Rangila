"""
Quick script to URL-encode a password for use in DATABASE_URL.
"""
from urllib.parse import quote_plus

def encode_password():
    print("=" * 60)
    print("Password URL Encoder for DATABASE_URL")
    print("=" * 60)
    print()
    
    password = input("Enter your PostgreSQL password: ").strip()
    
    if not password:
        print("Password cannot be empty!")
        return
    
    encoded = quote_plus(password)
    
    print()
    print("=" * 60)
    print("Results:")
    print("=" * 60)
    print(f"Original password: {password}")
    print(f"URL-encoded:       {encoded}")
    print()
    print("Your DATABASE_URL should be:")
    print("-" * 60)
    print(f"DATABASE_URL=postgresql+psycopg2://postgres:{encoded}@localhost:5432/rangila")
    print()
    print("Copy this to your .env file!")

if __name__ == "__main__":
    try:
        encode_password()
    except KeyboardInterrupt:
        print("\n\nCancelled.")
