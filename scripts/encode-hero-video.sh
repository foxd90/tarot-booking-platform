#!/usr/bin/env bash
# Re-encode a hero video for the homepage.
#
#   scripts/encode-hero-video.sh path/to/new-video.mp4
#
# Writes into assets/hero/:
#   hero-desktop.mp4  1920px wide, for screens wider than 760px
#   hero-mobile.mp4   1280px wide, for phones
#   hero-poster.jpg   first frame (1600px), shown while the video loads and for reduced motion
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
    -vf "scale=$1:-2:flags=lanczos" \
    -c:v libx264 -profile:v high -preset slow -crf "$2" -pix_fmt yuv420p \
    -movflags +faststart "$out/$3"
}

encode 1920 32 hero-desktop.mp4
encode 1280 32 hero-mobile.mp4
ffmpeg -y -loglevel error -i "$src" -vf "scale=1600:-2:flags=lanczos" -frames:v 1 -q:v 8 "$out/hero-poster.jpg"

ls -lh "$out"/hero-desktop.mp4 "$out"/hero-mobile.mp4 "$out"/hero-poster.jpg
