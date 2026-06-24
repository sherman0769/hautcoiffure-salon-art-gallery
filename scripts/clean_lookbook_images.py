from __future__ import annotations

import argparse
import json
import math
import re
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw


OUTPUT_SIZE = 341
LOOKBOOK_RE = re.compile(r"g(?P<grid>\d+)_(?P<index>\d+)\.png$")


@dataclass(frozen=True)
class SquareCrop:
    x: int
    y: int
    size: int
    reason: str


FRAME_DETECTION_TARGETS = (
    {(1, index) for index in range(1, 10)}
    | {(2, index) for index in range(1, 10)}
    | {(6, index) for index in range(1, 10)}
    | {(14, index) for index in range(1, 10)}
    | {(20, index) for index in range(1, 10)}
)

MANUAL_SQUARE_CROPS = {
    **{(3, index): SquareCrop(0, 0, 300, "bottom-right grid number") for index in range(1, 10)},
    **{(11, index): SquareCrop(20, 0, 301, "bottom name label") for index in range(1, 10)},
    (16, 1): SquareCrop(29, 58, 283, "top title strip"),
    (16, 2): SquareCrop(29, 58, 283, "top title strip"),
    (16, 3): SquareCrop(29, 58, 283, "top title strip"),
    **{(16, index): SquareCrop(20, 39, 301, "adjacent-row strip") for index in range(4, 10)},
    (23, 1): SquareCrop(75, 80, 260, "wedding paper frame"),
    (23, 2): SquareCrop(28, 70, 271, "wedding paper frame"),
    (23, 3): SquareCrop(0, 70, 271, "wedding paper frame"),
    (23, 4): SquareCrop(83, 67, 258, "wedding paper frame"),
    (23, 5): SquareCrop(36, 36, 273, "wedding paper frame"),
    (23, 6): SquareCrop(4, 34, 275, "wedding paper frame"),
    (23, 7): SquareCrop(91, 0, 250, "wedding paper frame"),
    (23, 8): SquareCrop(45, 0, 270, "wedding paper frame"),
    (23, 9): SquareCrop(0, 0, 285, "wedding paper frame"),
}


def parse_name(path: Path) -> tuple[int, int]:
    match = LOOKBOOK_RE.match(path.name)
    if not match:
        raise ValueError(f"Unexpected lookbook filename: {path.name}")
    return int(match.group("grid")), int(match.group("index"))


def clamp_square(crop: SquareCrop, width: int, height: int) -> SquareCrop:
    size = min(crop.size, width, height)
    x = max(0, min(crop.x, width - size))
    y = max(0, min(crop.y, height - size))
    return SquareCrop(x, y, size, crop.reason)


def inpaint_dark_corner_text(rgb: np.ndarray) -> tuple[np.ndarray, bool]:
    """Remove black grid numbers printed on pale top-left backgrounds."""
    height, width = rgb.shape[:2]
    region_w = min(92, width)
    region_h = min(76, height)
    region = rgb[:region_h, :region_w]
    gray = cv2.cvtColor(region, cv2.COLOR_RGB2GRAY)
    channel_delta = region.max(axis=2) - region.min(axis=2)
    mask = ((gray < 150) & (channel_delta < 48)).astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((5, 5), np.uint8), iterations=1)

    full_mask = np.zeros((height, width), dtype=np.uint8)
    full_mask[:region_h, :region_w] = mask
    if cv2.countNonZero(full_mask) < 20:
        return rgb, False

    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    cleaned = cv2.inpaint(bgr, full_mask, 5, cv2.INPAINT_TELEA)
    return cv2.cvtColor(cleaned, cv2.COLOR_BGR2RGB), True


def inpaint_rect(rgb: np.ndarray, x: int, y: int, width: int, height: int) -> np.ndarray:
    mask = np.zeros(rgb.shape[:2], dtype=np.uint8)
    mask[y : y + height, x : x + width] = 255
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    cleaned = cv2.inpaint(bgr, mask, 7, cv2.INPAINT_TELEA)
    return cv2.cvtColor(cleaned, cv2.COLOR_BGR2RGB)


