import sqlite3
import glob
import os

conversations_dir = r"C:\Users\AL NABAA\.gemini\antigravity\conversations"
db_files = glob.glob(os.path.join(conversations_dir, "*.db"))

for db_file in db_files:
    try:
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM trajectory_meta")
        rows = cursor.fetchall()
        print(f"File: {os.path.basename(db_file)}")
        for r in rows:
            print(f"  {r}")
        conn.close()
    except Exception as e:
        print(f"Error in {os.path.basename(db_file)}: {e}")
