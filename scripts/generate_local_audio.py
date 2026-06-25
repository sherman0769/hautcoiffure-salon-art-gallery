from __future__ import annotations

import math
import random
import shutil
import struct
import subprocess
import wave
from pathlib import Path


SAMPLE_RATE = 24_000
DURATION_SECONDS = 84
OUTPUT_DIR = Path("public/audio")


TRACKS = [
    {
        "stem": "atelier-ambient",
        "name": "Atelier Ambient",
        "base": 110.0,
        "chord": [1.0, 1.5, 2.0, 2.52, 3.78],
        "motion": 0.055,
        "warmth": 0.82,
        "noise": 0.018,
        "shimmer": 0.016,
        "seed": 2101,
    },
    {
        "stem": "velvet-gallery",
        "name": "Velvet Gallery",
        "base": 98.0,
        "chord": [1.0, 1.498, 2.0, 2.52, 3.0],
        "motion": 0.041,
        "warmth": 0.92,
        "noise": 0.014,
        "shimmer": 0.011,
        "seed": 2102,
    },
    {
        "stem": "aurora-color-wash",
        "name": "Aurora Color Wash",
        "base": 123.47,
        "chord": [1.0, 1.5, 2.0, 2.52, 3.78],
        "motion": 0.067,
        "warmth": 0.74,
        "noise": 0.012,
        "shimmer": 0.022,
        "seed": 2103,
    },
]


def envelope(t: float, duration: float) -> float:
    fade_in = min(1.0, t / 4.0)
    fade_out = min(1.0, (duration - t) / 5.5)
    return max(0.0, min(fade_in, fade_out))


def soft_clip(value: float) -> float:
    return math.tanh(value * 1.25) / math.tanh(1.25)


def render_wav(track: dict[str, object], wav_path: Path) -> None:
    rng = random.Random(int(track["seed"]))
    base = float(track["base"])
    chord = [float(multiplier) for multiplier in track["chord"]]
    motion = float(track["motion"])
    warmth = float(track["warmth"])
    noise_amount = float(track["noise"])
    shimmer_amount = float(track["shimmer"])
    phases = [rng.random() * math.tau for _ in chord]
    shimmer_phases = [rng.random() * math.tau for _ in chord]

    total_samples = int(SAMPLE_RATE * DURATION_SECONDS)
    wav_path.parent.mkdir(parents=True, exist_ok=True)

    with wave.open(str(wav_path), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)

        frames = bytearray()
        for index in range(total_samples):
            t = index / SAMPLE_RATE
            slow_swell = 0.66 + 0.34 * math.sin(math.tau * motion * t)
            breath = 0.85 + 0.15 * math.sin(math.tau * (motion * 0.37) * t + 1.8)
            sample_l = 0.0
            sample_r = 0.0

            for voice, multiplier in enumerate(chord):
                freq = base * multiplier
                detune = 1.0 + (voice - 2) * 0.0018
                amp = (0.11 / (voice + 1) ** 0.28) * slow_swell * breath
                phase = phases[voice]
                shimmer_phase = shimmer_phases[voice]
                tone = (
                    math.sin(math.tau * freq * detune * t + phase)
                    + 0.34 * math.sin(math.tau * freq * 2.0 * t + phase * 0.7)
                    + 0.12 * math.sin(math.tau * freq * 0.5 * t + phase * 1.3)
                )
                shimmer = math.sin(math.tau * freq * 4.02 * t + shimmer_phase) * shimmer_amount
                pan = -0.35 + voice * 0.17
                sample_l += (tone * warmth + shimmer) * amp * (1.0 - pan * 0.28)
                sample_r += (tone * warmth - shimmer) * amp * (1.0 + pan * 0.28)

            air = (rng.random() * 2.0 - 1.0) * noise_amount
            pulse = math.sin(math.tau * 0.125 * t) * 0.018
            env = envelope(t, DURATION_SECONDS)
            left = soft_clip((sample_l + air + pulse) * env)
            right = soft_clip((sample_r + air - pulse) * env)

            frames.extend(struct.pack("<hh", int(left * 32767), int(right * 32767)))

        wav.writeframes(frames)


def convert_to_mp3(wav_path: Path, mp3_path: Path) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return

    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(wav_path),
            "-codec:a",
            "libmp3lame",
            "-b:a",
            "128k",
            str(mp3_path),
        ],
        check=True,
    )
    wav_path.unlink(missing_ok=True)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for track in TRACKS:
        wav_path = OUTPUT_DIR / f"{track['stem']}.wav"
        mp3_path = OUTPUT_DIR / f"{track['stem']}.mp3"
        render_wav(track, wav_path)
        convert_to_mp3(wav_path, mp3_path)
        output_path = mp3_path if mp3_path.exists() else wav_path
        print(f"Wrote {track['name']}: {output_path}")


if __name__ == "__main__":
    main()
