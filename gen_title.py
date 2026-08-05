import base64, io, json, os, urllib.request
API_KEY = os.environ["OPENAI_API_KEY"]
body = json.dumps({
    "model": "gpt-image-2",
    "prompt": ("Video game key art, low-poly 3D render style, moody nighttime scene: "
               "a cute low-poly raccoon wearing a tiny black burglar mask sneaking on its hind legs "
               "carrying a glowing gold coin, next to a tipped-over metal trash can, "
               "suburban house with warm glowing windows in the background, deep blue night, "
               "full moon, fireflies, cinematic rim lighting, charming heist caper mood. "
               "No text, no words, no logos."),
    "size": "1024x1536",
    "quality": "medium",
    "output_format": "jpeg",
    "output_compression": 80,
}).encode()
req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=body,
    headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"})
with urllib.request.urlopen(req, timeout=300) as r:
    data = json.load(r)
raw = base64.b64decode(data["data"][0]["b64_json"])
from PIL import Image
img = Image.open(io.BytesIO(raw)).convert("RGB")
img = img.resize((512, 768), Image.LANCZOS)
img.save("/home/user/raccoon-heist/textures/title-art.jpg", "JPEG", quality=84)
print("saved", os.path.getsize("/home/user/raccoon-heist/textures/title-art.jpg"))
