/*
  levels.js
  Plain-data definitions for all 10 levels. Uses small helper builder functions
  (groundWithGaps, plat, movingPlat, crumblePlat, vanishPlat, mkEnemy, mkC, scatter)
  so a non-programmer can tweak numbers (positions, ranges, counts) without touching
  the engine code in game.js / player.js / entities.js.

  Coordinate system: x grows rightward across the level, y grows downward.
  Canvas view is 960x540; GROUND_Y is the top surface of the main ground band.
*/

const GROUND_Y = 460;

// ---------- helpers ----------
function groundWithGaps(x0, x1, groundY, gaps, color, topColor, hazardKind, hazardColor) {
  const platforms = [];
  const hazards = [];
  let cursor = x0;
  const sorted = [...gaps].sort((a, b) => a[0] - b[0]);
  for (const [gs, ge] of sorted) {
    if (gs > cursor) platforms.push(new Platform({ x: cursor, y: groundY, w: gs - cursor, h: 240, type: 'solid', color, topColor }));
    hazards.push(new Hazard({ x: gs, y: groundY, w: ge - gs, h: 140, kind: hazardKind || 'water', color: hazardColor || '#1c6fbf' }));
    cursor = ge;
  }
  if (cursor < x1) platforms.push(new Platform({ x: cursor, y: groundY, w: x1 - cursor, h: 240, type: 'solid', color, topColor }));
  return { platforms, hazards };
}
function plat(x, y, w, h, color, topColor) { return new Platform({ x, y, w, h: h || 20, type: 'solid', color, topColor }); }
function movingPlat(x, y, w, h, axis, range, speed, phase, color, topColor) {
  return new Platform({ x, y, w, h: h || 20, type: 'moving', axis, range, speed, phase: phase || 0, color, topColor });
}
function crumblePlat(x, y, w, h, color, topColor) { return new Platform({ x, y, w, h: h || 20, type: 'crumble', color, topColor }); }
function vanishPlat(x, y, w, h, onTime, offTime, phase, color, topColor) {
  return new Platform({ x, y, w, h: h || 20, type: 'disappear', onTime, offTime, phase: phase || 0, color, topColor });
}
function mkEnemy(type, x, y, opts) { return new Enemy(Object.assign({ type, x, y }, opts || {})); }
function mkC(type, x, y) { return new Collectible({ type, x, y }); }
function scatter(type, x0, x1, step, y) {
  const arr = [];
  for (let x = x0; x <= x1; x += step) arr.push(mkC(type, x, y));
  return arr;
}

// ================= LEVEL 1 : Stabroek Market & Sea Wall =================
function buildLevel1() {
  const w = 3000;
  const g = groundWithGaps(0, w, GROUND_Y, [[820, 905], [1900, 1975]], '#c9a15a', '#3fa34d', 'water', '#1c6fbf');
  const platforms = [...g.platforms,
    plat(650, 370, 130, 20, '#c9a15a', '#CE1126'),
    plat(1000, 355, 110, 20, '#c9a15a', '#FCD116'),
    plat(1250, 380, 100, 20, '#c9a15a', '#009E49'),
    plat(1780, 365, 130, 20, '#c9a15a', '#CE1126'),
    plat(2150, 360, 120, 20, '#c9a15a', '#FCD116'),
    plat(2500, 355, 140, 20, '#c9a15a', '#009E49'),
  ];
  const enemies = [
    mkEnemy('crawler', 500, GROUND_Y - 28, { range: 70, speed: 40, color: '#CE1126' }),
    mkEnemy('crawler', 1350, GROUND_Y - 28, { range: 90, speed: 45, color: '#CE1126' }),
    mkEnemy('crawler', 2300, GROUND_Y - 28, { range: 80, speed: 50, color: '#009E49' }),
  ];
  const collectibles = [
    ...scatter('nugget', 200, 700, 90, GROUND_Y - 40),
    ...scatter('starapple', 1050, 1600, 110, GROUND_Y - 40),
    mkC('cassava', 1020, 290),
    mkC('cassava', 1800, 300),
    mkC('sugarcane', 2530, 290),
    mkC('cutlass', 2600, GROUND_Y - 40),
    mkC('bow', 2750, GROUND_Y - 40),
    mkC('starpower', 1200, GROUND_Y - 40),
    mkC('speedboost', 1550, GROUND_Y - 40),
    mkC('extralife', 2180, 320),
    mkC('gem', 680, 300),
    mkC('gem', 1810, 290),
    mkC('gem', 2530, 280),
  ];
  return {
    id: 1, name: 'Stabroek Market & Sea Wall', location: 'Georgetown', width: w, groundY: GROUND_Y,
    theme: 'market', night: false,
    palette: { sky1: '#8fd3f4', sky2: '#eaf9ff', ground: '#c9a15a', groundTop: '#3fa34d', accent: '#CE1126', accent2: '#FCD116' },
    playerStart: { x: 80, y: GROUND_Y - 46 }, checkpointX: 1500, endX: 2900,
    platforms, hazards: g.hazards, enemies, collectibles,
  };
}

