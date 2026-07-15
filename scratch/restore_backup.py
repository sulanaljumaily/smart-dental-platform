import os
import shutil

active_pb = r"C:\Users\AL NABAA\.gemini\antigravity\conversations\2520a352-494f-4c39-83b8-e64b5a6c2745.pb"
backup_pb = r"C:\Users\AL NABAA\.gemini\antigravity-backup\conversations\2520a352-494f-4c39-83b8-e64b5a6c2745.pb"

active_brain = r"C:\Users\AL NABAA\.gemini\antigravity\brain\2520a352-494f-4c39-83b8-e64b5a6c2745"
backup_brain = r"C:\Users\AL NABAA\.gemini\antigravity-backup\brain\2520a352-494f-4c39-83b8-e64b5a6c2745"

print("Starting restoration process...")

# 1. Backing up active heavy .pb file
if os.path.exists(active_pb):
    heavy_pb = active_pb + ".heavy"
    if not os.path.exists(heavy_pb):
        print(f"Backing up heavy active PB to {heavy_pb}...")
        shutil.move(active_pb, heavy_pb)
    else:
        print(f"Removing active heavy PB {active_pb} (heavy backup already exists)...")
        os.remove(active_pb)

# 2. Backing up active heavy brain folder
if os.path.exists(active_brain):
    heavy_brain = active_brain + ".heavy"
    if not os.path.exists(heavy_brain):
        print(f"Backing up heavy active brain to {heavy_brain}...")
        shutil.move(active_brain, heavy_brain)
    else:
        print(f"Removing active heavy brain {active_brain} (heavy backup already exists)...")
        shutil.rmtree(active_brain)

# 3. Copying backup PB file
if os.path.exists(backup_pb):
    print(f"Restoring PB file from backup: {backup_pb} -> {active_pb}...")
    shutil.copy(backup_pb, active_pb)
else:
    print("Warning: Backup PB file not found!")

# 4. Copying backup brain folder
if os.path.exists(backup_brain):
    print(f"Restoring brain folder from backup: {backup_brain} -> {active_brain}...")
    shutil.copytree(backup_brain, active_brain)
    
    # 5. Restore transcript.jsonl by copying overview.txt
    logs_dir = os.path.join(active_brain, ".system_generated", "logs")
    overview_file = os.path.join(logs_dir, "overview.txt")
    transcript_file = os.path.join(logs_dir, "transcript.jsonl")
    if os.path.exists(overview_file):
        print(f"Creating transcript.jsonl from overview.txt: {overview_file} -> {transcript_file}...")
        shutil.copy(overview_file, transcript_file)
else:
    print("Warning: Backup brain folder not found!")

print("Restoration process completed successfully.")
