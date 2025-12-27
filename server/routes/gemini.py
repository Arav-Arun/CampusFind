import os
import google.generativeai as genai
from flask import Blueprint, request, jsonify

gemini_bp = Blueprint('gemini_bp', __name__)

# Configure Gemini
api_key = os.getenv('GOOGLE_API_KEY')
if api_key:
    genai.configure(api_key=api_key)
else:
    print("WARNING: GOOGLE_API_KEY not found. Gemini features will fail.")

@gemini_bp.route('/draft-message', methods=['POST'])
def draft_message():
    try:
        data = request.get_json()
        item_type = data.get('item_type', 'item') # 'lost' or 'found' generally
        item_desc = data.get('item_desc', 'this item')
        
        if not api_key:
             return jsonify({"error": "Server missing API Key"}), 500

        # Construct prompt
        # Scenario: User is claiming an item (User is "Owner", Item is "Found" by someone else)
        # OR User is claiming they found an item (User is "Finder", Item is "Lost" by someone else)
        # Actually in CampusFind:
        # If Item is FOUND -> User claims "It's mine!"
        # If Item is LOST -> User claims "I found it!"
        
        prompt = ""
        if item_type == "found":
            # Item is FOUND. User says "It is mine".
            prompt = f"""
            Write a polite, short message to someone who found a "{item_desc}".
            I am the owner claiming it.
            Keep it friendly, mention I can verify details, and ask to meet up.
            Max 2 sentences. No emojis within the text, maybe one at end.
            """
        else:
            # Item is LOST. User says "I found it".
            prompt = f"""
            Write a polite, short message to someone who lost a "{item_desc}".
            I have found it.
            Keep it reassuring, confirm I have it safe, and ask to meet up.
            Max 2 sentences. No emojis within the text, maybe one at end.
            """

        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        
        return jsonify({"message": response.text.strip()})
        
    except Exception as e:
        print(f"Gemini Error: {e}")
        return jsonify({"error": str(e)}), 500