// ================= LEVEL 2 : Demerara Riverside =================
function buildLevel2() {
  const w = 3400;
  const g = groundWithGaps(0, w, GROUND_Y, [[500, 1250], [1650, 2250], [2600, 3150]], '#8a6a3a', '#7a5230', 'water', '#0e5aa6');
  const platforms = [...g.platforms,
    movingPlat(560, GROUND_Y - 10, 110, 22, 'x', 90, 0.7, 0, '#7a5230', '#FCD116'),
    movingPlat(900, GROUND_Y - 10, 110, 22, 'x', 90, 0.7, Math.PI, '#7a5230', '#FCD116'),
    movingPlat(1700, GROUND_Y - 30, 100, 22, 'x', 110, 0.9, 0, '#7a5230', '#CE1126'),
    movingPlat(2000, GROUND_Y - 30, 100, 22, 'x', 110, 0.9, Math.PI, '#7a5230', '#CE1126'),
    movingPlat(2650, GROUND_Y - 20, 120, 22, 'y', 40, 1.1, 0, '#7a5230', '#009E49'),
    movingPlat(2950, GROUND_Y - 20, 120, 22, 'y', 40, 1.1, Math.PI, '#7a5230', '#009E49'),
  ];
  const enemies = [
    mkEnemy('crawler', 300, GROUND_Y - 28, { range: 70, speed: 42, color: '#7a5230' }),
    mkEnemy('flyer', 1400, GROUND_Y - 140, { range: 120, speed: 60, color: '#e8e8e8' }),
    mkEnemy('crawler', 2350, GROUND_Y - 28, { range: 80, speed: 48, color: '#7a5230' }),
    mkEnemy('flyer', 3000, GROUND_Y - 160, { range: 100, speed: 65, color: '#e8e8e8' }),
  ];
  const collectibles = [
    ...scatter('nugget', 100, 450, 90, GROUND_Y - 40),
    mkC('sugarcane', 610, GROUND_Y - 60),
    mkC('sugarcane', 950, GROUND_Y - 60),
    mkC('starapple', 1750, GROUND_Y - 80),
    mkC('starapple', 2050, GROUND_Y - 80),
    mkC('cutlass', 2500, GROUND_Y - 40),
    mkC('bow', 1400, GROUND_Y - 40),
    mkC('extralife', 1300, GROUND_Y - 40),
    mkC('starpower', 2460, GROUND_Y - 40),
    mkC('speedboost', 2560, GROUND_Y - 40),
    ...scatter('cassava', 3200, 3350, 80, GROUND_Y - 40),
    mkC('gem', 700, GROUND_Y - 90),
    mkC('gem', 1900, GROUND_Y - 120),
    mkC('gem', 2700, GROUND_Y - 100),
  ];
  return {
    id: 2, name: 'Demerara Riverside', location: 'Demerara River', width: w, groundY: GROUND_Y,
    theme: 'river', night: false,
    palette: { sky1: '#a7ddf0', sky2: '#eefaff', ground: '#8a6a3a', groundTop: '#7a5230', accent: '#009E49', accent2: '#FCD116' },
    playerStart: { x: 80, y: GROUND_Y - 46 }, checkpointX: 1550, endX: 3300,
    platforms, hazards: g.hazards, enemies, collectibles,
  };
}

// ================= LEVEL 3 : Essequibo Mangroves =================
function buildLevel3() {
  const w = 3600;
  const g = groundWithGaps(0, w, GROUND_Y, [[400, 700], [1100, 1350], [1800, 2000], [2500, 2820]], '#5b7a4a', '#3fa34d', 'water', '#12689e');
  const platforms = [...g.platforms,
    plat(430, GROUND_Y - 40, 90, 18, '#4a6b3a', '#3fa34d'),
    crumblePlat(590, GROUND_Y - 20, 90, 18, '#6b4a2a', '#8a6a3a'),
    plat(1130, GROUND_Y - 60, 90, 18, '#4a6b3a', '#3fa34d'),
    crumblePlat(1280, GROUND_Y - 20, 90, 18, '#6b4a2a', '#8a6a3a'),
    movingPlat(1830, GROUND_Y - 40, 100, 20, 'x', 60, 0.9, 0, '#4a6b3a', '#3fa34d'),
    plat(2520, GROUND_Y - 30, 90, 18, '#4a6b3a', '#3fa34d'),
    crumblePlat(2680, GROUND_Y - 60, 90, 18, '#6b4a2a', '#8a6a3a'),
  ];
  const enemies = [
    mkEnemy('crawler', 250, GROUND_Y - 24, { range: 60, speed: 46, color: '#e07a3a', w: 34, h: 22 }),
    mkEnemy('crawler', 950, GROUND_Y - 24, { range: 70, speed: 50, color: '#e07a3a', w: 34, h: 22 }),
    mkEnemy('flyer', 1600, GROUND_Y - 150, { range: 130, speed: 55, color: '#f3f3f3' }),
    mkEnemy('crawler', 2200, GROUND_Y - 24, { range: 80, speed: 52, color: '#e07a3a', w: 34, h: 22 }),
    mkEnemy('crawler', 3100, GROUND_Y - 24, { range: 90, speed: 55, color: '#e07a3a', w: 34, h: 22 }),
  ];
  const collectibles = [
    ...scatter('nugget', 100, 350, 100, GROUND_Y - 40),
    mkC('starapple', 460, GROUND_Y - 80),
    mkC('starapple', 1160, GROUND_Y - 100),
    mkC('cassava', 1860, GROUND_Y - 80),
    mkC('cutlass', 2050, GROUND_Y - 40),
    mkC('bow', 3480, GROUND_Y - 40),
    mkC('extralife', 1180, 350),
    mkC('starpower', 2085, GROUND_Y - 40),
    mkC('speedboost', 3320, GROUND_Y - 40),
    ...scatter('sugarcane', 2900, 3050, 80, GROUND_Y - 40),
    mkC('gem', 620, GROUND_Y - 60),
    mkC('gem', 1310, GROUND_Y - 60),
    mkC('gem', 2710, GROUND_Y - 100),
  ];
  return {
    id: 3, name: 'Essequibo Mangroves', location: 'Essequibo River', width: w, groundY: GROUND_Y,
    theme: 'mangrove', night: false,
    palette: { sky1: '#bfe6c9', sky2: '#eefef2', ground: '#5b7a4a', groundTop: '#3fa34d', accent: '#009E49', accent2: '#CE1126' },
    playerStart: { x: 80, y: GROUND_Y - 46 }, checkpointX: 1750, endX: 3500,
    platforms, hazards: g.hazards, enemies, collectibles,
  };
}

