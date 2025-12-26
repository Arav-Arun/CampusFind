import google.generativeai as genai
import os

api_key = "AIzaSyBILWRvtc3Gy97E2RHcVDBXOgdcAcA0oO8"
genai.configure(api_key=api_key)

try:
    print("Listing models...")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print("FAILED")
    print(e)
