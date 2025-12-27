from flask import Blueprint, request, jsonify
from models import Item, Claim, User, db
from ai_models.ai_service import (
    analyze_image,
    generate_verification_question,
    find_matches_with_images,
)
import os
import json
import traceback
import base64
import jwt
from datetime import datetime
from werkzeug.utils import secure_filename
import cloudinary
import cloudinary.uploader
from routes.auth import SECRET_KEY
from PIL import Image
import io

items_bp = Blueprint("items", __name__)


@items_bp.route("/<int:item_id>/poster", methods=["GET"])
def generate_poster(item_id):
    """
    Generates a printable HTML poster for a Lost or Found item.
    """
    try:
        item = Item.query.get_or_404(item_id)
        
        # Determine Base URL
        # Priority: Referer (User's browser) > Vercel Env > Request Host
        # Using Referer is best because it guarantees we send them back to the exact domain they came from
        referer = request.headers.get("Referer")
        if referer:
            # Extract root (https://my-app.vercel.app) from Referer (https://my-app.vercel.app/item/1)
            from urllib.parse import urlparse
            parsed = urlparse(referer)
            base_url = f"{parsed.scheme}://{parsed.netloc}"
        elif os.getenv("VERCEL_URL"):
             base_url = f"https://{os.getenv('VERCEL_URL')}"
        elif request.host_url.startswith("http://127.0.0.1") or request.host_url.startswith("http://localhost"):
             base_url = "http://localhost:5173" # Default Vite Localhost
        else:
             base_url = "https://campus-find.vercel.app" 

        item_url = f"{base_url}/item/{item.id}"
        
        # QR Code API
        qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=400x400&data={item_url}"

        # Safe Date Handling
        date_str = "Unknown Date"
        if item.date_lost:
            date_str = item.date_lost.strftime('%B %d, %Y')
            
        # Safe Image Handling
        image_src = item.image_url
        if not image_src:
            image_src = "https://placehold.co/600x400?text=No+Image+Available"
        
        # Ensure image is HTTPS to avoid mixed content issues
        if image_src and image_src.startswith("http://"):
            image_src = image_src.replace("http://", "https://")

        # -------------------------
        # MODERN POSTER TEMPLATE
        # -------------------------
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>{item.type.upper()} ITEM - {item.description}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Inter:wght@400;600&display=swap');
                
                :root {{
                    --primary: {'#ef4444' if item.type == 'lost' else '#22c55e'}; /* Red for Lost, Green for Found */
                    --text: #1f2937;
                }}

                body {{ 
                    font-family: 'Inter', sans-serif; 
                    margin: 0; 
                    padding: 0;
                    color: var(--text);
                    text-align: center;
                    background: white;
                }}

                .page-container {{
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 40px;
                    border: 0px solid black; /* No border for print */
                }}

                /* HUGE HEADER */
                .header-banner {{
                    background: var(--primary);
                    color: white;
                    font-family: 'Oswald', sans-serif;
                    font-size: 8rem;
                    line-height: 1;
                    padding: 20px 0;
                    text-transform: uppercase;
                    letter-spacing: 5px;
                    margin-bottom: 20px;
                    -webkit-print-color-adjust: exact;
                }}

                .item-title {{
                    font-size: 3rem;
                    font-weight: 700;
                    margin: 20px 0;
                    text-transform: uppercase;
                    line-height: 1.2;
                }}

                /* IMAGE BOX */
                .image-box {{
                    width: 100%;
                    height: 500px;
                    background: #f3f4f6;
                    border: 4px solid black;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    margin-bottom: 30px;
                }}
                
                .item-img {{
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }}

                /* DETAILS */
                .details-grid {{
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    text-align: left;
                    font-size: 1.5rem;
                    margin-bottom: 40px;
                    border-top: 2px solid #ddd;
                    border-bottom: 2px solid #ddd;
                    padding: 20px 0;
                }}

                .detail-row {{ margin-bottom: 10px; }}
                .label {{ font-weight: 700; color: #555; }}

                /* QR SECTION */
                .call-to-action {{
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 30px;
                    background: #f9fafb;
                    padding: 30px;
                    border-radius: 20px;
                    border: 2px dashed #ccc;
                }}

                .qr-img {{ width: 180px; height: 180px; mix-blend-mode: multiply; }}
                
                .cta-text {{
                    text-align: left;
                }}
                
                .cta-main {{ font-size: 2rem; font-weight: 900; line-height: 1.1; margin-bottom: 10px; }}
                .cta-sub {{ font-size: 1.2rem; color: #666; }}

                .footer {{
                    margin-top: 50px;
                    font-size: 0.9rem;
                    color: #999;
                }}

                /* PRINT RESET */
                @media print {{
                    @page {{ margin: 0.5cm; }}
                    body {{ -webkit-print-color-adjust: exact; }}
                    .page-container {{ width: 100%; max-width: none; padding: 0; }}
                    .header-banner {{ font-size: 6rem; }} /* Slightly smaller for fit */
                }}
            </style>
        </head>
        <body onload="setTimeout(() => window.print(), 2500)"> <!-- Timeout allows image to load -->
            
            <div class="header-banner">
                {item.type}
            </div>

            <div class="page-container">
                <div class="item-title">
                    {item.description}
                </div>
                
                <div class="image-box">
                    <img src="{image_src}" class="item-img" onerror="this.src='https://placehold.co/600x400?text=Image+Not+Found'"/>
                </div>

                <div class="details-grid">
                    <div>
                        <div class="detail-row"><span class="label">📅 DATE:</span> {date_str}</div>
                        <div class="detail-row"><span class="label">📍 LOCATION:</span> {item.location}</div>
                    </div>
                    <div>
                        <div class="detail-row"><span class="label">🎨 COLOR:</span> {item.color or 'N/A'}</div>
                        <div class="detail-row"><span class="label">🏷️ CATEGORY:</span> {item.category or 'N/A'}</div>
                    </div>
                </div>

                <div class="call-to-action">
                    <img src="{qr_url}" class="qr-img" />
                    <div class="cta-text">
                        <div class="cta-main">HAVE YOU SEEN THIS?</div>
                        <div class="cta-sub">Scan to view details or contact the owner securely.</div>
                    </div>
                </div>

                <div class="footer">
                    Generated by CampusFind • The Quickest Way to Find Lost Items on Campus
                </div>
            </div>
        </body>
        </html>
        """
        return html
    except Exception as e:
        print(f"Poster Generation Error: {e}")
        import traceback
        traceback.print_exc()
        return f"<h3>Error generating poster: {str(e)}</h3>", 500

# Cloudinary Configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)


@items_bp.route("/", methods=["POST"])
def create_item():
    """
    Report a new Lost or Found item.
    - Uploads image
    - Runs AI analysis (OpenAI Vision) to auto-tag (category, color, etc.)
    - Stores outcome in DB
    """

    # print("DEBUG: Entered create_item")
    try:
        # 1. Handle Image Upload
        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        file = request.files["image"]
        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400

        # ... (Processing Base64 and Image) ...
        # Process Image for DB (Base64)

        file_content = file.read()
        
        # --- Image Compression ---
        # Open image using Pillow
        img = Image.open(io.BytesIO(file_content))
        
        # Convert to RGB (in case of RGBA/PNG)
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        # Resize if too large (Max dimension 1024px)
        max_size = (1024, 1024)
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Save to buffer with compression
        compressed_buffer = io.BytesIO()
        img.save(compressed_buffer, format="JPEG", quality=70, optimize=True)
        compressed_buffer.seek(0)
        
        # Update file_content to use the compressed version
        compressed_content = compressed_buffer.getvalue()
        
        # Generate Base64 for AI (using compressed image is fine and faster)
        base64_data = base64.b64encode(compressed_content).decode("utf-8")
        mime_type = file.content_type or "image/jpeg"
        image_data_uri = f"data:{mime_type};base64,{base64_data}"

        # Local Backup for dev/debugging
        if os.getenv("VERCEL") or os.getenv("FLASK_ENV") == "production":
            upload_folder = os.path.join("/tmp", "uploads")
        else:
            upload_folder = os.path.join(
                os.path.dirname(os.path.dirname(__file__)), "uploads"
            )

        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"{timestamp}_{secure_filename(file.filename)}"
        filepath = os.path.join(upload_folder, filename)

        with open(filepath, "wb") as f:
            f.write(file_content)

        # Cloudinary Upload
        try:
            print("DEBUG: Uploading to Cloudinary...")
            # We can upload the file_content (bytes) directly
            # Use compressed_content to save bandwidth/storage
            upload_result = cloudinary.uploader.upload(
                compressed_content, 
                folder="campusfind",
                resource_type="image"
            )
            image_url = upload_result.get("secure_url")
            print(f"DEBUG: Cloudinary Upload Success: {image_url}")
        except Exception as e:
            print(f"ERROR: Cloudinary Upload Failed: {e}")
            return jsonify({"error": f"Image upload failed: {str(e)}"}), 500

        # 2. AI Analysis (Auto-Tagging)
        print("DEBUG: Starting AI analysis...")
        try:
            data = request.form
            # Pass the data URI directly to avoid disk dependency issues on serverless
            analysis = analyze_image(image_data_uri, data.get("description", ""))
            print(f"DEBUG: AI Analysis result: {analysis}")
        except Exception as ai_e:
            print(f"DEBUG: AI Analysis Failed: {ai_e}")
            # Fallback to defaults if AI fails (e.g., quotas, network)
            analysis = {
                "category": "General Item",
                "color": "See image",
                "brand": None,
                "description": data.get("description", "Check image for details"),
                "distinctive_features": [],
            }

        # 2a. Handle Manual Tags (User Overrides)
        manual_tags_str = data.get("manual_tags", "[]")
        try:
            manual_tags = json.loads(manual_tags_str)
            if not isinstance(manual_tags, list):
                manual_tags = []
        except:
            manual_tags = []

        # Merge AI features and manual tags
        ai_features = analysis.get("distinctive_features", [])
        all_features = list(set(ai_features + manual_tags))
        analysis["distinctive_features"] = all_features

        # 3. Get User ID from Token
        token = request.headers.get("Authorization")
        if not token or not token.startswith("Bearer "):
            return jsonify({"error": "Unauthorized: Missing or invalid token"}), 401

        try:
            token_str = token.split(" ")[1]
            data = jwt.decode(token_str, SECRET_KEY, algorithms=["HS256"])
            user_id = data["user_id"]
        except Exception as e:
            return jsonify({"error": "Unauthorized: Invalid token"}), 401

        # 4. Create Item Record
        data = request.form

        final_category = (
            data.get("category") if data.get("category") else analysis.get("category")
        )
        final_color = data.get("color") if data.get("color") else analysis.get("color")
        final_brand = data.get("brand") if data.get("brand") else analysis.get("brand")

        new_item = Item(
            user_id=user_id,
            type=data.get("type", "lost"),
            description=analysis.get(
                "description", data.get("description", "No description")
            ),
            location=data.get("location", "Unknown"),
            date_lost=datetime.utcnow(),
            image_url=filename,
            image_data=image_url, # Store Cloudinary URL
            category=final_category,
            color=final_color,
            brand=final_brand,
            distinctive_features=json.dumps(analysis.get("distinctive_features", [])),
            contact_info=data.get("contact_info"),
        )

        # 5. Generate Verification Question if it's a 'Found' item
        # This helps the founder verify if a claimant is the true owner
        if new_item.type == "found":
            try:
                distinctive_features = analysis.get("distinctive_features", [])
                vq = generate_verification_question(
                    new_item.description, distinctive_features
                )
                new_item.verification_question = vq.get("question")
                new_item.verification_answer_type = vq.get("expected_answer_type")
            except Exception as vq_e:
                print(f"DEBUG: VQ Gen Failed: {vq_e}")

        # Gamification: Award 5 Points for Reporting (ONLY for FOUND items)
        # We reward people for helping others, not for losing things!
        if new_item.type == "found":
            try:

                user = User.query.get(user_id)
                if user:
                    user.trust_score = getattr(user, "trust_score", 0) + 5
            except Exception as xp_e:
                print(f"XP Update Failed: {xp_e}")

        db.session.add(new_item)
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Item reported successfully",
                    "item": {
                        "id": new_item.id,
                        "description": new_item.description,
                        "image_url": new_item.image_data,
                        "ai_tags": {
                            "category": new_item.category,
                            "color": new_item.color,
                            "brand": new_item.brand,
                        },
                    },
                }
            ),
            201,
        )

    except Exception as e:
        print(f"DEBUG: CRITICAL ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@items_bp.route("/", methods=["GET"])
def get_items():
    """
    Get main feed of items.
    Supports filtering by type (lost/found/all), search queries, and status.
    """
    try:
        type_filter = request.args.get("type")
        search_query = request.args.get("q")

        # Start query
        query = Item.query

        # FILTER: Exclude 'claimed' items from the public feed to keep it fresh
        # Unless specifically requested (e.g. for Stats page)
        if request.args.get("include_claimed") != "true" and type_filter != "all":
            query = query.filter(Item.status != "claimed")

        if type_filter and type_filter != "all":
            query = query.filter_by(type=type_filter)

        if search_query:
            search = f"%{search_query}%"
            query = query.filter(
                (Item.description.ilike(search))
                | (Item.category.ilike(search))
                | (Item.brand.ilike(search))
                | (Item.location.ilike(search))
            )

        # Sort by newest first
        items = query.order_by(Item.date_lost.desc()).all()

        result = []
        for item in items:
            img_src = item.image_data
            if not img_src and item.image_url:
                img_src = f"/uploads/{os.path.basename(item.image_url)}"

            result.append(
                {
                    "id": item.id,
                    "type": item.type,
                    "description": item.description,
                    "location": item.location,
                    "date_lost": item.date_lost.strftime("%Y-%m-%d %H:%M"),
                    "image_url": img_src,
                    "category": item.category,
                    "color": item.color,
                    "brand": item.brand,
                    "distinctive_features": (
                        json.loads(item.distinctive_features)
                        if item.distinctive_features
                        else []
                    ),
                    "status": item.status,
                }
            )

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@items_bp.route("/my", methods=["GET"])
def get_my_items():
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        return jsonify({"error": "Unauthorized"}), 401

    try:

        # from models import Claim # Imported at top level now

        token = token.split(" ")[1]
        data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = data["user_id"]

        # 1. Items uploaded by me
        my_uploads = Item.query.filter_by(user_id=user_id).all()

        # 2. Items claimed by me (where I am the claimant/finder/respondent)
        my_claims = Claim.query.filter_by(claimant_id=user_id).all()
        my_claimed_items = [c.item for c in my_claims]

        # Combine unique items
        all_items_map = {}

        for item in my_uploads:
            all_items_map[item.id] = item

        for item in my_claimed_items:
            all_items_map[item.id] = item

        # Convert to list and sort
        combined_items = list(all_items_map.values())
        combined_items.sort(key=lambda x: x.date_lost, reverse=True)

        result = []
        for item in combined_items:
            img_src = item.image_data
            if not img_src and item.image_url:
                img_src = f"/uploads/{os.path.basename(item.image_url)}"

            result.append(
                {
                    "id": item.id,
                    "type": item.type,
                    "description": item.description,
                    "location": item.location,
                    "date_lost": item.date_lost.strftime("%Y-%m-%d %H:%M"),
                    "image_url": img_src,
                    "category": item.category,
                    "color": item.color,
                    "brand": item.brand,
                    "distinctive_features": (
                        json.loads(item.distinctive_features)
                        if item.distinctive_features
                        else []
                    ),
                    "status": item.status,
                }
            )
        return jsonify(result), 200
    except Exception as e:
        print(f"My Items Error: {e}")
        return jsonify({"error": str(e)}), 401


@items_bp.route("/<int:id>", methods=["GET"])
def get_item(id):
    """Get single item details"""
    try:
        item = Item.query.get_or_404(id)

        img_src = item.image_data
        if not img_src and item.image_url:
            img_src = f"/uploads/{os.path.basename(item.image_url)}"

        return (
            jsonify(
                {
                    "id": item.id,
                    "type": item.type,
                    "description": item.description,
                    "location": item.location,
                    "date_lost": item.date_lost.strftime("%Y-%m-%d %H:%M"),
                    "image_url": img_src,
                    "category": item.category,
                    "color": item.color,
                    "brand": item.brand,
                    "distinctive_features": (
                        json.loads(item.distinctive_features)
                        if item.distinctive_features
                        else []
                    ),
                    "status": item.status,
                    "user_id": item.user_id,
                    "reporter": {
                        "name": item.user.name,
                        "email": item.user.email,
                        "phone": getattr(item.user, "phone", None),
                        "profile_photo": getattr(item.user, "profile_photo", None),
                        "contact_info": item.contact_info,
                    },
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 404


@items_bp.route("/<int:id>/analyze", methods=["POST"])
def reanalyze_item(id):
    """
    Manually trigger AI analysis for an existing item.
    Useful for items that failed analysis or were uploaded before AI fixes.
    """
    try:

        item = Item.query.get_or_404(id)

        if not item.image_url:
            return jsonify({"error": "Item has no image"}), 400

        # Get full path
        img_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "uploads",
            os.path.basename(item.image_url),
        )

        if not os.path.exists(img_path):
            return jsonify({"error": "Image file not found on server"}), 404

        # Run Analysis
        analysis = analyze_image(img_path, item.description)

        # Update Item
        item.category = analysis.get("category")
        item.color = analysis.get("color")
        item.brand = analysis.get("brand")
        item.distinctive_features = json.dumps(analysis.get("distinctive_features", []))

        # Smart Description Update: Only update if AI gives a better description
        ai_desc = analysis.get("description")
        if ai_desc and ai_desc != "Check image for details":
            # We might keep user description but maybe append AI notes?
            # For now, let's trust the user's title unless it's generic
            pass

        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Analysis updated",
                    "tags": {
                        "category": item.category,
                        "color": item.color,
                        "features": json.loads(item.distinctive_features),
                    },
                }
            ),
            200,
        )

    except Exception as e:
        print(f"Re-analysis failed: {e}")
        return jsonify({"error": str(e)}), 500


@items_bp.route("/match/<int:id>", methods=["GET"])
def get_matches(id):
    """
    🎯 FLAGSHIP FEATURE: Get AI-powered image matches for an item
    Compares the item against opposite-type items using Gemini Vision
    """
    try:

        # Get source item
        source_item = Item.query.get_or_404(id)

        # Get opposite type items that are unresolved
        opposite_type = "found" if source_item.type == "lost" else "lost"
        candidates = Item.query.filter_by(type=opposite_type, status="unresolved").all()

        if not candidates:
            return jsonify([]), 200

        matches = []

        # 1. Try AI Matching
        try:
            matches = find_matches_with_images(source_item, candidates)
        except Exception as ai_e:
            print(f"AI Match Failed (Rate Limit?): {ai_e}")
            matches = []  # Fallback

        # 2. Fallback: DB Pattern Matching if AI returned 0 matches
        if len(matches) == 0:
            print("Using DB Fallback for Matching...")
            fallback_matches = []
            for cand in candidates:
                score = 0
                reasons = []

                # Check Category
                if source_item.category and cand.category:
                    if source_item.category.lower() == cand.category.lower():
                        score += 40
                        reasons.append(f"Same category ({source_item.category})")

                # Check Color
                if source_item.color and cand.color:
                    if (
                        source_item.color.lower() in cand.color.lower()
                        or cand.color.lower() in source_item.color.lower()
                    ):
                        score += 30
                        reasons.append(f"Similar color ({source_item.color})")

                # Check Brand
                if source_item.brand and cand.brand:
                    if source_item.brand.lower() in cand.brand.lower():
                        score += 20
                        reasons.append(f"Same brand ({source_item.brand})")

                if score >= 30:  # Threshold
                    fallback_matches.append(
                        {
                            "item": {
                                "id": cand.id,
                                "description": cand.description,
                                "image_url": (
                                    cand.image_data
                                    if cand.image_data
                                    else (
                                        f"/uploads/{os.path.basename(cand.image_url)}"
                                        if cand.image_url
                                        else None
                                    )
                                ),
                            },
                            "confidence": score,
                            "reasoning": "Basic Feature Match: " + ", ".join(reasons),
                        }
                    )

            # Sort by score
            matches = sorted(
                fallback_matches, key=lambda x: x["confidence"], reverse=True
            )[:5]

        return jsonify(matches), 200
    except Exception as e:
        print(f"Error in get_matches: {e}")
        return jsonify({"error": str(e)}), 500