// ================= LEVEL 4 : Iwokrama Rainforest Canopy =================
function buildLevel4() {
  const w = 3900;
  // start & end ledges are solid; the whole middle is a big fall hazard (forest floor far below)
  const g = groundWithGaps(0, w, GROUND_Y, [[300, 3600]], '#2e5d2e', '#1f3f1f', 'pit', '#14210f');
  const platforms = [...g.platforms,
    plat(360, 400, 110, 20, '#3a6b2a', '#4d8a34'),
    movingPlat(560, 380, 90, 20, 'x', 70, 0.8, 0, '#3a6b2a', '#4d8a34'),
    plat(760, 340, 100, 20, '#3a6b2a', '#4d8a34'),
    movingPlat(980, 400, 90, 20, 'x', 80, 1.0, Math.PI / 2, '#3a6b2a', '#4d8a34'),
    plat(1220, 360, 110, 20, '#3a6b2a', '#4d8a34'),
    plat(1450, 300, 90, 20, '#3a6b2a', '#4d8a34'),
    movingPlat(1650, 380, 100, 20, 'x', 90, 0.7, 0, '#3a6b2a', '#4d8a34'),
    plat(1900, 420, 110, 20, '#3a6b2a', '#4d8a34'),
    plat(2120, 340, 90, 20, '#3a6b2a', '#4d8a34'),
    movingPlat(2320, 300, 90, 20, 'x', 70, 1.0, Math.PI, '#3a6b2a', '#4d8a34'),
    plat(2550, 380, 110, 20, '#3a6b2a', '#4d8a34'),
    plat(2780, 420, 100, 20, '#3a6b2a', '#4d8a34'),
    movingPlat(3000, 360, 100, 20, 'x', 90, 0.8, 0, '#3a6b2a', '#4d8a34'),
    plat(3250, 400, 120, 20, '#3a6b2a', '#4d8a34'),
    plat(3480, 420, 130, 20, '#3a6b2a', '#4d8a34'),
  ];
  const enemies = [
    mkEnemy('thrower', 780, 300, { range: 0, speed: 0 }),
    mkEnemy('thrower', 1470, 260, { range: 0, speed: 0 }),
    mkEnemy('crawler', 1230, 336, { range: 40, speed: 40, color: '#8a5a2b', w: 26, h: 22 }),
    mkEnemy('thrower', 2140, 300, { range: 0, speed: 0 }),
    mkEnemy('crawler', 2560, 356, { range: 40, speed: 44, color: '#8a5a2b', w: 26, h: 22 }),
    mkEnemy('thrower', 3260, 360, { range: 0, speed: 0 }),
  ];
  const collectibles = [
    mkC('nugget', 400, 360), mkC('nugget', 800, 300), mkC('starapple', 1240, 320),
    mkC('cutlass', 1470, 260), mkC('starapple', 1920, 380), mkC('nugget', 2140, 300),
    mkC('sugarcane', 2570, 340), mkC('nugget', 3040, 300), mkC('starapple', 3270, 360),
    mkC('extralife', 2810, 390), mkC('starpower', 1970, 395), mkC('speedboost', 3510, 390),
    mkC('bow', 3290, 370),
    mkC('gem', 600, 340), mkC('gem', 1670, 340), mkC('gem', 3020, 320),
  ];
  return {
    id: 4, name: 'Iwokrama Rainforest Canopy', location: 'Iwokrama Forest', width: w, groundY: GROUND_Y,
    theme: 'canopy', night: false,
    palette: { sky1: '#2f6b3a', sky2: '#5fae5f', ground: '#2e5d2e', groundTop: '#1f3f1f', accent: '#FCD116', accent2: '#CE1126' },
    playerStart: { x: 80, y: 350 }, checkpointX: 1900, endX: 3700,
    platforms, hazards: g.hazards, enemies, collectibles,
  };
}

