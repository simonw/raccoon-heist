#!/usr/bin/env python3
"""Generate tileable game textures with OpenAI gpt-image-2 and save 512px JPEGs."""
import base64, io, json, os, sys, urllib.request

API_KEY = os.environ["OPENAI_API_KEY"]
OUT = "/home/user/raccoon-heist/textures"

STYLE = ("Seamless tileable texture, top-down flat orthographic view, no perspective, "
         "even lighting, video game texture map, stylized low-poly game art style, "
         "moody nighttime color palette with cool blue tones. ")

TEXTURES = {
    "grass":    "Dark night-time lawn grass texture, deep blue-green stylized grass blades, subtle variation.",
    "brick":    "House wall of painted wooden siding boards, dark slate blue-grey horizontal clapboard siding, weathered, front-on view.",
    "fence":    "Old wooden fence planks texture, vertical weathered brown wood boards with grain and nails, front-on view.",
    "roof":     "Roof shingles texture, overlapping dark grey-blue asphalt shingles rows, front-on view.",
    "path":     "Cracked concrete pavement texture at night, grey-blue concrete slabs with subtle cracks and stains.",
    "metal":    "Galvanized metal trash can surface texture, brushed dull silver metal with vertical ridges, scuffs and scratches.",
    "soil":     "Dark garden soil dirt texture with small pebbles and leaf litter, night time, deep browns and blues.",
}

def gen(name, prompt):
    body = json.dumps({
        "model": "gpt-image-2",
        "prompt": STYLE + prompt,
        "size": "1024x1024",
        "quality": "low",
        "output_format": "jpeg",
        "output_compression": 80,
        "n": 1,
    }).encode()
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=body,
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        data = json.load(r)
    b64 = data["data"][0]["b64_json"]
    raw = base64.b64decode(b64)
    from PIL import Image
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    img = img.resize((512, 512), Image.LANCZOS)
    path = os.path.join(OUT, f"{name}.jpg")
    img.save(path, "JPEG", quality=82)
    print(f"{name}: saved {os.path.getsize(path)} bytes")

if __name__ == "__main__":
    names = sys.argv[1:] or list(TEXTURES)
    for n in names:
        try:
            gen(n, TEXTURES[n])
        except Exception as e:
            print(f"{n}: FAILED {e}", file=sys.stderr)
