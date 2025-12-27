from flask import Blueprint, request, jsonify
from models import db, Claim, Item, User
from routes.auth import token_required
from datetime import datetime
import json

claims_bp = Blueprint("claims", __name__)


@claims_bp.route("/", methods=["POST"])
@token_required
def create_claim(current_user):
    """
    Submit a claim for an item.
    - Prevents duplicate claims.
    - Sends Push Notification (FCM) to the item's original reporter.
    """
    data = request.get_json()
    item_id = data.get("item_id")
    message = data.get("message", "")

    if not item_id:
        return jsonify({"error": "Item ID required"}), 400

    item = Item.query.get_or_404(item_id)

    # Validation: Prevent double-claiming
    existing = Claim.query.filter_by(
        item_id=item_id, claimant_id=current_user.id
    ).first()
    if existing:
        return jsonify({"error": "You have already claimed this item."}), 400

    claim = Claim(
        item_id=item_id, claimant_id=current_user.id, message=message, status="pending"
    )

    db.session.add(claim)
    db.session.commit()

    # Notify Item Owner (Finder) via Firebase
    try:
        from firebase_admin import messaging

        owner = User.query.get(item.user_id)
        if owner and owner.fcm_token:
            msg = messaging.Message(
                notification=messaging.Notification(
                    title="New Claim Request",
                    body=f"Someone claimed your found item: {item.description}",
                ),
                token=owner.fcm_token,
                data={"click_action": f"/item/{item.id}"},
            )
            response = messaging.send(msg)
            print(f"DEBUG: Sent FCM to Owner: {response}")
    except Exception as e:
        # Don't fail the request if notification fails
        print(f"WARNING: FCM Send Failed: {e}")

    return (
        jsonify({"message": "Claim submitted successfully", "claim_id": claim.id}),
        201,
    )





@claims_bp.route("/item/<int:item_id>", methods=["GET"])
@token_required
def get_claims_for_item(current_user, item_id):
    """
    Get claim status for an item.
    - If user is the Finder (Reporter): Returns ALL claims for review.
    - If user is a Claimant: Returns ONLY their specific claim status.
    """
    item = Item.query.get_or_404(item_id)

    # Strategy 1: I am the Finder -> Show me everyone who claimed it
    if item.user_id == current_user.id:
        claims = Claim.query.filter_by(item_id=item_id).all()
        result = []
        for c in claims:
            result.append(
                {
                    "id": c.id,
                    "claimant": {
                        "id": c.claimant.id,
                        "name": c.claimant.name,
                        "email": c.claimant.email,
                        "profile_photo": c.claimant.profile_photo,
                        "phone": c.claimant.phone,
                    },
                    "message": c.message,
                    "status": c.status,
                    "timestamp": c.timestamp.isoformat(),
                    "meeting_time": (
                        c.meeting_time.isoformat() if c.meeting_time else None
                    ),
                    "meeting_location": c.meeting_location,
                }
            )
        return jsonify(result), 200

    # Strategy 2: I am a regular user -> Show me my status
    my_claim = Claim.query.filter_by(
        item_id=item_id, claimant_id=current_user.id
    ).first()
    if my_claim:
        return (
            jsonify(
                [
                    {
                        "id": my_claim.id,
                        "status": my_claim.status,
                        "message": my_claim.message,
                        "response_message": my_claim.response_message,
                        "meeting_time": (
                            my_claim.meeting_time.isoformat()
                            if my_claim.meeting_time
                            else None
                        ),
                        "meeting_location": my_claim.meeting_location,
                        "qr_code": my_claim.qr_code,
                    }
                ]
            ),
            200,
        )

    return jsonify([]), 200


@claims_bp.route("/<int:claim_id>/respond", methods=["POST"])
@token_required
def respond_to_claim(current_user, claim_id):
    """
    Finder accepts or rejects a claim.
    - On Accept: Generates a QR Code for handover.
    - On Reject: Updates status.
    - Notifies claimant via push notification.
    """
    data = request.get_json()
    action = data.get("action")  # 'accept' or 'reject'
    response_msg = data.get("response_message", "")

    claim = Claim.query.get_or_404(claim_id)
    item = Item.query.get(claim.item_id)

    # Security: Only the item reporter can decide
    if item.user_id != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403

    if action == "reject":
        claim.status = "rejected"
        claim.response_message = response_msg
        db.session.commit()

        # Notify Claimant
        try:
            from firebase_admin import messaging

            claimant = User.query.get(claim.claimant_id)
            if claimant and claimant.fcm_token:
                msg = messaging.Message(
                    notification=messaging.Notification(
                        title="Claim Rejected ❌",
                        body=f"Your claim for '{item.description}' was rejected.",
                    ),
                    token=claimant.fcm_token,
                )
                messaging.send(msg)
        except Exception as e:
            print(f"WARNING: FCM Send Failed: {e}")

        return jsonify({"message": "Claim rejected"}), 200

    elif action == "accept":
        claim.status = "accepted"
        claim.response_message = response_msg

        # Set Meeting Details
        meeting_loc = data.get("meeting_location")
        meeting_time_str = data.get("meeting_time")  # Expect ISO string

        if not meeting_loc or not meeting_time_str:
            return (
                jsonify({"error": "Meeting location and time required for acceptance"}),
                400,
            )

        claim.meeting_location = meeting_loc
        try:
            # handle simple ISO format or standard JS toISOString
            claim.meeting_time = datetime.fromisoformat(
                meeting_time_str.replace("Z", "+00:00")
            )
        except:
            return jsonify({"error": "Invalid date format"}), 400

        # Generate 6-Digit Verification Code
        import random

        code = f"{random.randint(100000, 999999)}"
        claim.qr_code = code

        db.session.commit()

        # Notify Claimant
        try:
            from firebase_admin import messaging

            claimant = User.query.get(claim.claimant_id)
            if claimant and claimant.fcm_token:
                msg = messaging.Message(
                    notification=messaging.Notification(
                        title="Claim Accepted! ✅",
                        body=f"Your claim for '{item.description}' was accepted. Check details!",
                    ),
                    token=claimant.fcm_token,
                    data={"click_action": f"/item/{item.id}"},
                )
                messaging.send(msg)
        except Exception as e:
            print(f"WARNING: FCM Send Failed: {e}")

        return (
            jsonify({"message": "Claim accepted. Code generated.", "qr_token": code}),
            200,
        )

    return jsonify({"error": "Invalid action"}), 400


