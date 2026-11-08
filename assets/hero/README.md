# Homepage hero scene

The homepage hero is a looping video of a stippled night jungle, brought to life in code:
fireflies, leaves swaying in the wind, embers rising from the fire, and (on desktop) a
lantern that follows the cursor.

| File | What it is |
|---|---|
| `hero-config.js` | **Every tuned setting.** Edit this to change how the scene looks and behaves. |
| `hero.js` | The engine: WebGL wind, fireflies, embers, lantern, nav hide/show. |
| `hero-tune.js` | The tuning panel. Only loads with `?tune` in the address. |
| `hero.css` | Hero layout and styles (desktop + phone). |
| `hero-desktop.mp4`, `hero-mobile.mp4`, `hero-poster.jpg` | The video, encoded for the web. |
| `wind-map.png` | Which areas sway: white = moves, black = still. |
| `../../scripts/encode-hero-video.sh` | Turns any source video into the three video files above. |

## Tune the settings

1. Open the homepage with `?tune` at the end of the address, e.g. `http://localhost:8000/?tune`.
2. Use the **Tune hero** panel (bottom right) to adjust anything.
3. Press **Copy settings** and paste the result over the object in `hero-config.js`
   (or paste it to Claude and ask for it to be applied).

Nothing is saved until `hero-config.js` changes, so experimenting is safe.

## Repaint which leaves move

1. Open the homepage with `?tune` (desktop or iPad — a phone shows only a slice of the frame).
2. Tick **Paint mode**. The full frame shows, marked areas glow green.
3. **Mark (moves)** paints areas that should sway, **Erase** makes them still again.
   Brush size, softness and Undo are in the panel.
4. Press **Save wind map** and replace `wind-map.png` here with the downloaded file.

Strokes are remembered in that browser between reloads; **Back to site map** discards them.

## Replace the video

1. Install ffmpeg once: `brew install ffmpeg`.
2. Run `scripts/encode-hero-video.sh path/to/new-video.mp4` from the project folder.
   It overwrites `hero-desktop.mp4`, `hero-mobile.mp4` and `hero-poster.jpg`.
3. If the new video is framed differently:
   - repaint the wind map (above) — the old one marks the old leaves;
   - open `?tune` and adjust **Fire across / Fire down** until the embers rise from the
     flame (on phones this also keeps the fire centred), then copy the settings.

Keep the video muted, ideally a seamless loop, and roughly 2:1 landscape.

## Behaviour notes

- Phones: the video is cropped so the fire sits mid-screen and fades into the page; no lantern.
- Reduced motion: the scene holds still (no wind, embers or lantern; a few fireflies).
- Without WebGL the plain video plays, without wind.
- The main nav hides while the hero is on screen and slides in once you scroll past it.
