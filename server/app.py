import os
import sys

# Ensure backend directory is in sys.path for Vercel imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

# Load env vars before importing other modules that might use them
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from flask import Flask
from flask_cors import CORS
from models import db
from routes.auth import auth_bp
from routes.items import items_bp
from routes.claims import claims_bp
from routes.auth_google import auth_google_bp

app = Flask(__name__)

# --- Configuration & Middleware ---

# Enable CORS for all domains to allow frontend communication (Crucial for Vercel/Localhost split)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Database Configuration Strategy:
# 1. DATABASE_URL: Production (Neon Postgres / Render)
# 2. Vercel SQLite: Temporary /tmp storage for serverless functions (persistence is limited)
# 3. Local SQLite: Standard local development
db_url = os.getenv('DATABASE_URL')
if db_url:
    # Fix for some services that use postgres:// instead of postgresql://
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
    print("DEBUG: Using Remote Database")
elif os.getenv('VERCEL') or os.getenv('FLASK_ENV') == 'production':
    # Serverless environment fallback
    db_path = os.path.join('/tmp', 'campusfind.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    print(f"DEBUG: Using Vercel /tmp DB at {db_path}")
else:
    # Local development
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///campusfind.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize Extensions
db.init_app(app)

# --- Register Blueprints (Routes) ---
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(items_bp, url_prefix='/api/items')
app.register_blueprint(claims_bp, url_prefix='/api/claims')
app.register_blueprint(auth_google_bp, url_prefix='/api/auth')

from routes.gemini import gemini_bp
app.register_blueprint(gemini_bp, url_prefix='/api/gemini')

# --- Helper Routes ---

from flask import send_from_directory, jsonify

@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    """Serve uploaded files (local dev only - production uses Base64)"""
    if os.getenv('VERCEL') or os.getenv('FLASK_ENV') == 'production':
        return send_from_directory('/tmp/uploads', filename)
    return send_from_directory('uploads', filename)

@app.route('/')
def home():
    """Root endpoint to verify backend is running"""
    return "CampusFind API is running 🚀"

@app.route('/api/health')
def health():
    """Health check for uptime monitors"""
    return jsonify({"status": "ok", "message": "Backend is reachable"}), 200

# --- Database Initialization ---
# Ensure tables exist (Run this in global scope for Vercel/Serverless cold starts)
try:
    with app.app_context():
        db.create_all()
        print("DEBUG: Tables verified/created successfully")
except Exception as e:
    print(f"CRITICAL: DB Creation Failed: {e}")

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