// ================= LEVEL 5 : Kaieteur Falls =================
function buildLevel5() {
  const w = 3800;
  const g = groundWithGaps(0, w, GROUND_Y, [[280, 3550]], '#7a7a7a', '#5a5a5a', 'water', '#2e86c1');
  const platforms = [...g.platforms,
    plat(320, 420, 120, 20, '#8a8a8a', '#c9c9c9'),
    crumblePlat(520, 380, 100, 20, '#8a8a8a', '#c9c9c9'),
    plat(720, 420, 110, 20, '#8a8a8a', '#c9c9c9'),
    movingPlat(920, 360, 100, 20, 'y', 60, 0.8, 0, '#8a8a8a', '#c9c9c9'),
    plat(1150, 300, 100, 20, '#8a8a8a', '#c9c9c9'),
    crumblePlat(1360, 350, 90, 20, '#8a8a8a', '#c9c9c9'),
    plat(1560, 420, 120, 20, '#8a8a8a', '#c9c9c9'),
    movingPlat(1800, 380, 100, 20, 'x', 80, 0.9, 0, '#8a8a8a', '#c9c9c9'),
    plat(2050, 320, 100, 20, '#8a8a8a', '#c9c9c9'),
    crumblePlat(2260, 380, 90, 20, '#8a8a8a', '#c9c9c9'),
    plat(2460, 420, 120, 20, '#8a8a8a', '#c9c9c9'),
    movingPlat(2700, 360, 100, 20, 'y', 70, 0.7, Math.PI, '#8a8a8a', '#c9c9c9'),
    plat(2950, 300, 100, 20, '#8a8a8a', '#c9c9c9'),
    plat(3180, 380, 110, 20, '#8a8a8a', '#c9c9c9'),
    plat(3400, 420, 130, 20, '#8a8a8a', '#c9c9c9'),
  ];
  const enemies = [
    mkEnemy('crawler', 740, 396, { range: 40, speed: 45, color: '#5a5a5a', w: 28, h: 22 }),
    mkEnemy('flyer', 1200, 250, { range: 100, speed: 60, color: '#fff' }),
    mkEnemy('crawler', 1580, 396, { range: 50, speed: 48, color: '#5a5a5a', w: 28, h: 22 }),
    mkEnemy('flyer', 2100, 260, { range: 110, speed: 62, color: '#fff' }),
    mkEnemy('crawler', 2480, 396, { range: 50, speed: 50, color: '#5a5a5a', w: 28, h: 22 }),
  ];
  const collectibles = [
    mkC('nugget', 350, 380), mkC('nugget', 750, 380), mkC('starapple', 1160, 260),
    mkC('cutlass', 1370, 310), mkC('nugget', 1590, 380), mkC('starapple', 2060, 280),
    mkC('sugarcane', 2470, 380), mkC('nugget', 2960, 260), mkC('starapple', 3190, 340),
    mkC('extralife', 1180, 270), mkC('starpower', 2080, 290), mkC('speedboost', 2980, 270),
    mkC('bow', 2500, 390),
    mkC('gem', 930, 320), mkC('gem', 1810, 340), mkC('gem', 2710, 320),
  ];
  return {
    id: 5, name: 'Kaieteur Falls', location: 'Kaieteur National Park', width: w, groundY: GROUND_Y,
    theme: 'falls', night: false,
    palette: { sky1: '#9fd0e6', sky2: '#eafcff', ground: '#7a7a7a', groundTop: '#5a5a5a', accent: '#009E49', accent2: '#FCD116' },
    playerStart: { x: 80, y: 380 }, checkpointX: 1600, endX: 3600,
    platforms, hazards: g.hazards, enemies, collectibles,
  };
}

