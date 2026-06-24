from pathlib import Path
from math import sin, cos, pi

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
ICON_DIR = PUBLIC / "icons"
ICON_DIR.mkdir(parents=True, exist_ok=True)


def font(size, bold=False, serif=False):
    candidates = []
    if serif:
        candidates.extend([
            r"C:\Windows\Fonts\timesbd.ttf" if bold else r"C:\Windows\Fonts\times.ttf",
            r"C:\Windows\Fonts\NotoSerifTC-VF.ttf",
        ])
    candidates.extend([
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\NotoSansTC-VF.ttf",
        r"C:\Windows\Fonts\msjhbd.ttc" if bold else r"C:\Windows\Fonts\msjh.ttc",
    ])
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def lerp(a, b, t):
    return int(a + (b - a) * t)


def vertical_gradient(width, height, top, bottom):
    img = Image.new("RGB", (width, height), top)
    px = img.load()
    for y in range(height):
        t = y / max(1, height - 1)
        row = tuple(lerp(top[i], bottom[i], t) for i in range(3))
        for x in range(width):
            px[x, y] = row
    return img


def cubic_points(p0, p1, p2, p3, steps=90):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        x = (
            (1 - t) ** 3 * p0[0]
            + 3 * (1 - t) ** 2 * t * p1[0]
            + 3 * (1 - t) * t**2 * p2[0]
            + t**3 * p3[0]
        )
        y = (
            (1 - t) ** 3 * p0[1]
            + 3 * (1 - t) ** 2 * t * p1[1]
            + 3 * (1 - t) * t**2 * p2[1]
            + t**3 * p3[1]
        )
        pts.append((x, y))
    return pts


def draw_mark(draw, box, scale=1):
    x0, y0, x1, y1 = box
    w = x1 - x0
    h = y1 - y0
    gold = (214, 175, 55)
    rose = (183, 110, 121)
    cyan = (85, 215, 230)

    cx = x0 + w / 2
    cy = y0 + h / 2
    r = min(w, h) * 0.39
    draw.ellipse(
        (cx - r, cy - r, cx + r, cy + r),
        outline=(214, 175, 55, 230),
        width=max(2, int(3 * scale)),
    )
    draw.ellipse(
        (cx - r * 0.82, cy - r * 0.82, cx + r * 0.82, cy + r * 0.82),
        outline=(255, 255, 255, 32),
        width=max(1, int(1.2 * scale)),
    )

    # Hair-like arcs crossing the monogram ring.
    paths = [
        ((x0 + w * 0.18, y0 + h * 0.66), (x0 + w * 0.35, y0 + h * 0.18), (x0 + w * 0.64, y0 + h * 0.21), (x0 + w * 0.82, y0 + h * 0.58), gold),
        ((x0 + w * 0.2, y0 + h * 0.43), (x0 + w * 0.4, y0 + h * 0.78), (x0 + w * 0.66, y0 + h * 0.75), (x0 + w * 0.79, y0 + h * 0.34), rose),
        ((x0 + w * 0.26, y0 + h * 0.73), (x0 + w * 0.46, y0 + h * 0.49), (x0 + w * 0.55, y0 + h * 0.36), (x0 + w * 0.73, y0 + h * 0.23), cyan),
    ]
    for p0, p1, p2, p3, color in paths:
        pts = cubic_points(p0, p1, p2, p3)
        draw.line(pts, fill=color + (215,), width=max(3, int(5 * scale)), joint="curve")

    f = font(int(h * 0.28), bold=True, serif=True)
    text = "HC"
    bbox = draw.textbbox((0, 0), text, font=f)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw / 2, cy - th / 2 - h * 0.015), text, font=f, fill=(245, 224, 163, 255))

    for i in range(6):
        angle = i * pi / 3 + 0.2
        sx = cx + cos(angle) * r * 1.08
        sy = cy + sin(angle) * r * 1.08
        size = max(2, int(2.2 * scale))
        draw.ellipse((sx - size, sy - size, sx + size, sy + size), fill=(245, 224, 163, 180))


def make_icon(size, out_path, maskable=False):
    scale = 4
    canvas = Image.new("RGBA", (size * scale, size * scale), (0, 0, 0, 0))
    bg = vertical_gradient(size * scale, size * scale, (2, 3, 5), (18, 11, 18)).convert("RGBA")
    canvas.alpha_composite(bg)
    d = ImageDraw.Draw(canvas, "RGBA")

    pad = int(size * scale * (0.08 if maskable else 0.04))
    d.rounded_rectangle(
        (pad, pad, size * scale - pad, size * scale - pad),
        radius=int(size * scale * 0.12),
        outline=(214, 175, 55, 170),
        width=max(4, int(size * scale * 0.012)),
    )
    for i in range(8):
        t = i / 7
        color = (214, 175, 55, int(20 + 52 * (1 - t)))
        d.arc(
            (
                int(size * scale * (0.1 + t * 0.04)),
                int(size * scale * (0.14 + t * 0.04)),
                int(size * scale * (0.9 - t * 0.03)),
                int(size * scale * (0.9 - t * 0.02)),
            ),
            205,
            338,
            fill=color,
            width=max(1, int(size * scale * 0.004)),
        )

    mark_pad = int(size * scale * (0.15 if maskable else 0.11))
    draw_mark(d, (mark_pad, mark_pad, size * scale - mark_pad, size * scale - mark_pad), scale=scale)

    canvas = canvas.resize((size, size), Image.Resampling.LANCZOS)
    canvas.save(out_path)


