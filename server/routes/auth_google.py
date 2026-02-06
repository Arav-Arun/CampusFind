from flask import Blueprint, request, jsonify
import firebase_admin
import json
from firebase_admin import credentials, auth
from models import db, User
import os
import jwt
import datetime
from routes.auth import SECRET_KEY

auth_google_bp = Blueprint('auth_google', __name__)

# Initialize Firebase Admin
# We check if it's already initialized to avoid errors during reloads/hot-restarts
if not firebase_admin._apps:
    # STRATEGY 1: Environment Variable (Secure for Vercel/Production)
    # This allows us to inject the JSON content without committing the file
    firebase_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON')
    
    cred = None
    
    if firebase_json:
        try:
            # Parse the JSON string from env var
            key_dict = json.loads(firebase_json)
            cred = credentials.Certificate(key_dict)
            print("DEBUG: Loaded Firebase Credentials from Environment Variable")
        except Exception as e:
            print(f"ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: {e}")

    # STRATEGY 2: File Path (Local Development)
    if not cred:
        cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH')
        # Resolve absolute path if relative
        if cred_path and not os.path.isabs(cred_path):
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # server/
            cred_path = os.path.join(base_dir, cred_path)

        if cred_path and os.path.exists(cred_path):
            try:
                cred = credentials.Certificate(cred_path)
                print(f"DEBUG: Loaded Firebase Credentials from file at {cred_path}")
            except Exception as e:
                print(f"ERROR: Failed to load Firebase Cert file: {e}")

    # Initialize App
    try:
        if cred:
            firebase_admin.initialize_app(cred, {
                'storageBucket': os.getenv('FIREBASE_STORAGE_BUCKET')
            })
            print("DEBUG: Firebase Admin Initialized successfully")
        else:
            print("WARNING: No Firebase Credentials found. Google Auth may fail locally.")
            # Fallback for Google Cloud environments (rarely used here but good practice)
            firebase_admin.initialize_app(None, {
                'storageBucket': os.getenv('FIREBASE_STORAGE_BUCKET')
            }) 
    except Exception as e:
        print(f"DEBUG: Firebase Init failed: {e}")

@auth_google_bp.route('/google', methods=['POST'])
def google_login():
    """
    Handle Google Sign-In.
    Verifies ID token from frontend, creates/updates user, and returns app JWT.
    """
    data = request.get_json()
    id_token = data.get('token')
    
    if not id_token:
        return jsonify({"error": "Token required"}), 400
        
    try:
        # Verify the token with Firebase
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        email = decoded_token.get('email')
        name = decoded_token.get('name')
        picture = decoded_token.get('picture')
        
        # Check if user exists
        user = User.query.filter_by(email=email).first()
        
        if user:
            # Update google_id if missing
            if not user.google_id:
                user.google_id = uid
                db.session.commit()
        else:
            # Create new user
            user = User(
                email=email,
                name=name,
                google_id=uid,
                profile_photo=picture,
                role='student' # Default
            )
            db.session.add(user)
            db.session.commit()
            
        # Generate App JWT (Same as normal login)
        token = jwt.encode({
            'user_id': user.id,
            'email': user.email,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, SECRET_KEY, algorithm="HS256")
        
        return jsonify({
            "token": token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "profile_photo": user.profile_photo
            }
        }), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Google Auth Error: {e}")
        return jsonify({"error": f"Google Auth Failed: {str(e)}"}), 401
