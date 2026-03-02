import urllib.request
import re
import json

url = "https://forms.gle/vpmtNafcrMvLNQgq6"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        
        action = re.search(r'action=\"(https://docs\.google\.com/forms/[^\"]+)\"', html)
        print("ACTION:", action.group(1) if action else "Not found")
        
        fb_data = re.search(r'var FB_PUBLIC_LOAD_DATA_ = (\[.*?\]);', html, re.DOTALL)
        if fb_data:
            data = json.loads(fb_data.group(1))
            for item in data[1][1]:
                title = item[1]
                entry_id = item[4][0][0]
                print(f"TITLE: {title}, ID: entry.{entry_id}")
        else:
            print("FB_PUBLIC_LOAD_DATA_ not found")
except Exception as e:
    print("Error:", e)