def make_share_card():
    width, height = 1200, 630
    img = vertical_gradient(width, height, (3, 4, 6), (18, 10, 18)).convert("RGBA")

    # Subtle gallery lines instead of heavy color blocks.
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay, "RGBA")
    for offset in range(5):
        y = 500 + offset * 20
        pts = cubic_points((90, y), (340, y - 70), (625, y + 45), (1110, y - 16), steps=120)
        od.line(pts, fill=(214, 175, 55, 28 - offset * 4), width=2)
    for offset in range(4):
        x = 120 + offset * 38
        pts = cubic_points((x, 96), (x + 130, 210), (x - 60, 370), (x + 80, 535), steps=90)
        od.line(pts, fill=(183, 110, 121, 24 - offset * 3), width=2)
    img = Image.alpha_composite(img, overlay)
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle((54, 54, width - 54, height - 54), radius=24, outline=(214, 175, 55, 150), width=2)
    d.line((100, 478, 438, 478), fill=(214, 175, 55, 210), width=3)

    draw_mark(d, (92, 132, 390, 430), scale=2.3)

    title_font = font(70, bold=True, serif=True)
    sub_font = font(36, bold=False)
    meta_font = font(25, bold=True)
    small_font = font(22, bold=False)
    d.text((482, 156), "HAUTCOIFFURE", font=title_font, fill=(245, 224, 163, 255))
    d.text((486, 248), "Salon Art Gallery", font=sub_font, fill=(245, 245, 247, 238))
    d.text((488, 318), "207 AI hair-art inspirations", font=meta_font, fill=(183, 110, 121, 248))
    d.text((488, 356), "East Asian couture · installable web app", font=small_font, fill=(142, 142, 147, 255))
    d.text((488, 414), "Immersive lookbook for high-end salon art", font=meta_font, fill=(245, 245, 247, 225))

    for offset in range(3):
        y = 512 + offset * 18
        pts = cubic_points((738, y), (845, y - 64), (980, y + 38), (1110, y - 18), steps=80)
        d.line(pts, fill=(214, 175, 55, 80 - offset * 18), width=3)

    img.convert("RGB").save(PUBLIC / "share-card.png", quality=94)


def make_svg_assets():
    svg = """<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="HautCoiffure">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#020305"/>
      <stop offset="0.55" stop-color="#120b12"/>
      <stop offset="1" stop-color="#06080d"/>
    </linearGradient>
    <linearGradient id="hair" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d4af37"/>
      <stop offset="0.52" stop-color="#f5e0a3"/>
      <stop offset="1" stop-color="#55d7e6"/>
    </linearGradient>
  </defs>
  <rect x="18" y="18" width="476" height="476" rx="58" fill="url(#bg)" stroke="#d4af37" stroke-width="10"/>
  <circle cx="256" cy="256" r="164" fill="none" stroke="#d4af37" stroke-width="10"/>
  <circle cx="256" cy="256" r="134" fill="none" stroke="#ffffff" stroke-opacity=".16" stroke-width="3"/>
  <path d="M104 336 C170 70 342 100 410 292" fill="none" stroke="url(#hair)" stroke-width="22" stroke-linecap="round"/>
  <path d="M110 218 C188 398 334 390 397 180" fill="none" stroke="#b76e79" stroke-width="18" stroke-linecap="round" opacity=".9"/>
  <path d="M142 374 C210 248 280 190 368 120" fill="none" stroke="#55d7e6" stroke-width="13" stroke-linecap="round" opacity=".84"/>
  <text x="256" y="300" text-anchor="middle" font-family="Times New Roman, serif" font-size="132" font-weight="700" fill="#f5e0a3">HC</text>
</svg>
"""
    (ICON_DIR / "brand-mark.svg").write_text(svg, encoding="utf-8")
    (PUBLIC / "favicon.svg").write_text(svg, encoding="utf-8")


def main():
    make_svg_assets()
    for size in (192, 512):
        make_icon(size, ICON_DIR / f"icon-{size}.png")
    make_icon(512, ICON_DIR / "maskable-512.png", maskable=True)
    make_icon(180, ICON_DIR / "apple-touch-icon.png")
    make_share_card()


if __name__ == "__main__":
    main()
