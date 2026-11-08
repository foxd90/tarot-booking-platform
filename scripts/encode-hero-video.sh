#!/usr/bin/env bash
# Re-encode a hero video for the homepage.
#
#   scripts/encode-hero-video.sh path/to/new-video.mp4
#
# Writes into assets/hero/:
#   hero-desktop.mp4  source width (max 2560px), for screens wider than 760px
#   hero-mobile.mp4   1600px wide, for phones (they crop and enlarge a slice, so it needs the pixels)
#   hero-poster.jpg   first frame (max 2560px), shown while the video loads and for reduced motion
#
# The stipple dots are fine noise that H.264 smears into blotches at normal settings, so this
# uses -tune grain and a low CRF, and never downscales the desktop file (resampling blurs the dots).
#
# Needs ffmpeg (brew install ffmpeg). Audio is dropped; the hero video is always muted.
# If the new video has a different framing, also repaint the wind map and re-check
# the fire position — see assets/hero/README.md.
set -euo pipefail

src="${1:?usage: scripts/encode-hero-video.sh <video file>}"
out="$(cd "$(dirname "$0")/.." && pwd)/assets/hero"
mkdir -p "$out"

encode() { # width crf output
  ffmpeg -y -loglevel error -i "$src" -an \
    -vf "scale='min(iw,$1)':-2:flags=lanczos" \
    -c:v libx264 -profile:v high -preset slow -crf "$2" -tune grain -pix_fmt yuv420p \
    -movflags +faststart "$out/$3"
}

encode 2560 26 hero-desktop.mp4
encode 1600 28 hero-mobile.mp4
ffmpeg -y -loglevel error -i "$src" -vf "scale='min(iw,2560)':-2:flags=lanczos" -frames:v 1 -q:v 3 "$out/hero-poster.jpg"

ls -lh "$out"/hero-desktop.mp4 "$out"/hero-mobile.mp4 "$out"/hero-poster.jpg
