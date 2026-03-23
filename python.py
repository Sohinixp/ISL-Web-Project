import os
import json

def generate_mapping():
    # This finds the actual folder where THIS script is saved
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_folder = os.path.join(script_dir, 'animations')
    mapping_file = os.path.join(script_dir, 'mapping.json')
    
    word_map = {}

    print(f"Searching for folder at: {base_folder}")

    if not os.path.exists(base_folder):
        print(f"❌ Error: Folder '{base_folder}' not found.")
        print("Make sure your 'animations' folder is in the same place as this script.")
        return

    # Travel through A, B, C subfolders
    for root, dirs, files in os.walk(base_folder):
        for filename in files:
            if filename.endswith('.json'):
                # Get word (filename without .json)
                word = os.path.splitext(filename)[0].lower().strip()
                
                # Get the path relative to the 'animations' folder (e.g., A/apple.json)
                relative_path = os.path.relpath(os.path.join(root, filename), base_folder)
                
                # Convert Windows backslashes to web forward slashes
                web_friendly_path = relative_path.replace('\\', '/')
                
                word_map[word] = web_friendly_path
                print(f"✅ Mapped: '{word}' -> {web_friendly_path}")

    # Save to mapping.json
    with open(mapping_file, 'w') as f:
        json.dump(word_map, f, indent=4)

    print(f"\n🚀 Success! Created {mapping_file} with {len(word_map)} entries.")

if __name__ == "__main__":
    generate_mapping()