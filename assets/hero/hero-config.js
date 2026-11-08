/* hero-config.js — every tunable setting of the homepage hero scene.
 *
 * To change something: open the homepage with ?tune at the end of the address
 * (e.g. yoursite/?tune, or http://localhost:8000/?tune), adjust the sliders, press "Copy settings",
 * and paste the result over the object below. See assets/hero/README.md.
 *
 * Positions in `scene` are fractions of the video frame (0 = left/top, 1 = right/bottom).
 */
window.HERO_CONFIG = {
  // where things sit in the video frame — re-check these if the video is replaced
  scene: {
    fire: { x: 0.735, y: 0.70 },
    moon: { x: 0.668, y: 0.11 },
  },

  // overall look
  look: {
    tint: 0.1,        // warm sepia on the video (0 = pure black and white)
    grain: 0.01,      // film grain over the whole hero
  },

  // phones: how the video fades into the page
  mobileFade: {
    start: 65,        // % down the video where the bottom fade begins
    topStart: 0.05,   // how much video shows at the very top edge (0 = black)
    topLength: 29,    // % down the video where the top fade ends
  },

  fireflies: {
    count: 23,
    size: 0.6,
    speed: 1.45,
    glow: 1.45,
    blink: 1.4,
    warmth: 0.1,      // 0 = cool green-white, 0.5 = gold, 1 = amber
    pull: 2.8,        // how strongly they drift toward the cursor (desktop)
  },

  // leaves sway only where wind-map.png is white
  wind: {
    strength: 8,      // peak movement, in pixels of a 2016px-wide frame
    speed: 1,
    rippleSize: 5,    // low = whole clusters move together, high = small busy ripples
    gustiness: 0.7,   // 0 = steady breeze, 1 = strong gusts with calm between
  },

  // desktop only
  lantern: {
    radius: 170,      // px
    dim: 0.05,        // how much darker the scene gets outside the light
    warmth: 0,
    flicker: 0.4,
    lag: 0.5,         // 0 = glued to the cursor, 1 = trails slowly behind
    reveal: 0.25,     // how much the light lifts the dark shade behind the text column
  },

  embers: {
    reach: 310,       // px from the fire where the cursor starts stoking it (desktop)
    sparks: 18,       // embers per second at full flare
    idle: 0.6,        // embers per second when nobody is near
    warmth: 0,        // 0 = pale gold, 1 = deep orange-red
    lift: 2,          // how fast and high they rise
  },
};
