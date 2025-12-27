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
        # Use 'gemini-2.0-flash' as it is available and supported
        model = genai.GenerativeModel('gemini-2.0-flash')
        return model, None
    except Exception as e:
        print(f"CRITICAL: Failed to configure Gemini: {e}")
        return None, f"Configuration failed: {str(e)}"

@gemini_bp.route('/draft-message', methods=['POST'])
def draft_message():
    data = request.get_json()
    item_type = data.get('item_type', 'item')
    item_desc = data.get('item_desc', 'this item')
    
    # Initialize on request
    _, error = get_gemini_model() # Just checks key existence
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

    # List of models to try in order of preference
    # The user's key seems to have access to advanced/experimental models
    # List of models to try in order of preference.
    # We fallback to older/experimental models if the primary (2.0-flash) is rate-limited.
    candidate_models = [
        'gemini-2.0-flash',        # Primary (Fastest, Smartest)
        'gemini-2.0-flash-exp',    # Fallback 1
        'gemini-2.5-flash',        # Fallback 2 (Newer, might have different quota)
        'gemini-2.0-flash-lite',   # Fallback 3 (Lighter, higher limits)
    ]
    
    last_error = None

    print(f"DEBUG: Attempting to draft message for '{item_desc}'")

    for model_name in candidate_models:
        try:
            print(f"DEBUG: Trying model '{model_name}'...")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            
            if response.text:
                print(f"DEBUG: Success with '{model_name}'")
                return jsonify({"message": response.text.strip(), "model_used": model_name})
                
        except Exception as e:
            print(f"WARNING: Model '{model_name}' failed: {e}")
            last_error = e
            # Continue to next model
            continue

    # If all failed
    error_msg = str(last_error)
    if "429" in error_msg:
        return jsonify({"error": "Gemini is busy (Rate Limit). Please try again in a minute."}), 429
    
    return jsonify({"error": f"All AI models failed. Last error: {error_msg}"}), 500
