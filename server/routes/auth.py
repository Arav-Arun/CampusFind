from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from models import db, User
import os
import re
from functools import wraps

auth_bp = Blueprint('auth', __name__)

SECRET_KEY = os.getenv('SECRET_KEY', 'dev_secret_key_change_me')

# --- Helper Decorator ---
# Used to protect routes that need authentication
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return jsonify({'message': 'Authentication Token is missing!'}), 401
        try:
            token = token.split(' ')[1]
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except jwt.ExpiredSignatureError:
            print("DEBUG: Token Expired")
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError as e:
            print(f"DEBUG: Invalid Token Error: {e}")
            return jsonify({'message': 'Token is invalid!'}), 401
        except Exception as e:
            print(f"DEBUG: Token Auth Error: {e}")
            return jsonify({'message': 'Token is invalid!'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# --- Routes ---

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register a new user with Email/Password.
    Enforces password strength (Upper, Number, Special Char).
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"message": "No JSON payload received"}), 400
        
        email = data.get('email')
        password = data.get('password')
        name = data.get('name')
        phone = data.get('phone')

        if not email or not password or not phone:
             return jsonify({"message": "Email, password, and phone are required"}), 400
        
        # Security: Enforce strong passwords to protect user accounts
        password_regex = r'^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$'
        if not re.match(password_regex, password):
            return jsonify({
                "message": "Password must be at least 6 characters long and contain at least one uppercase letter, one number, and one special character."
            }), 400
        
        if User.query.filter_by(email=email).first():
            return jsonify({"message": "Email already registered"}), 400
            
        hashed_password = generate_password_hash(password)
        new_user = User(
            email=email,
            name=name,
            phone=phone,
            password_hash=hashed_password,
            role='student'
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({"message": "User created successfully"}), 201
    except Exception as e:
        print(f"CRITICAL REGISTER ERROR: {e}")
        return jsonify({"message": f"Server Error: {str(e)}"}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Authenticate user and return JWT.
    Handles checks for Google-only accounts to prevent mixed-auth confusion.
    """
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()
    
    # UX: Explicitly tell users if they should sign in with Google instead
    if user and user.google_id:
        return jsonify({"message": "This email is signed up via Google. Please use 'Sign in with Google'."}), 400

    if not user:
        return jsonify({"message": "User with this email does not exist."}), 404
        
    if not check_password_hash(user.password_hash, data.get('password')):
        return jsonify({"message": "Incorrect password. Please try again."}), 401
        
    # Generate Token (Valid for 24 hours)
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
            "role": user.role
        }
    }), 200

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """Verify token and get current user details."""
    token = request.headers.get('Authorization')
    if not token or not token.startswith('Bearer '):
        return jsonify({"message": "Missing token"}), 401
        
    try:
        token = token.split(' ')[1]
        data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user = User.query.get(data['user_id'])
        if not user:
            return jsonify({"message": "User not found"}), 404
            
        # Calculate Gamification Stats
        items_reported = len(user.items)
        
        # 1. Items I reported that got resolved
        my_reported_resolved = sum(1 for item in user.items if item.status in ['claimed', 'matched', 'completed'])
        
        # 2. Items I found (I claimed and completed)
        my_found_resolved = sum(1 for claim in user.claims if claim.status == 'completed')
        
        items_recovered = my_reported_resolved + my_found_resolved
        
        # Calculate Trust Score dynamically (or rely on DB field if updated by claims)
        # For now, let's ensure it reflects the DB field which should be updated on claim completion
        trust_score = getattr(user, 'trust_score', 0)

        return jsonify({
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "phone": user.phone,
                "bio": user.bio,
                "profile_photo": user.profile_photo,
                "trust_score": trust_score,
                "stats": {
                    "reported": items_reported,
                    "recovered": items_recovered
                }
            }
        }), 200
    except Exception as e:
        return jsonify({"message": "Invalid token"}), 401

@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    """Update user profile fields."""
    data = request.get_json()
    
    if 'name' in data:
        current_user.name = data['name']
    if 'phone' in data:
        current_user.phone = data['phone']
    if 'bio' in data:
        current_user.bio = data['bio']
    if 'profile_photo' in data:
        current_user.profile_photo = data['profile_photo']
        
    db.session.commit()
    
    return jsonify({
        "message": "Profile updated",
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
            "phone": current_user.phone,
            "bio": current_user.bio,
            "profile_photo": current_user.profile_photo,
            "trust_score": getattr(current_user, 'trust_score', 0)
        }
    }), 200

@auth_bp.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    """
    Get top 5 trusted users based on 'trust_score'.
    Used for the gamification widget on the dashboard.
    """
    try:
        users = User.query.order_by(User.trust_score.desc()).limit(5).all()
    except Exception:
        # Fallback for empty DB or migration issues
        return jsonify([]), 200
        
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "name": u.name,
            "trust_score": u.trust_score or 0,
            "profile_photo": u.profile_photo
        })
    return jsonify(result), 200