def detect_frame_square(rgb: np.ndarray) -> SquareCrop | None:
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    height, width = gray.shape
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(
        edges,
        1,
        np.pi / 180,
        threshold=45,
        minLineLength=135,
        maxLineGap=8,
    )
    if lines is None:
        return None

    horizontals: list[tuple[int, int, int, int]] = []
    verticals: list[tuple[int, int, int, int]] = []
    for x1, y1, x2, y2 in lines[:, 0, :]:
        x1, y1, x2, y2 = map(int, (x1, y1, x2, y2))
        if abs(y1 - y2) <= 4:
            horizontals.append((min(x1, x2), (y1 + y2) // 2, max(x1, x2), abs(x2 - x1)))
        if abs(x1 - x2) <= 4:
            verticals.append(((x1 + x2) // 2, min(y1, y2), max(y1, y2), abs(y2 - y1)))

    top_candidates = [y for _, y, _, length in horizontals if y <= 100 and length >= 140]
    bottom_candidates = [y for _, y, _, length in horizontals if y >= height - 115 and length >= 140]
    left_candidates = [x for x, _, _, length in verticals if x <= 115 and length >= 140]
    right_candidates = [x for x, _, _, length in verticals if x >= width - 115 and length >= 140]

    top = max(top_candidates) if top_candidates else None
    bottom = min(bottom_candidates) if bottom_candidates else None
    left = max(left_candidates) if left_candidates else None
    right = min(right_candidates) if right_candidates else None

    if top is None and verticals:
        top = min(y1 for _, y1, _, length in verticals if length >= 140)
    if bottom is None and verticals:
        bottom = max(y2 for _, _, y2, length in verticals if length >= 140)
    if left is None and horizontals:
        left = min(x1 for x1, _, _, length in horizontals if length >= 140)
    if right is None and horizontals:
        right = max(x2 for _, _, x2, length in horizontals if length >= 140)

    if top is None or left is None:
        return None

    top = max(0, top + 2)
    left = max(0, left + 2)
    bottom = min(height, (bottom - 2) if bottom is not None else height)
    right = min(width, (right - 2) if right is not None else width)

    size = min(right - left, bottom - top, width - left, height - top)
    if size < 220:
        return None

    return SquareCrop(left, top, size, "detected frame")


def crop_and_resize(rgb: np.ndarray, crop: SquareCrop) -> Image.Image:
    height, width = rgb.shape[:2]
    crop = clamp_square(crop, width, height)
    cropped = rgb[crop.y : crop.y + crop.size, crop.x : crop.x + crop.size]
    image = Image.fromarray(cropped, mode="RGB")
    if image.size != (OUTPUT_SIZE, OUTPUT_SIZE):
        image = image.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.Resampling.LANCZOS)
    return image


def clean_one(path: Path) -> tuple[Image.Image, dict[str, object]]:
    grid, index = parse_name(path)
    rgb = np.array(Image.open(path).convert("RGB"))
    operations: list[str] = []

    if grid == 5:
        rgb, did_inpaint = inpaint_dark_corner_text(rgb)
        if did_inpaint:
            operations.append("inpainted top-left grid number")

    if grid == 12:
        rgb = inpaint_rect(rgb, 0, 0, 58, 58)
        operations.append("inpainted top-left number badge")

    crop = MANUAL_SQUARE_CROPS.get((grid, index))
    if crop is None and (grid, index) in FRAME_DETECTION_TARGETS:
        crop = detect_frame_square(rgb)

    if crop is None:
        crop = SquareCrop(0, 0, min(rgb.shape[0], rgb.shape[1]), "unchanged square")
    elif crop.reason:
        operations.append(crop.reason)

    image = crop_and_resize(rgb, crop)
    report = {
        "file": path.name,
        "grid": grid,
        "index": index,
        "crop": {"x": crop.x, "y": crop.y, "size": crop.size, "reason": crop.reason},
        "operations": operations,
    }
    return image, report


def sorted_lookbook_files(source: Path) -> list[Path]:
    files = [path for path in source.glob("g*_*.png") if LOOKBOOK_RE.match(path.name)]
    return sorted(files, key=lambda path: parse_name(path))


def write_contact_sheet(image_dir: Path, output_path: Path) -> None:
    files = sorted_lookbook_files(image_dir)
    thumb = 120
    label_h = 18
    cols = 9
    rows = math.ceil(len(files) / cols)
    sheet = Image.new("RGB", (cols * thumb, rows * (thumb + label_h)), (22, 22, 22))
    draw = ImageDraw.Draw(sheet)

    for offset, path in enumerate(files):
        image = Image.open(path).convert("RGB")
        image.thumbnail((thumb, thumb), Image.Resampling.LANCZOS)
        x = (offset % cols) * thumb
        y = (offset // cols) * (thumb + label_h)
        sheet.paste(image, (x + (thumb - image.width) // 2, y))
        draw.text((x + 4, y + thumb + 2), path.stem, fill=(235, 235, 235))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, quality=92)


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean lookbook grid-crop artifacts.")
    parser.add_argument("--source", type=Path, default=Path("public/images/lookbook"))
    parser.add_argument("--output", type=Path, default=Path("tmp_cleaned_lookbook"))
    parser.add_argument("--in-place", action="store_true", help="Overwrite source files in place.")
    parser.add_argument("--contact-sheet", type=Path, help="Optional contact sheet output path.")
    parser.add_argument("--report", type=Path, help="Optional JSON report output path.")
    args = parser.parse_args()

    source = args.source
    output = source if args.in_place else args.output
    output.mkdir(parents=True, exist_ok=True)

    reports = []
    saved = 0
    for path in sorted_lookbook_files(source):
        image, report = clean_one(path)
        if args.in_place and not report["operations"]:
            reports.append(report)
            continue

        image.save(output / path.name, optimize=True)
        saved += 1
        reports.append(report)

    changed = sum(1 for report in reports if report["operations"])
    print(f"Processed {len(reports)} lookbook images. Cleaned {changed} with explicit operations. Saved {saved} files.")

    if args.contact_sheet:
        write_contact_sheet(output, args.contact_sheet)
        print(f"Wrote contact sheet: {args.contact_sheet}")

    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(reports, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Wrote report: {args.report}")


if __name__ == "__main__":
    main()
