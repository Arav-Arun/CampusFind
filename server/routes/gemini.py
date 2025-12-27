import os
import google.generativeai as genai
from flask import Blueprint, request, jsonify

gemini_bp = Blueprint('gemini_bp', __name__)

def get_gemini_model():
    """
    Lazy initialization of Gemini client.
    Checks multiple env vars for robustness.
    """
    # Try common names for the key
    api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
    
    if not api_key:
        print("CRITICAL: No Gemini/Google API Key found in environment variables.")
        return None, "Server configuration error: Missing API Key"

    try:
        genai.configure(api_key=api_key)
        # Use 'gemini-1.5-flash' as requested, fallback to 'gemini-pro' if needed in future
        model = genai.GenerativeModel('gemini-1.5-flash')
        return model, None
    except Exception as e:
        print(f"CRITICAL: Failed to configure Gemini: {e}")
        return None, f"Configuration failed: {str(e)}"

@gemini_bp.route('/draft-message', methods=['POST'])
def draft_message():
    try:
        data = request.get_json()
        item_type = data.get('item_type', 'item')
        item_desc = data.get('item_desc', 'this item')
        
        # Initialize on request (best for serverless/vercel)
        model, error = get_gemini_model()
        if error:
            return jsonify({"error": error}), 500

        prompt = ""
        if item_type == "found":
            prompt = f"""
            Write a polite, short message to someone who found a "{item_desc}".
            I am the owner claiming it.
            Keep it friendly, mention I can verify details, and ask to meet up.
            Max 2 sentences. No emojis within the text, maybe one at end.
            """
        else:
            prompt = f"""
            Write a polite, short message to someone who lost a "{item_desc}".
            I have found it.
            Keep it reassuring, confirm I have it safe, and ask to meet up.
            Max 2 sentences. No emojis within the text, maybe one at end.
            """

        print(f"DEBUG: Generating content with Gemini 1.5 Flash for {item_desc}...")
        response = model.generate_content(prompt)
        
        if not response.text:
            return jsonify({"error": "Empty response from AI"}), 500

        return jsonify({"message": response.text.strip()})
        
    except Exception as e:
        print(f"Gemini Route Error: {e}")
        # Return the actual error string to help debugging
        return jsonify({"error": str(e)}), 500
