import os
from dotenv import load_dotenv

# Simulate app.py loading
base_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(base_dir, '.env')
load_dotenv(env_path)

print(f"--- Debugging Credentials ---")
print(f"Base Dir: {base_dir}")
print(f"Env Path: {env_path}")
print(f"Env Exists? {os.path.exists(env_path)}")

cred_env = os.getenv('FIREBASE_CREDENTIALS_PATH')
print(f"FIREBASE_CREDENTIALS_PATH (Raw): {cred_env}")

if cred_env:
    if not os.path.isabs(cred_env):
        resolved_path = os.path.join(base_dir, cred_env)
        print(f"Resolved Relative Path: {resolved_path}")
        print(f"File Exists at Resolved? {os.path.exists(resolved_path)}")
    else:
        print(f"Absolute Path Provided")
        print(f"File Exists? {os.path.exists(cred_env)}")
else:
    print("❌ FIREBASE_CREDENTIALS_PATH is None or Empty")

# List dir to confirm file presence
print(f"\n--- Directory Contents of {base_dir} ---")
try:
    print(os.listdir(base_dir))
except Exception as e:
    print(f"Error listing dir: {e}")