// ================= LEVEL 6 : Rupununi Savannah (night) =================
function buildLevel6() {
  const w = 4000;
  const g = groundWithGaps(0, w, GROUND_Y, [[900, 1050], [2100, 2260], [3000, 3140]], '#a68a52', '#c9ab6a', 'pit', '#141414');
  const platforms = [...g.platforms,
    plat(760, 380, 90, 18, '#a68a52', '#c9ab6a'),
    plat(2000, 360, 90, 18, '#a68a52', '#c9ab6a'),
    movingPlat(2900, 380, 90, 18, 'x', 60, 0.9, 0, '#a68a52', '#c9ab6a'),
    plat(3300, 360, 100, 18, '#a68a52', '#c9ab6a'),
  ];
  const enemies = [
    mkEnemy('crawler', 500, GROUND_Y - 26, { range: 70, speed: 55, color: '#5a4020', w: 32, h: 24 }),
    mkEnemy('flyer', 1300, 300, { range: 130, speed: 70, color: '#FCD116' }),
    mkEnemy('charger', 1700, GROUND_Y - 30, { range: 260, speed: 60, color: '#1a1a1a', w: 40, h: 26 }),
    mkEnemy('crawler', 2400, GROUND_Y - 26, { range: 80, speed: 58, color: '#5a4020', w: 32, h: 24 }),
    mkEnemy('charger', 3200, GROUND_Y - 30, { range: 300, speed: 65, color: '#1a1a1a', w: 40, h: 26 }),
    mkEnemy('flyer', 3600, 300, { range: 120, speed: 72, color: '#FCD116' }),
  ];
  const collectibles = [
    ...scatter('firefly', 300, 700, 130, 300),
    mkC('nugget', 780, 340), mkC('starapple', 1050, GROUND_Y - 40),
    mkC('cutlass', 1500, GROUND_Y - 40),
    mkC('starpower', 1650, GROUND_Y - 40),
    mkC('extralife', 350, GROUND_Y - 40), mkC('speedboost', 3330, 330),
    mkC('bow', 2900, GROUND_Y - 40),
    ...scatter('firefly', 2500, 2800, 140, 280),
    mkC('sugarcane', 2020, 320), mkC('nugget', 3320, 300),
    mkC('gem', 500, 260), mkC('gem', 2020, 300), mkC('gem', 3320, 280),
  ];
  return {
    id: 6, name: 'Rupununi Savannah', location: 'Rupununi', width: w, groundY: GROUND_Y,
    theme: 'savannah', night: true,
    palette: { sky1: '#0c1533', sky2: '#2a3a63', ground: '#a68a52', groundTop: '#c9ab6a', accent: '#FCD116', accent2: '#009E49' },
    playerStart: { x: 80, y: GROUND_Y - 46 }, checkpointX: 2000, endX: 3850,
    platforms, hazards: g.hazards, enemies, collectibles,
  };
}

// ================= LEVEL 7 : Pork-Knocker Trail =================
function buildLevel7() {
  const w = 4200;
  const g = groundWithGaps(0, w, GROUND_Y, [[600, 780], [1300, 1520], [2100, 2340], [2900, 3050], [3500, 3700]],
    '#6b4a2a', '#8a6a3a', 'pit', '#241a10');
  const platforms = [...g.platforms,
    vanishPlat(620, GROUND_Y - 20, 80, 18, 1.8, 1.2, 0, '#6b4a2a', '#8a6a3a'),
    vanishPlat(700, GROUND_Y - 20, 80, 18, 1.8, 1.2, 0.9, '#6b4a2a', '#8a6a3a'),
    movingPlat(1330, GROUND_Y - 40, 90, 18, 'x', 90, 1.0, 0, '#6b4a2a', '#FCD116'),
    vanishPlat(1600, GROUND_Y - 60, 100, 18, 2.0, 1.0, 0, '#6b4a2a', '#8a6a3a'),
    movingPlat(2120, GROUND_Y - 30, 90, 18, 'x', 100, 0.9, 0, '#6b4a2a', '#FCD116'),
    vanishPlat(2400, GROUND_Y - 20, 90, 18, 1.6, 1.2, 0.5, '#6b4a2a', '#8a6a3a'),
    movingPlat(2920, GROUND_Y - 40, 90, 18, 'x', 60, 1.1, 0, '#6b4a2a', '#FCD116'),
    vanishPlat(3520, GROUND_Y - 30, 90, 18, 1.8, 1.1, 0, '#6b4a2a', '#8a6a3a'),
    vanishPlat(3620, GROUND_Y - 30, 90, 18, 1.8, 1.1, 1.2, '#6b4a2a', '#8a6a3a'),
  ];
  const enemies = [
    mkEnemy('roller', 900, GROUND_Y - 18, { range: 150, speed: 90, w: 26, h: 26, stompable: false }),
    mkEnemy('flyer', 1500, GROUND_Y - 160, { range: 120, speed: 75, color: '#3a2a1a' }),
    mkEnemy('crawler', 1900, GROUND_Y - 28, { range: 70, speed: 60, color: '#8a6a3a' }),
    mkEnemy('roller', 2500, GROUND_Y - 18, { range: 160, speed: 95, w: 26, h: 26, stompable: false }),
    mkEnemy('flyer', 3150, GROUND_Y - 170, { range: 130, speed: 78, color: '#3a2a1a' }),
    mkEnemy('crawler', 3800, GROUND_Y - 28, { range: 80, speed: 62, color: '#8a6a3a' }),
  ];
  const collectibles = [
    ...scatter('nugget', 100, 550, 90, GROUND_Y - 40),
    mkC('cutlass', 1350, GROUND_Y - 90),
    mkC('starapple', 1650, GROUND_Y - 110),
    mkC('sugarcane', 2150, GROUND_Y - 80),
    mkC('nugget', 2450, GROUND_Y - 70),
    mkC('starapple', 2960, GROUND_Y - 90),
    mkC('starpower', 1150, GROUND_Y - 40), mkC('extralife', 1620, GROUND_Y - 90), mkC('speedboost', 2750, GROUND_Y - 40),
    mkC('bow', 3300, GROUND_Y - 40),
    ...scatter('nugget', 3750, 4050, 90, GROUND_Y - 40),
    mkC('gem', 660, GROUND_Y - 60), mkC('gem', 1630, GROUND_Y - 110), mkC('gem', 2950, GROUND_Y - 90),
  ];
  return {
    id: 7, name: 'Pork-Knocker Trail', location: 'The Interior', width: w, groundY: GROUND_Y,
    theme: 'mining', night: false,
    palette: { sky1: '#d8c48a', sky2: '#f3e9c8', ground: '#6b4a2a', groundTop: '#8a6a3a', accent: '#FCD116', accent2: '#CE1126' },
    playerStart: { x: 80, y: GROUND_Y - 46 }, checkpointX: 2050, endX: 4050,
    platforms, hazards: g.hazards, enemies, collectibles,
  };
}

