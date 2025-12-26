import os
import json
import base64
from openai import OpenAI

# Configure OpenAI
# We'll initialize client lazily to ensure environment variables are loaded
client = None

def get_client():
    global client
    if not client:
        api_key = os.getenv('OPENAI_API_KEY')
        if api_key:
            client = OpenAI(api_key=api_key)
            print(f"DEBUG: Initialized OpenAI Client with key ending in ...{api_key[-4:]}")
        else:
            print("ERROR: No OPENAI_API_KEY found in environment.")
    return client


def encode_image(image_input):
    """
    Handles both file paths and raw base64 data strings.
    Returns: pure base64 string (without data:image/... prefix)
    """
    if not image_input:
        return ""
    
    # If it's already a data URI or base64 string
    if image_input.startswith("data:"):
        return image_input.split(",")[1]
    if len(image_input) > 1000 and os.path.sep not in image_input:
        return image_input # Assume it's raw base64
        
    # If it's a file path
    if os.path.exists(image_input):
        with open(image_input, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    return ""

def analyze_image(image_path_or_data, user_description=""):
    """
    Analyzes an image using OpenAI GPT-4o-mini to extract details.
    Accepts: File path OR Base64 Data URI
    """
    cli = get_client()
    if not cli:
        print("❌ AI Service Error: Client could not be initialized.")
        return _fallback_result(user_description, "OpenAI Client not initialized")

    try:
        # Check if it's base64 data URI
        
        print(f"DEBUG: Starting analysis. Input length: {len(image_path_or_data)}")
        
        base64_image = encode_image(image_path_or_data)
        
        prompt = """
        Analyze this image of a lost/found item. 
        Return ONLY a raw JSON object (no markdown formatting) with the following fields:
        - category: (e.g., Electronics, Clothing, Bottle, Keys)
        - color: (Dominant color)
        - brand: (Visible brand name or null)
        - description: (A concise 1-sentence visual description)
        - distinctive_features: (Array of strings listing unique scratches, stickers, or identifiers)
        """

        response = cli.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            },
                        },
                    ],
                }
            ],
            max_tokens=300,
            response_format={ "type": "json_object" }
        )

        content = response.choices[0].message.content
        print(f"DEBUG: Analysis success: {content}")
        return json.loads(content)

    except Exception as e:
        print(f"❌ OPENAI ANALYSIS FAILED: {e}")
        # Re-raise rate limit errors so frontend knows to tell user to wait
        if "429" in str(e):
            raise e
        return _fallback_result(user_description, str(e))

def _fallback_result(user_description, error_msg=""):
    return {
        "category": "General Item", 
        "color": "See image", 
        "brand": None, 
        "description": user_description if user_description else "Check image for details",
        "distinctive_features": []
    }

def find_matches_with_images(source_item, candidates):
    """
    Compares source item's image against candidate images for visual similarity using GPT-4o-mini.
    Supports file paths and DB-stored base64.
    """
    cli = get_client()
    if not cli or not candidates:
        return []

    try:
        matches = []
        
        # Get source image (prefer image_data from DB over file path)
        if getattr(source_item, 'image_data', None):
            source_base64 = encode_image(source_item.image_data)
        elif source_item.image_url:
            source_path = _get_full_path(source_item.image_url)
            source_base64 = encode_image(source_path)
        else:
            return [] # No image source
            
        if not source_base64:
            return []

        # Limit comparisons to save tokens and avoid Rate Limits (3 RPM on free tier)
        # We will only compare top 2 candidates
        import time
        
        for candidate in candidates[:2]:
            try:
                print(f"DEBUG: Comparing against Item {candidate.id}")
                
                # Get candidate image (prefer DB data)
                cand_base64 = ""
                if getattr(candidate, 'image_data', None):
                    cand_base64 = encode_image(candidate.image_data)
                elif candidate.image_url:
                    cand_path = _get_full_path(candidate.image_url)
                    cand_base64 = encode_image(cand_path)
                    
                if not cand_base64:
                    continue
                
                prompt = f"""
                Compare these two items.
                Item 1: {source_item.description}
                Item 2: {candidate.description}
                
                Are they the SAME physical object? 
                Return JSON: {{ "is_match": boolean, "confidence": 0-100, "reasoning": "string" }}
                """
                
                try:
                    response = cli.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": prompt},
                                    {
                                        "type": "image_url",
                                        "image_url": {"url": f"data:image/jpeg;base64,{source_base64}"}
                                    },
                                    {
                                        "type": "image_url",
                                        "image_url": {"url": f"data:image/jpeg;base64,{cand_base64}"}
                                    },
                                ],
                            }
                        ],
                        max_tokens=300,
                        response_format={ "type": "json_object" }
                    )
                    
                    result = json.loads(response.choices[0].message.content)
                    print(f"DEBUG: Comparison Result for {candidate.id}: {result}")
                    
                    if result.get('is_match') and result.get('confidence', 0) > 60:
                        matches.append({
                            "id": candidate.id,
                            "confidence": result['confidence'],
                            "reasoning": result['reasoning'],
                            "item": {
                                "id": candidate.id,
                                "description": candidate.description,
                                "location": candidate.location,
                                "image_url": candidate.image_url,
                                "category": candidate.category,
                                "color": candidate.color
                            }
                        })
                except Exception as api_e:
                     if "429" in str(api_e):
                         print("⚠️ OpenAI Rate Limit Hit. Skipping remaining matches.")
                         break
                     raise api_e

                # Sleep to respect nice-tier limits
                time.sleep(1)
                
            except Exception as inner_e:
                print(f"Error comparing with item {candidate.id}: {inner_e}")
                continue
        
        matches.sort(key=lambda x: x['confidence'], reverse=True)
        return matches

    except Exception as e:
        print(f"Error in find_matches_with_images: {e}")
        return []

def _get_full_path(relative_path):
    if not relative_path: return ""
    if relative_path.startswith('/'):
        return os.path.join(os.path.dirname(os.path.dirname(__file__)), relative_path.lstrip('/'))
    # If it's just filename
    # If it's just filename
    if os.getenv('VERCEL') or os.getenv('FLASK_ENV') == 'production':
        return os.path.join('/tmp', 'uploads', os.path.basename(relative_path))
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', os.path.basename(relative_path))

def generate_verification_question(item_description, distinctive_features):
    """
    Generates a security question to verify ownership of a Found item.
    Uses GPT-4o-mini to create a question based on hidden details.
    """
    cli = get_client()
    if not cli:
        return {"question": "Can you describe a unique feature of this item?", "expected_answer_type": "text"}

    try:
        features_str = ", ".join(distinctive_features) if distinctive_features else "No specific features listed"
        
        prompt = f"""
        I have found an item described as: "{item_description}".
        It has these distinctive features: {features_str}.
        
        Generate a "Verification Question" that the true owner should be able to answer, but a stranger wouldn't know from just seeing a generic photo.
        Focus on specific details like brands, scratches, wallpapers (if phone), or contents (if wallet).
        
        Return JSON: {{ "question": "string", "expected_answer_type": "text" }}
        """

        response = cli.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_tokens=100,
            response_format={ "type": "json_object" }
        )
        
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error generating verification question: {e}")
        return {"question": "Please describe any unique markings on this item.", "expected_answer_type": "text"}
