import json
import os
import sys

if sys.version_info >= (3, 7):
    sys.stdout.reconfigure(encoding='utf-8')

transcript_path = r"C:\Users\AL NABAA\.gemini\antigravity\brain\2520a352-494f-4c39-83b8-e64b5a6c2745\.system_generated\logs\transcript.jsonl"
if os.path.exists(transcript_path):
    print("Found active transcript.jsonl:")
    user_requests = []
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            try:
                data = json.loads(line)
                if data.get("type") == "USER_INPUT":
                    user_requests.append(data)
            except Exception:
                pass
    print(f"Total user requests: {len(user_requests)}")
    print("\n--- LAST 10 USER REQUESTS ---")
    for req in user_requests[-10:]:
        print(f"Index {req.get('step_index')}: {req.get('content')}")
        print("-" * 50)
else:
    print("transcript.jsonl does not exist.")