// ================= LEVEL 8 : Bush Camp Clearing =================
function buildLevel8() {
  const w = 4200;
  const g = groundWithGaps(0, w, GROUND_Y, [[1000, 1180], [1900, 2080], [2800, 3000], [3500, 3680]],
    '#3a5a2e', '#4d7a3a', 'pit', '#14210f');
  const platforms = [...g.platforms,
    // ascending disappearing-platform puzzle towers
    vanishPlat(700, 380, 90, 18, 1.6, 1.1, 0, '#4a6b3a', '#6b8a4a'),
    vanishPlat(700, 280, 90, 18, 1.6, 1.1, 0.6, '#4a6b3a', '#6b8a4a'),
    vanishPlat(1020, 400, 80, 18, 1.5, 1.3, 0.3, '#4a6b3a', '#6b8a4a'),
    vanishPlat(1120, 320, 80, 18, 1.5, 1.3, 1.0, '#4a6b3a', '#6b8a4a'),
    movingPlat(1620, 380, 90, 18, 'x', 70, 1.0, 0, '#4a6b3a', '#6b8a4a'),
    vanishPlat(1920, 380, 80, 18, 1.4, 1.2, 0, '#4a6b3a', '#6b8a4a'),
    vanishPlat(2020, 300, 80, 18, 1.4, 1.2, 0.7, '#4a6b3a', '#6b8a4a'),
    plat(2420, 360, 100, 18, '#4a6b3a', '#6b8a4a'),
    vanishPlat(2820, 380, 80, 18, 1.3, 1.1, 0, '#4a6b3a', '#6b8a4a'),
    vanishPlat(2920, 300, 80, 18, 1.3, 1.1, 0.5, '#4a6b3a', '#6b8a4a'),
    movingPlat(3350, 340, 90, 18, 'y', 60, 0.9, 0, '#4a6b3a', '#6b8a4a'),
    vanishPlat(3520, 380, 80, 18, 1.3, 1.0, 0, '#4a6b3a', '#6b8a4a'),
    vanishPlat(3610, 300, 80, 18, 1.3, 1.0, 0.6, '#4a6b3a', '#6b8a4a'),
  ];
  const enemies = [
    mkEnemy('thief', 600, GROUND_Y - 24, { range: 100, speed: 55, w: 26, h: 26 }),
    mkEnemy('thief', 1500, GROUND_Y - 24, { range: 110, speed: 58, w: 26, h: 26 }),
    mkEnemy('crawler', 2250, GROUND_Y - 28, { range: 80, speed: 60, color: '#3a5a2e' }),
    mkEnemy('thief', 2600, GROUND_Y - 24, { range: 100, speed: 60, w: 26, h: 26 }),
    mkEnemy('flyer', 3150, 260, { range: 130, speed: 80, color: '#e8e8e8' }),
    mkEnemy('thief', 3900, GROUND_Y - 24, { range: 110, speed: 62, w: 26, h: 26 }),
  ];
  const collectibles = [
    ...scatter('nugget', 100, 550, 100, GROUND_Y - 40),
    mkC('starapple', 730, 340), mkC('cutlass', 1140, 280),
    mkC('sugarcane', 1650, 340), mkC('starapple', 1950, 340),
    mkC('nugget', 2450, 320), mkC('cassava', 2850, 340),
    mkC('starpower', 350, GROUND_Y - 40), mkC('speedboost', 2420, GROUND_Y - 40), mkC('extralife', 2940, 270),
    mkC('bow', 3150, GROUND_Y - 40),
    ...scatter('nugget', 3750, 4050, 90, GROUND_Y - 40),
    mkC('gem', 1165, 255), mkC('gem', 2050, 260), mkC('gem', 3640, 260),
  ];
  return {
    id: 8, name: 'Bush Camp Clearing', location: 'Deep Interior Forest', width: w, groundY: GROUND_Y,
    theme: 'camp', night: false,
    palette: { sky1: '#4a7a4a', sky2: '#9fce8a', ground: '#3a5a2e', groundTop: '#4d7a3a', accent: '#FCD116', accent2: '#CE1126' },
    playerStart: { x: 80, y: GROUND_Y - 46 }, checkpointX: 1850, endX: 4050,
    platforms, hazards: g.hazards, enemies, collectibles,
  };
}