@claims_bp.route("/verify", methods=["POST"])
@token_required
def verify_claim_qr(current_user):
    """
    Called when the Finder scans the Owner's QR code.
    """
    data = request.get_json()
    token = data.get("token")

    if not token:
        return jsonify({"error": "Code required"}), 400

    try:
        # Lookup claim by the 6-digit code
        # We only look for 'accepted' claims to prevent reusing old codes or completed ones
        claim = Claim.query.filter_by(qr_code=token, status="accepted").first()

        if not claim:
            return jsonify({"error": "Invalid or expired code."}), 400

        item = Item.query.get(claim.item_id)

        # Security Check: Ensure the person entering the code IS the Finder (Item Owner)
        # The Finder (who has the item) asks the Claimant for the code.
        if item.user_id != current_user.id:
            return (
                jsonify(
                    {
                        "error": "Only the original Finder (Item Uploader) can verify this claim."
                    }
                ),
                403,
            )

        if claim.status == "completed":
            return jsonify({"message": "Item already verified!", "verified": True}), 200

        # 1. Update Statuses
        claim.status = "completed"
        item.status = "claimed"  # This hides it from main feeds

        # 2. Award Points (Gamification) - ALWAYS TO THE FINDER
        points_awarded = 10
        recipient_name = "You"

        if item.type == "lost":
            # Case 1: Item was 'lost'. Uploader is Loser. Claimant is Finder.
            # Current User (Verifier) is Uploader (Loser).
            # Reward goes to Claimant (Finder).
            claim.claimant.trust_score += points_awarded
            recipient_name = claim.claimant.name

        else:
            # Case 2: Item was 'found'. Uploader is Finder. Claimant is Loser.
            # Current User (Verifier) is Uploader (Finder).
            # Reward goes to Current User (Finder).
            current_user.trust_score += points_awarded
            recipient_name = "You"

        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Item Recovery Successful!",
                    "verified": True,
                    "item_title": item.description,
                    "finder_bonus": points_awarded,
                    "rewarded_user": recipient_name,
                }
            ),
            200,
        )

    except Exception as e:
        print(f"Verification Error: {e}")
        return jsonify({"error": "Verification failed"}), 500


@claims_bp.route("/notifications/token", methods=["POST"])
@token_required
def save_fcm_token(current_user):
    """
    Save the user's FCM token for push notifications.
    """
    data = request.get_json()
    token = data.get("token")

    if not token:
        return jsonify({"error": "Token required"}), 400

    current_user.fcm_token = token
    db.session.commit()

    return jsonify({"message": "Token saved"}), 200


@claims_bp.route("/notifications/read", methods=["POST"])
@token_required
def mark_notification_read(current_user):
    """
    Mark a specific notification ID as read.
    """
    data = request.get_json()
    notif_id = data.get("id")

    if not notif_id:
        return jsonify({"error": "Notification ID required"}), 400

    try:
        read_list = (
            json.loads(current_user.read_notifications)
            if current_user.read_notifications
            else []
        )
    except:
        read_list = []

    if notif_id not in read_list:
        read_list.append(notif_id)
        current_user.read_notifications = json.dumps(read_list)
        db.session.commit()

    return jsonify({"message": "Marked as read"}), 200


@claims_bp.route("/notifications", methods=["GET"])
@token_required
def get_notifications(current_user):
    """
    Get notifications. Uses dynamic generation + persistent 'read' list.
    """
    notifications = []

    try:
        read_list = (
            json.loads(current_user.read_notifications)
            if current_user.read_notifications
            else []
        )
    except:
        read_list = []

    # 1. As Finder (Claims on my items)
    my_items = Item.query.filter_by(user_id=current_user.id).all()
    my_item_ids = [i.id for i in my_items]

    incoming_claims = (
        Claim.query.filter(Claim.item_id.in_(my_item_ids))
        .order_by(Claim.timestamp.desc())
        .all()
    )

    for c in incoming_claims:
        if c.status == "pending":
            # Unique ID for this notification state
            nid = f"claim_{c.id}_pending"
            notifications.append(
                {
                    "id": nid,
                    "text": f"New claim request for: {c.item.description}",
                    "link": f"/item/{c.item.id}",
                    "time": c.timestamp.isoformat(),
                    "read": nid in read_list,
                }
            )

    # 2. As Claimant (My claims updates)
    my_claims = Claim.query.filter_by(claimant_id=current_user.id).all()

    for c in my_claims:
        if c.status in ["accepted", "rejected", "completed"]:
            status_text = c.status
            if c.status == "completed":
                status_text = "verified & recovered"

            nid = f"claim_{c.id}_{c.status}"
            notifications.append(
                {
                    "id": nid,
                    "text": f"Your claim for '{c.item.description}' was {status_text}",
                    "link": f"/item/{c.item.id}",
                    "time": c.timestamp.isoformat(),
                    "read": nid in read_list,
                }
            )

    # Sort by time
    notifications.sort(key=lambda x: x["time"], reverse=True)

    return jsonify(notifications), 200