// ================= LEVEL 9 : Shell Beach =================
function buildLevel9() {
  const w = 4400;
  const g = groundWithGaps(0, w, GROUND_Y, [], '#e8d29a', '#f5e6bb', 'water', '#2e93c9');
  // tide hazards sit right at the sand surface (not buried under the ground
  // fill) so a standing player actually touches the water when it surges in;
  // jumping high or timing the crossing when the tide is out avoids it.
  const hazards = [...g.hazards,
    new Hazard({ x: 700, y: GROUND_Y - 16, w: 220, h: 50, kind: 'tide', color: '#2e93c9', tideRange: 140, tideSpeed: 0.6 }),
    new Hazard({ x: 1600, y: GROUND_Y - 16, w: 220, h: 50, kind: 'tide', color: '#2e93c9', tideRange: 160, tideSpeed: 0.5 }),
    new Hazard({ x: 2600, y: GROUND_Y - 16, w: 220, h: 50, kind: 'tide', color: '#2e93c9', tideRange: 150, tideSpeed: 0.55 }),
    new Hazard({ x: 3500, y: GROUND_Y - 16, w: 220, h: 50, kind: 'tide', color: '#2e93c9', tideRange: 170, tideSpeed: 0.45 }),
  ];
  const platforms = [...g.platforms,
    plat(900, 380, 100, 18, '#e8d29a', '#f5e6bb'),
    plat(1200, 360, 100, 18, '#e8d29a', '#f5e6bb'),
    crumblePlat(1900, 380, 90, 18, '#e8d29a', '#f5e6bb'),
    plat(2150, 360, 100, 18, '#e8d29a', '#f5e6bb'),
    movingPlat(2900, 370, 100, 18, 'x', 80, 0.8, 0, '#e8d29a', '#f5e6bb'),
    plat(3800, 360, 110, 18, '#e8d29a', '#f5e6bb'),
  ];
  const enemies = [
    mkEnemy('crawler', 400, GROUND_Y - 26, { range: 80, speed: 50, color: '#2e6b4a' }),
    mkEnemy('flyer', 1350, 260, { range: 140, speed: 68, color: '#fff' }),
    mkEnemy('crawler', 2300, GROUND_Y - 26, { range: 90, speed: 55, color: '#2e6b4a' }),
    mkEnemy('flyer', 3200, 260, { range: 140, speed: 70, color: '#fff' }),
    mkEnemy('crawler', 4000, GROUND_Y - 26, { range: 90, speed: 58, color: '#2e6b4a' }),
  ];
  const collectibles = [
    // hatchling "escort" bonus collectibles - worth double points, themed to the beach objective
    mkC('starapple', 200, GROUND_Y - 40), mkC('starapple', 260, GROUND_Y - 40), mkC('starapple', 320, GROUND_Y - 40),
    ...scatter('nugget', 950, 1250, 100, 300),
    mkC('sugarcane', 2000, 300), mkC('cutlass', 2450, GROUND_Y - 40),
    mkC('extralife', 1050, 270), mkC('starpower', 2150, GROUND_Y - 40), mkC('speedboost', 3780, GROUND_Y - 40),
    mkC('bow', 1500, GROUND_Y - 40),
    ...scatter('nugget', 3000, 3300, 90, GROUND_Y - 40),
    mkC('cassava', 3850, 320),
    mkC('gem', 1230, 300), mkC('gem', 2170, 300), mkC('gem', 3830, 320),
  ];
  return {
    id: 9, name: 'Shell Beach', location: 'Shell Beach', width: w, groundY: GROUND_Y,
    theme: 'beach', night: false,
    palette: { sky1: '#bfe9f0', sky2: '#fff7e0', ground: '#e8d29a', groundTop: '#f5e6bb', accent: '#009E49', accent2: '#CE1126' },
    playerStart: { x: 80, y: GROUND_Y - 46 }, checkpointX: 2200, endX: 4250,
    platforms, hazards, enemies, collectibles,
  };
}

// ================= LEVEL 10 : Kanuku Mountains Trail =================
function buildLevel10() {
  const w = 5200;
  const g = groundWithGaps(0, w, GROUND_Y, [[500, 660], [1200, 1420], [2000, 2150], [2700, 2960], [3600, 3760], [4300, 4520]],
    '#5a6b4a', '#3fa34d', 'pit', '#12210f');
  const platforms = [...g.platforms,
    vanishPlat(520, GROUND_Y - 20, 80, 18, 1.6, 1.0, 0, '#5a6b4a', '#3fa34d'),
    vanishPlat(580, GROUND_Y - 20, 80, 18, 1.6, 1.0, 0.8, '#5a6b4a', '#3fa34d'),
    movingPlat(1230, GROUND_Y - 60, 90, 18, 'x', 90, 1.0, 0, '#5a6b4a', '#FCD116'),
    plat(1480, GROUND_Y - 90, 100, 18, '#5a6b4a', '#3fa34d'),
    crumblePlat(1700, GROUND_Y - 40, 90, 18, '#5a6b4a', '#3fa34d'),
    vanishPlat(2020, GROUND_Y - 40, 90, 18, 1.4, 1.1, 0, '#5a6b4a', '#3fa34d'),
    movingPlat(2350, GROUND_Y - 70, 90, 18, 'y', 60, 0.9, 0, '#5a6b4a', '#FCD116'),
    movingPlat(2720, GROUND_Y - 30, 100, 18, 'x', 110, 0.85, 0, '#5a6b4a', '#FCD116'),
    plat(2980, GROUND_Y - 90, 100, 18, '#5a6b4a', '#3fa34d'),
    crumblePlat(3200, GROUND_Y - 40, 90, 18, '#5a6b4a', '#3fa34d'),
    crumblePlat(3380, GROUND_Y - 40, 90, 18, '#5a6b4a', '#3fa34d'),
    vanishPlat(3620, GROUND_Y - 60, 90, 18, 1.4, 1.0, 0.4, '#5a6b4a', '#3fa34d'),
    movingPlat(3950, GROUND_Y - 40, 100, 18, 'x', 100, 0.9, 0, '#5a6b4a', '#FCD116'),
    plat(4200, GROUND_Y - 90, 100, 18, '#5a6b4a', '#3fa34d'),
    vanishPlat(4340, GROUND_Y - 30, 80, 18, 1.3, 1.0, 0, '#5a6b4a', '#3fa34d'),
    vanishPlat(4430, GROUND_Y - 30, 80, 18, 1.3, 1.0, 0.6, '#5a6b4a', '#3fa34d'),
  ];
  const enemies = [
    mkEnemy('crawler', 300, GROUND_Y - 28, { range: 80, speed: 55, color: '#8a5a2b' }),
    mkEnemy('flyer', 900, 260, { range: 130, speed: 75, color: '#e8e8e8' }),
    mkEnemy('charger', 1550, GROUND_Y - 30, { range: 260, speed: 65, color: '#1a1a1a', w: 40, h: 26 }),
    mkEnemy('roller', 1900, GROUND_Y - 18, { range: 150, speed: 100, w: 26, h: 26, stompable: false }),
    mkEnemy('crawler', 2450, GROUND_Y - 28, { range: 90, speed: 58, color: '#8a5a2b' }),
    mkEnemy('thief', 2850, GROUND_Y - 24, { range: 100, speed: 60, w: 26, h: 26 }),
    mkEnemy('flyer', 3300, 260, { range: 140, speed: 78, color: '#e8e8e8' }),
    mkEnemy('charger', 3850, GROUND_Y - 30, { range: 280, speed: 70, color: '#1a1a1a', w: 40, h: 26 }),
    mkEnemy('crawler', 4600, GROUND_Y - 28, { range: 100, speed: 62, color: '#8a5a2b' }),
    mkEnemy('roller', 4850, GROUND_Y - 18, { range: 160, speed: 105, w: 26, h: 26, stompable: false }),
  ];
  const collectibles = [
    ...scatter('nugget', 100, 450, 90, GROUND_Y - 40),
    mkC('cutlass', 700, GROUND_Y - 40),
    mkC('starapple', 1250, GROUND_Y - 100), mkC('starapple', 1500, GROUND_Y - 130),
    mkC('sugarcane', 1730, GROUND_Y - 80), mkC('nugget', 2040, GROUND_Y - 80),
    mkC('cassava', 3000, GROUND_Y - 130), mkC('nugget', 3220, GROUND_Y - 80),
    mkC('starapple', 3980, GROUND_Y - 80), mkC('nugget', 4220, GROUND_Y - 130),
    mkC('starpower', 1650, GROUND_Y - 40), mkC('extralife', 3055, GROUND_Y - 115), mkC('speedboost', 2200, GROUND_Y - 40),
    mkC('bow', 2600, GROUND_Y - 40),
    ...scatter('nugget', 4900, 5100, 90, GROUND_Y - 40),
    mkC('gem', 1270, GROUND_Y - 120), mkC('gem', 2380, GROUND_Y - 110), mkC('gem', 4000, GROUND_Y - 80),
  ];
  return {
    id: 10, name: 'Kanuku Mountains Trail', location: 'Kanuku Mountains', width: w, groundY: GROUND_Y,
    theme: 'mountains', night: false,
    palette: { sky1: '#7fb8d8', sky2: '#e3f3fb', ground: '#5a6b4a', groundTop: '#3fa34d', accent: '#CE1126', accent2: '#FCD116' },
    playerStart: { x: 80, y: GROUND_Y - 46 }, checkpointX: 2400, endX: 5050,
    platforms, hazards: g.hazards, enemies, collectibles,
  };
}

// LEVEL_BUILDERS: called fresh each time a level loads so every playthrough
// gets pristine entity instances (crumble/disappear/enemy state resets).
const LEVEL_BUILDERS = [
  buildLevel1, buildLevel2, buildLevel3, buildLevel4, buildLevel5,
  buildLevel6, buildLevel7, buildLevel8, buildLevel9, buildLevel10,
];

// LEVELS: a static reference build, handy for the title-screen background
// and anything that just needs level metadata without live entity state.
const LEVELS = LEVEL_BUILDERS.map((fn) => fn());
