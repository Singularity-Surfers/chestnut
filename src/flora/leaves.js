// Botanical leaf specifications for every broad-leaved species in the cove.
// len = blade length in metres. Palettes are mid-October colours (sRGB hex); w = relative frequency.
// arr: leaf arrangement on the twig — 'alt' (alternate), 'alt2' (alternate, two-ranked sprays),
//      'opp' (opposite), 'whorl' (crowded at twig tips), 'peltate' (stalk joins the centre of the blade: the sprite is
//      the whole round blade centred in its cell, no petiole), compound forms are described by `compound`.
// Painter options: secVein (0..1 strength of the side veins; spec- or variant-level), midW (midrib width factor),
//      net (white reticulate network), minAspect (minimum cell width / height), variant.tatter / variant.holes (damage).
// extras: fruit / flower / bud sprites. `size` is the height in metres of the box the sprite is painted in
//      (square unless the kind is a tall bud); the sprite's foot is at the bottom centre.

const P = (blade, vein, edge, w = 1, extra = {}) => ({ blade, vein, edge, w, ...extra });

export const LEAVES = {
  // ------------------------------------------------------------------ canopy
  chestnut: {
    extras: [{ kind: 'bur', size: 0.065, open: false }, { kind: 'bur', size: 0.085, open: true }, { kind: 'bur', size: 0.085, open: true, dry: true }, { kind: 'nut', size: 0.026 }],
    len: 0.19, pet: 0.07, arr: 'alt', quilt: 0.8,
    shape: { kind: 'simple', ar: 4.0, p: 0.52, ba: 1.25, ta: 1.25, drip: 0.16, bend: 0.06,
      margin: { type: 'bristle', onVeins: true, depth: 0.34, fwd: 1.2, y0: 0.1 },
      veins: { type: 'pinnate', n: 17, ang: 52, y0: 0.07, y1: 0.93, curve: 0.002, fan: 0.6 } },
    palette: [
      P('#d6a41c', '#e9c94c', '#c2851a', 4, { edgeAmt: 0.45, spots: 3 }),
      P('#e0bb2c', '#ecd766', '#cf9a22', 3, { edgeAmt: 0.35, spots: 2 }),
      P('#c98a1c', '#e2b23e', '#9c5c18', 2, { edgeAmt: 0.6, spots: 5 }),
      P('#a36a22', '#c79a3c', '#74441a', 1.4, { edgeAmt: 0.7, spots: 6 }),
      P('#b3a62c', '#7f9a30', '#d4a51f', 1.3, { edgeAmt: 0.55, veinGlow: 0.75, glowW: 2.2, spots: 2 }),
      P('#e6c63a', '#f0dc78', '#b9801c', 1.2, { edgeAmt: 0.5, spots: 3 }),
    ],
    litter: ['#9b6a2c', '#84552a', '#b08a3e', '#6f4824', '#c39a45'],
  },
  redoak: {
    len: 0.17, pet: 0.16, arr: 'alt',
    // 7-9 lobes, each ending in 2-3 bristle-tipped teeth; U-shaped sinuses cut 40-50% of the way to the midrib
    shape: { kind: 'oak', ar: 1.5, n: [3, 4], sinus: 0.56, sinusW: 0.4, tips: 'bristle', p: 0.52, ba: 0.62, ta: 0.72,
      lobeAng: 60, lobeAng1: 38, y0: 0.22, y1: 0.82, first: 0.78, spread: 0.8, tooth: 0.2, teeth2: 0.35, baseX: 0.24, termW: 0.13 },
    palette: [
      P('#77863a', '#96a04c', '#8a5a2a', 2.0, { edgeAmt: 0.55, blotchCols: ['#8a5a2a', '#96a04c', '#a8662a'] }),
      P('#96983c', '#b0ac52', '#a8662a', 1.4, { edgeAmt: 0.6, edgeW: 0.08, blotchCols: ['#b0642a', '#a0a044'] }),
      P('#9a4a22', '#b8703a', '#74301a', 2.6), P('#b0561e', '#c87a2e', '#8a3a1a', 1.9),
      P('#b63c1c', '#cf6028', '#8a2416', 1.8, { blotchCols: ['#c87a2e', '#8a2416'] }), P('#8a3220', '#a85a2c', '#6a241a', 1.0),
    ],
    litter: ['#7a4a26', '#6a3c20', '#8a5a30', '#5c341e'],
  },
  scarletoak: {
    len: 0.15, pet: 0.2, arr: 'alt', gloss: 0.6,
    // 7 lobes that widen toward many-toothed ends; wide C-shaped sinuses cut 70-80% of the way to the midrib
    shape: { kind: 'oak', ar: 1.3, n: 3, sinus: 0.76, sinusW: 0.66, tips: 'bristle', p: 0.5, ba: 0.6, ta: 0.7,
      lobeAng: 70, lobeAng1: 46, y0: 0.2, y1: 0.76, first: 0.78, spread: 1.45, tooth: 0.24, teeth2: 0.8, baseX: 0.16, termW: 0.12 },
    palette: [
      P('#b5201a', '#cc4a26', '#8c1616', 3), P('#a01a1c', '#c0402a', '#7a1418', 2), P('#c4381c', '#d86a2a', '#98241a', 1.5), P('#8c2a1e', '#a84a2a', '#6a1c18', 1),
      P('#4f6e2c', '#6a8438', '#b5201a', 2, { edgeAmt: 0.75, edgeW: 0.09, edgeBlur: 0.1, blotchCols: ['#b5201a', '#6a8438', '#c4381c'] }),
    ],
    litter: ['#7a3a24', '#6a3220', '#8a4a2a'],
  },
  chestnutoak: {
    len: 0.16, pet: 0.12, arr: 'alt', quilt: 0.6,
    shape: { kind: 'simple', ar: 2.0, p: 0.58, ba: 1.35, ta: 0.85, bend: 0.03,
      margin: { type: 'crenate', onVeins: false, n: 11, depth: 0.2, y0: 0.14 },
      veins: { type: 'pinnate', n: 11, ang: 46, y0: 0.1, y1: 0.92, fan: 0.5 } },
    palette: [P('#b8862a', '#d0a640', '#96621f', 3), P('#c79a32', '#dcb850', '#a8762a', 2.5), P('#a5652a', '#c08a3a', '#82481f', 2), P('#8f5a28', '#ac7a38', '#6e421e', 1.2), P('#9a9a34', '#8a9a36', '#b8902a', 0.8)],
    litter: ['#80582c', '#6e4a26', '#93693a'],
  },
  whiteoak: {
    len: 0.16, pet: 0.07, arr: 'alt',
    // 7-9 finger-like rounded lobes, sinuses cut 50-80% of the way in, obovate (widest at 60-65%), wedge base
    shape: { kind: 'oak', ar: 1.8, n: [3, 4], sinus: 0.66, sinusW: 0.3, tips: 'round', p: 0.63, ba: 1.2, ta: 0.78,
      lobeAng: 60, lobeAng1: 36, y0: 0.2, y1: 0.8, first: 0.8, lobeW: 1.0, subLobe: 0.3, baseX: 0.1 },
    palette: [
      P('#6f7d3c', '#8f9a52', '#7a5a34', 2.4, { edgeAmt: 0.5, blotchCols: ['#8a5a34', '#8f9a52'] }),
      P('#7f8640', '#9aa058', '#8a5c30', 1.6, { edgeAmt: 0.6, edgeW: 0.07, blotchCols: ['#8f5a34', '#7a2c34'] }),
      P('#8f5a34', '#a87848', '#6c4026', 2.4), P('#7c4a2c', '#9c6a40', '#5e3422', 1.6, { spots: 5 }),
      P('#7a2c34', '#98484a', '#581e28', 1.3), P('#8a3a34', '#a85a44', '#6a2a2a', 0.7, { blotchCols: ['#8f5a34', '#7a2c34'] }),
    ],
    litter: ['#7d5a3c', '#6c4c34', '#8c6a48'],
  },
  redmaple: {
    len: 0.095, pet: 0.62, petW: 0.022, arr: 'opp',
    shape: { kind: 'palmate', baseY: 0.0, body: { rx: 0.24, ry: 0.20, cy: 0.20 },
      teeth: { type: 'serrate', n: 7, depth: 0.16, from: 0.3 },
      lobes: [
        { ang: 0, len: 1.0, w: 0.25, p: 0.38, ta: 1.5, baseW: 0.8, sec: 4 },
        { ang: 44, len: 0.84, w: 0.21, p: 0.4, ta: 1.5, baseW: 0.8, sec: 3 },
        { ang: 92, len: 0.40, w: 0.13, p: 0.4, ta: 1.6, baseW: 0.8, sec: 2 },
      ] },
    palette: [
      P('#c41f18', '#d84a22', '#a01418', 4, { pet: '#9a1f28' }), P('#a8141c', '#c4342a', '#84101a', 2.5, { pet: '#8a1a24' }),
      P('#d6451a', '#e87a2a', '#b82a18', 2.5, { pet: '#a02a24' }), P('#e06c1c', '#eca038', '#c8441a', 1.5, { pet: '#a83a22' }),
      P('#e2a628', '#ecc850', '#cc3a1c', 1.3, { edgeAmt: 0.8, edgeW: 0.12, edgeBlur: 0.12, pet: '#b03024' }),
      P('#b6282a', '#cf5236', '#7c1622', 1, { pet: '#8a1a24' }),
    ],
    litter: ['#8a2c22', '#a04428', '#7a3a26', '#b06030'],
  },
  sugarmaple: {
    len: 0.115, pet: 0.6, petW: 0.02, arr: 'opp',
    shape: { kind: 'palmate', baseY: 0.0, body: { rx: 0.30, ry: 0.22, cy: 0.20 },
      lobes: [
        { ang: 0, len: 1.0, w: 0.195, p: 0.56, ta: 2.4, baseW: 1.0, sec: 4, shoulders: [{ at: 0.60, ang: 42, len: 0.24, w: 0.42, ta: 2.6 }] },
        { ang: 52, len: 0.88, w: 0.172, p: 0.55, ta: 2.4, baseW: 0.97, sec: 3, shoulders: [{ at: 0.58, ang: 40, len: 0.22, w: 0.42, ta: 2.6 }] },
        { ang: 103, len: 0.50, w: 0.125, p: 0.5, ta: 2.4, baseW: 0.9, sec: 2 },
      ] },
    palette: [
      P('#e77f1a', '#f0b23c', '#d8501c', 4, { tip: '#d8401c' }), P('#e9b324', '#f1d45c', '#e07a1e', 3),
      P('#d9521c', '#ea8a2c', '#bc2e1a', 2.5), P('#eca02a', '#f3c95a', '#d8641c', 2, { tip: '#d44a1c' }),
      P('#e8c63a', '#f0dd72', '#dc9a26', 1.5), P('#cf3c1c', '#e4702a', '#a82218', 1),
    ],
    litter: ['#b0702a', '#a05a26', '#c08a36', '#8a4a24'],
  },
  tulip: {
    len: 0.125, pet: 1.0, petW: 0.02, arr: 'alt',
    // four pointed lobes: two lateral pointing sideways, two apical pointing up-and-out, a broad shallow notch
    // between them; flat base; as wide as long
    shape: { kind: 'custom', jitter: 0.035,
      half: [[0.0, 0.0], [0.13, -0.014, 'r'], [0.3, 0.03, 'r'], [0.5, 0.3], [0.31, 0.47, 'r'], [0.285, 0.56, 'r'], [0.4, 0.975], [0.2, 0.925, 'r'], [0.0, 0.86]],
      veinLines: [
        { pts: [[0, 0.0], [0, 0.45], [0, 0.855]], w: 1.2, main: true, mirror: false },
        { pts: [[0, 0.03], [0.25, 0.13], [0.485, 0.295]], w: 0.9 }, { pts: [[0, 0.34], [0.19, 0.63], [0.39, 0.955]], w: 0.9 },
        { pts: [[0, 0.012], [0.15, 0.02], [0.3, 0.085]], w: 0.42 }, { pts: [[0, 0.15], [0.18, 0.26], [0.37, 0.39]], w: 0.5 }, { pts: [[0, 0.25], [0.14, 0.38], [0.28, 0.51]], w: 0.45 },
        { pts: [[0, 0.5], [0.1, 0.71], [0.2, 0.9]], w: 0.5 }, { pts: [[0, 0.65], [0.05, 0.77], [0.09, 0.88]], w: 0.4 },
      ] },
    palette: [
      P('#e6cf4a', '#f0e086', '#cfa62a', 4, { blotch: 6, blotchCols: ['#cfa62a', '#f0e086', '#a8782e'] }),
      P('#e2c63e', '#eeda74', '#b98a26', 3, { blotch: 7, blotchCols: ['#a8782e', '#eeda74', '#8a5a26'], spots: 5 }),
      P('#ecd75e', '#f4e794', '#d8b434', 2), P('#c4bc3c', '#a6ae3a', '#d6b42a', 1.2, { veinGlow: 0.7, glowW: 2 }),
      P('#c9a234', '#debe52', '#8a5a26', 1.6, { edgeAmt: 0.7, edgeW: 0.08, blotch: 8, blotchCols: ['#8a5a26', '#a8742c', '#debe52'], spots: 8 }),
    ],
    litter: ['#a8862e', '#8f6c2a', '#b89a40'],
  },
  ybirch: {
    len: 0.10, pet: 0.12, arr: 'alt2', quilt: 0.7,
    shape: { kind: 'simple', ar: 1.85, p: 0.34, ba: 0.46, ta: 1.5, drip: 0.10, cordate: 0.016,
      margin: { type: 'dserrate', n: 11, depth: 0.15, fwd: 0.8, onVeins: true },
      veins: { type: 'pinnate', n: 11, ang: 44, y0: 0.06, y1: 0.9, fan: 0.6 } },
    palette: [P('#e2c02a', '#eeda64', '#cfa222', 4), P('#d9b024', '#e8cc50', '#bf8f20', 3), P('#e8cf48', '#f2e284', '#d8b430', 2), P('#c9a830', '#a8a838', '#d8ae28', 1)],
    litter: ['#a8842e', '#927030', '#b89842'],
  },
  bbirch: {
    len: 0.095, pet: 0.14, arr: 'alt2', quilt: 0.7,
    shape: { kind: 'simple', ar: 1.9, p: 0.33, ba: 0.42, ta: 1.5, drip: 0.10, cordate: 0.04,
      margin: { type: 'dserrate', n: 12, depth: 0.12, fwd: 0.8, onVeins: true },
      veins: { type: 'pinnate', n: 12, ang: 45, y0: 0.06, y1: 0.9, fan: 0.6 } },
    palette: [P('#e3b526', '#efd058', '#c9951e', 4), P('#dca520', '#e9c348', '#b8821c', 3), P('#e9c63a', '#f1dc78', '#d4a628', 2)],
    litter: ['#a8842e', '#927030'],
  },
  beech: {
    len: 0.105, pet: 0.06, arr: 'alt2', quilt: 0.9,
    shape: { kind: 'simple', ar: 2.05, p: 0.48, ba: 0.9, ta: 1.45, drip: 0.10,
      margin: { type: 'serrate', onVeins: true, depth: 0.10, fwd: 1.0 },
      veins: { type: 'pinnate', n: 12, ang: 42, y0: 0.07, y1: 0.92, curve: 0.001, fan: 0.4 } },
    palette: [P('#c9912a', '#deb24a', '#a8701f', 3.5), P('#d9b030', '#e8cc5c', '#bf8c26', 3), P('#b0702a', '#cc9440', '#8a5020', 1.7), P('#b8935a', '#ccae72', '#96744a', 1.5),
      P('#b9a83a', '#96a43a', '#cf9d2a', 1, { veinGlow: 0.7, glowW: 2 }), P('#bcb83c', '#a8b242', '#c9a02c', 1.6, { edgeAmt: 0.45 })],
    litter: ['#a8804a', '#96703e', '#b89258', '#86602f'],
  },
  hickory: {
    len: 0.15, pet: 0.03, arr: 'alt', compound: { type: 'pinnate', n: 5, rachis: 0.2, sizes: [0.55, 0.8, 1.0], petiole: 0.07 },
    shape: { kind: 'simple', ar: 2.5, p: 0.58, ba: 1.25, ta: 1.3, drip: 0.10,
      margin: { type: 'serrate', n: 22, depth: 0.09, fwd: 0.8 },
      veins: { type: 'pinnate', n: 12, ang: 50, y0: 0.07, y1: 0.92 } },
    palette: [P('#dba51e', '#ebc94e', '#c0861a', 4), P('#e3b82a', '#f0d662', '#c9982a', 3), P('#c98f1c', '#e0b23e', '#a06a1a', 2), P('#a8742a', '#c69a40', '#7e521e', 1.2, { spots: 6 })],
    litter: ['#8f6a2c', '#7c5a28', '#a07c38'],
  },
  basswood: {
    len: 0.13, pet: 0.32, arr: 'alt2',
    // nearly round, coarse sharp teeth, an abrupt drawn-out point, and a lopsided heart-shaped base
    shape: { kind: 'round', ar: 1.1, cy: 0.45, sinus: 0.3, sinusR: 0.45, sinusSharp: 6, oblique: 0.26, acumen: { len: 0.26, w: 9.5, k: 1.25 },
      margin: { type: 'serrate', n: 19, depth: 0.09 }, veins: { type: 'pinnate', n: 6, ang: 52 } },
    palette: [P('#c9b83a', '#dccd62', '#b09a2e', 3), P('#b8b040', '#a8b048', '#c8aa32', 2.5), P('#d4c24a', '#e4d678', '#bca436', 2), P('#b8963a', '#cfb252', '#94742c', 1, { spots: 7 })],
    litter: ['#8c7434', '#7a642e'],
  },
  buckeye: {
    len: 0.14, pet: 0.02, arr: 'opp', compound: { type: 'palmate', n: 5, petiole: 0.13, sizes: [0.68, 0.9, 1.0] },
    shape: { kind: 'simple', ar: 2.7, p: 0.6, ba: 1.5, ta: 1.2, drip: 0.12,
      margin: { type: 'serrate', n: 30, depth: 0.06, fwd: 0.8 }, veins: { type: 'pinnate', n: 15, ang: 55, y0: 0.08, y1: 0.93 } },
    palette: [P('#e0902a', '#eeb850', '#c66e20', 3), P('#d8a030', '#e8c35a', '#b88024', 3), P('#c8742a', '#de9c44', '#9a521e', 1.5, { spots: 7 }), P('#e6b63a', '#f0d26a', '#d08c26', 1.5)],
    litter: ['#96682c', '#845828'],
  },
  blackgum: {
    len: 0.085, pet: 0.14, arr: 'alt', gloss: 0.7,
    shape: { kind: 'simple', ar: 1.9, p: 0.58, ba: 1.2, ta: 0.95, drip: 0.10, veins: { type: 'pinnate', n: 8, ang: 50, y0: 0.08, y1: 0.86, curve: 0.012 } },
    palette: [P('#c0181c', '#d8402a', '#96101a', 4), P('#a81420', '#c4342c', '#7c0e1a', 3), P('#d43a1a', '#e8702a', '#b0221a', 2), P('#8a1a30', '#a83640', '#641226', 1.5), P('#e07a22', '#ecaa40', '#c84a1c', 1)],
    litter: ['#7a2c24', '#8a3a28'],
  },
  magnolia: {
    // cucumber magnolia: plain elliptic blade
    len: 0.22, pet: 0.12, arr: 'whorl', veinW: 0.8,
    shape: { kind: 'simple', ar: 2.2, p: 0.66, ba: 1.5, ta: 0.75, drip: 0.06, bend: 0.03, veins: { type: 'pinnate', n: 13, ang: 58, y0: 0.08, y1: 0.9, curve: 0.012 } },
    palette: [P('#c8a83a', '#dcc260', '#a8862e', 3), P('#b8923a', '#d0ae54', '#94702a', 2.5), P('#a9843c', '#c4a052', '#84622a', 2, { spots: 6 }), P('#a8a83e', '#96a640', '#c0a034', 1.5)],
    litter: ['#8f7238', '#7c6230', '#a08444'],
  },
  frasermagnolia: {
    // Fraser magnolia: very large, widest at about 70%, narrowing to a base with two backward-pointing ear lobes
    len: 0.34, pet: 0.17, petW: 0.022, arr: 'whorl', veinW: 0.8,
    shape: { kind: 'simple', ar: 2.4, p: 0.7, ba: 1.1, ta: 0.72, drip: 0.05, bend: 0.03, asym: 0.07,
      auricle: { len: 0.1, w: 0.085, waist: 0.045 },
      veins: { type: 'pinnate', n: 13, ang: 56, y0: 0.13, y1: 0.9, curve: 0.012 } },
    palette: [
      P('#d9c768', '#e8dc90', '#b89a44', 3), P('#cdb65a', '#e0cc7c', '#a8863a', 2.5, { spots: 4 }),
      P('#c2a45e', '#d6bc7a', '#96764a', 2.2, { spots: 6, blotchCols: ['#96764a', '#d6bc7a', '#8a6236'] }),
      P('#b0905a', '#c8aa72', '#86683e', 1.3, { spots: 8, blotch: 7, blotchCols: ['#86683e', '#7a5630'] }),
      P('#c4c060', '#aab452', '#c8a84a', 1, { veinGlow: 0.6, glowW: 1.8 }),
    ],
    litter: ['#9a7c44', '#866a3a', '#a88c52'],
  },
  ash: {
    len: 0.10, pet: 0.06, arr: 'opp', compound: { type: 'pinnate', n: 7, rachis: 0.20, sizes: [0.8, 0.95, 1.0, 1.0], petiole: 0.06, opposite: true },
    shape: { kind: 'simple', ar: 2.3, p: 0.42, ba: 0.95, ta: 1.5, drip: 0.10, margin: { type: 'serrate', n: 14, depth: 0.04 }, veins: { type: 'pinnate', n: 9, ang: 52, curve: 0.01 } },
    palette: [P('#7a3048', '#9a4a58', '#5c2238', 3), P('#9a4a3a', '#b86a4a', '#783430', 2), P('#c9a030', '#dfc058', '#a87e26', 2.5), P('#8a5a4a', '#a8785a', '#6a4238', 1)],
    litter: ['#7a5a3a', '#6a4c30'],
  },
  // ------------------------------------------------------------------ understory trees
  dogwood: {
    extras: [{ kind: 'berries', size: 0.03, col: '#c8161a', n: [3, 4], oval: 1.5, berry: 0.27, tight: true }, { kind: 'berries', size: 0.034, col: '#d01c1c', n: [5, 6], oval: 1.5, berry: 0.24, tight: true },
      { kind: 'dogbud', size: 0.014 }],
    len: 0.10, pet: 0.10, arr: 'opp', quilt: 0.7,
    shape: { kind: 'simple', ar: 1.75, p: 0.46, ba: 0.9, ta: 1.3, drip: 0.10, margin: { type: 'wavy', n: 5, depth: 0.05 },
      veins: { type: 'arcuate', n: 6, ang: 46, y0: 0.08, y1: 0.66, curl: 1.0 } },
    palette: [P('#b0202a', '#c8443a', '#881826', 4), P('#8a1c2c', '#a83a40', '#661424', 3), P('#c43a2a', '#d86a3a', '#9c2424', 2), P('#7a1e2c', '#983a44', '#5a1622', 1.5), P('#c8502e', '#dc8444', '#a23426', 1)],
    litter: ['#7a3028', '#6a2a26', '#8a4030'],
  },
  stripedmaple: {
    len: 0.15, pet: 0.4, petW: 0.02, arr: 'opp',
    shape: { kind: 'palmate', baseY: 0.0, body: { rx: 0.40, ry: 0.36, cy: 0.36 },
      teeth: { type: 'dserrate', n: 12, depth: 0.07, from: 0.1 },
      lobes: [
        { ang: 0, len: 1.0, w: 0.30, p: 0.55, ta: 2.0, baseW: 1.0, sec: 5 },
        { ang: 33, len: 0.86, w: 0.24, p: 0.6, ta: 2.2, baseW: 1.0, sec: 4 },
        { ang: 80, len: 0.42, w: 0.26, p: 0.5, ta: 0.9, baseW: 1.0, sec: 2 },
      ] },
    palette: [P('#e6d048', '#f0e384', '#d4b63a', 4), P('#dcc238', '#ead870', '#c2a430', 3), P('#e9da66', '#f3eaa0', '#dcc44a', 2), P('#c8c048', '#b0b848', '#d8c040', 1)],
    litter: ['#a89040', '#96803a'],
  },
  sourwood: {
    extras: [{ kind: 'capsules', size: 0.16 }],
    len: 0.14, pet: 0.09, arr: 'alt', gloss: 0.5,
    shape: { kind: 'simple', ar: 2.9, p: 0.46, ba: 1.1, ta: 1.5, drip: 0.10, bend: 0.06,
      margin: { type: 'serrate', n: 44, depth: 0.045, fwd: 0.8 }, veins: { type: 'pinnate', n: 11, ang: 56, y0: 0.07, y1: 0.9, curve: 0.012 } },
    palette: [P('#a81826', '#c63a36', '#801222', 4), P('#8a1422', '#aa3034', '#660e1c', 3), P('#c2302a', '#da5c3a', '#9a2024', 2), P('#b84a2a', '#d27a40', '#923424', 1.5), P('#6e1830', '#8c3044', '#501026', 1)],
    litter: ['#7a2e2a', '#6a2826'],
  },
  hornbeam: {
    len: 0.085, pet: 0.09, arr: 'alt2', quilt: 0.9,
    shape: { kind: 'simple', ar: 1.95, p: 0.42, ba: 0.75, ta: 1.5, drip: 0.10,
      margin: { type: 'dserrate', onVeins: true, depth: 0.14, fwd: 0.9 }, veins: { type: 'pinnate', n: 13, ang: 44, y0: 0.06, y1: 0.92, fan: 0.4 } },
    palette: [P('#d8782a', '#e8a44a', '#b85420', 3), P('#dcae30', '#eaca5c', '#c08a26', 3), P('#c8402a', '#dc6e3c', '#a02a22', 1.5), P('#e6c44a', '#f0da7c', '#cc9c30', 1.5)],
    litter: ['#9a6a34', '#865a2e'],
  },
  serviceberry: {
    len: 0.075, pet: 0.2, arr: 'alt',
    shape: { kind: 'simple', ar: 1.8, p: 0.44, ba: 0.42, ta: 1.3, drip: 0.08, cordate: 0.03, margin: { type: 'serrate', n: 30, depth: 0.05 }, veins: { type: 'pinnate', n: 11, ang: 50, curve: 0.01 } },
    palette: [P('#d2602a', '#e48a40', '#b04020', 4), P('#c8442a', '#dc703a', '#a02c22', 3), P('#dc9a2a', '#eabc50', '#c07420', 2), P('#b8382e', '#d05c3e', '#902426', 1)],
    litter: ['#8a5630', '#7a482a'],
  },
  // ------------------------------------------------------------------ shrubs
  witchhazel: {
    extras: [{ kind: 'hazelflower', size: 0.055 }, { kind: 'hazelflower', size: 0.05 }],
    len: 0.11, pet: 0.08, arr: 'alt2', quilt: 0.8,
    shape: { kind: 'simple', ar: 1.5, p: 0.6, ba: 0.85, ta: 0.95, asym: 0.12, oblique: 0.1,
      margin: { type: 'crenate', n: 7, depth: 0.16, y0: 0.2 }, veins: { type: 'pinnate', n: 6, ang: 44, y0: 0.1, y1: 0.86, fan: 0.4 } },
    palette: [P('#e0b828', '#eed460', '#c79a20', 4), P('#d8a822', '#e8c650', '#b8881c', 3), P('#e6c840', '#f1de7c', '#d0a82c', 2), P('#c9b83a', '#aab03e', '#d6ac2a', 1.2), P('#c8942a', '#debc4a', '#9e6c20', 1, { spots: 6 })],
    litter: ['#a08032', '#8c6c2c'],
  },
  spicebush: {
    extras: [{ kind: 'berries', size: 0.03, col: '#d0201c', n: 3, oval: 1.3 }],
    len: 0.10, pet: 0.10, arr: 'alt',
    shape: { kind: 'simple', ar: 2.15, p: 0.58, ba: 1.25, ta: 1.2, drip: 0.08, veins: { type: 'pinnate', n: 6, ang: 48, y0: 0.1, y1: 0.8, curve: 0.014 } },
    palette: [P('#e8cc30', '#f2e06c', '#d4ae26', 4), P('#e0c028', '#eed85e', '#c6a022', 3), P('#d8c440', '#e8da78', '#c0a632', 2), P('#c4c044', '#aab444', '#d8c034', 1)],
    litter: ['#a89038', '#948032'],
  },
  viburnum: {
    extras: [{ kind: 'berries', size: 0.045, col: '#1a1c34', n: 9, stalk: 'rgba(176,58,62,0.95)' }],
    len: 0.085, pet: 0.25, arr: 'opp',
    shape: { kind: 'palmate', baseY: 0.0, body: { rx: 0.36, ry: 0.30, cy: 0.30 },
      teeth: { type: 'dentate', n: 5, depth: 0.22, from: 0.15 },
      lobes: [
        { ang: 0, len: 1.0, w: 0.30, p: 0.5, ta: 1.5, baseW: 1.0, sec: 4 },
        { ang: 48, len: 0.80, w: 0.26, p: 0.5, ta: 1.5, baseW: 1.0, sec: 3 },
      ] },
    palette: [P('#d0606a', '#e6ae8e', '#a83c50', 3, { veinLine: '#ead9a2' }), P('#c24a5c', '#dc9a86', '#8e2c46', 2.4, { veinLine: '#e6d09a' }), P('#de8478', '#ecc09c', '#c05a60', 2.8, { veinLine: '#efe0aa' }),
      P('#864062', '#a8647a', '#642a4a', 1.8, { veinLine: '#d8b4a0' }), P('#e29c7e', '#efc8a4', '#c66c5c', 1.8, { veinLine: '#f0e2b0' }), P('#d8a85a', '#e8c680', '#c0705a', 0.8)],
    litter: ['#8a4a48', '#7a3e40'],
  },
  blueberry: {
    len: 0.04, pet: 0.06, arr: 'alt',
    shape: { kind: 'simple', ar: 1.9, p: 0.5, ba: 0.9, ta: 1.2, veins: { type: 'pinnate', n: 5, ang: 48, curve: 0.012 } },
    palette: [P('#c41e2a', '#dc4c3c', '#9c1424', 4), P('#a81a2a', '#c43c3c', '#801222', 3), P('#d8402a', '#e8703c', '#b02822', 2), P('#b83a52', '#d0606c', '#902640', 1)],
    litter: ['#7a2c2a'],
  },
  rhododendron: {
    extras: [{ kind: 'rhodobud', size: 0.028 }],
    len: 0.17, pet: 0.12, petW: 0.03, arr: 'whorl', gloss: 1.0, evergreen: true, tertiary: 0.05, veinW: 0.7,
    // thick and leathery: only the pale midrib shows; the side veins are sunk out of sight
    secVein: 0.1, midW: 1.25,
    shape: { kind: 'simple', ar: 3.3, p: 0.54, ba: 1.15, ta: 1.05, bend: 0.03, veins: { type: 'pinnate', n: 12, ang: 62, y0: 0.08, y1: 0.9, curve: 0.014 } },
    palette: [
      P('#27472a', '#3a5e30', '#1c3620', 4, { veinLine: '#9cab62', veinGlow: 0.25, edgeAmt: 0.5, spots: 1, holeP: 0.1, mottle: 0.2 }),
      P('#2f5430', '#44693a', '#223e26', 3, { veinLine: '#a2b266', veinGlow: 0.25, edgeAmt: 0.5, spots: 1, holeP: 0.1, mottle: 0.2 }),
      P('#223f24', '#35552e', '#18301c', 2, { veinLine: '#909f58', veinGlow: 0.2, edgeAmt: 0.5, spots: 2, holeP: 0.15, mottle: 0.2 }),
      P('#b8a23a', '#ccb854', '#8e7a2a', 0.35, { veinLine: '#d8c870', spots: 6, secVein: 0.3 }),
    ],
    litter: ['#6a5630', '#5c4a2a'],
  },
  laurel: {
    len: 0.08, pet: 0.14, petW: 0.03, arr: 'whorl', gloss: 0.9, evergreen: true, tertiary: 0.05, veinW: 0.6,
    secVein: 0.1, midW: 1.3,
    shape: { kind: 'simple', ar: 2.9, p: 0.5, ba: 1.1, ta: 1.2, veins: { type: 'pinnate', n: 8, ang: 60, curve: 0.014 } },
    palette: [
      P('#42632a', '#56783a', '#324e22', 4, { veinLine: '#b4be62', veinGlow: 0.3, edgeAmt: 0.4, spots: 1, holeP: 0.1, mottle: 0.2 }),
      P('#4d6e30', '#62833e', '#3a5626', 3, { veinLine: '#bcc66a', veinGlow: 0.3, edgeAmt: 0.4, spots: 1, holeP: 0.1, mottle: 0.2 }),
      P('#3a5626', '#4c6a32', '#2a4420', 2, { veinLine: '#a8b258', veinGlow: 0.3, edgeAmt: 0.4, spots: 2, mottle: 0.2 }),
      P('#b89a38', '#ccb252', '#8e722a', 0.3, { spots: 6, secVein: 0.3 }),
    ],
    litter: ['#6a5630'],
  },
  doghobble: {
    len: 0.11, pet: 0.07, arr: 'alt2', gloss: 1.0, evergreen: true, tertiary: 0.05, secVein: 0.22,
    shape: { kind: 'simple', ar: 3.2, p: 0.36, ba: 0.85, ta: 1.5, drip: 0.14, bend: 0.06,
      margin: { type: 'serrate', n: 30, depth: 0.045, fwd: 0.9 }, veins: { type: 'pinnate', n: 9, ang: 55, curve: 0.014 } },
    palette: [
      P('#22442a', '#34583a', '#183420', 4, { veinLine: '#7e9658', veinGlow: 0.2, edgeAmt: 0.4, spots: 1, holeP: 0.1, mottle: 0.2 }),
      P('#2c5232', '#3e6642', '#203e28', 3, { veinLine: '#88a060', veinGlow: 0.2, edgeAmt: 0.4, spots: 1, holeP: 0.1, mottle: 0.2 }),
      P('#5a2a30', '#74404a', '#421c24', 0.8, { veinLine: '#9a6a5a', spots: 2 }),
      P('#3a4a2a', '#50603a', '#5a2a2c', 0.8, { veinLine: '#8a9458', edgeAmt: 0.7, edgeW: 0.1, spots: 2 }),
    ],
    litter: ['#5c4a2a'],
  },
  hobblebush: {
    extras: [{ kind: 'berries', size: 0.04, col: '#b0182a', n: 7 }],
    len: 0.14, pet: 0.14, arr: 'opp', quilt: 1.0,
    shape: { kind: 'round', ar: 1.12, cy: 0.46, sinus: 0.25, sinusR: 0.55, sinusSharp: 5, tip: 0.10, tipSharp: 12,
      margin: { type: 'serrate', n: 34, depth: 0.035 }, veins: { type: 'pinnate', n: 6, ang: 58 } },
    palette: [
      P('#8a2440', '#a84458', '#661a32', 3, { blotch: 8, blotchCols: ['#c85a70', '#a8a840', '#6a2848'] }),
      P('#c85a70', '#dc8290', '#a23c54', 3, { blotch: 8, blotchCols: ['#8a2440', '#d8a070', '#e8c8a0'] }),
      P('#6a2848', '#88445e', '#4c1a36', 2, { blotch: 7, blotchCols: ['#a03a5a', '#8a7a3a'] }),
      P('#a8a840', '#bcbc5c', '#8a2e4a', 2, { edgeAmt: 0.8, edgeW: 0.14, edgeBlur: 0.14, blotch: 8, blotchCols: ['#c85a70', '#7a9a3a'] }),
      P('#b8683a', '#cc8a52', '#8a2a44', 1.2, { edgeAmt: 0.7, edgeW: 0.12, blotch: 6 }),
    ],
    litter: ['#7a4a40', '#6a3e3a'],
  },
  // ------------------------------------------------------------------ herbs & vines
  galax: {
    len: 0.085, pet: 1.4, petW: 0.012, arr: 'basal', gloss: 1.0, evergreen: true, tertiary: 0.1,
    shape: { kind: 'round', ar: 1.0, cy: 0.5, sinus: 0.35, sinusR: 0.42, sinusSharp: 5, margin: { type: 'crenate', n: 16, depth: 0.05 }, veins: { type: 'palmate', n: 7, spread: 130, sec: 2 } },
    // in shade about 60% of the leaves stay green; the rest bronze to burgundy from the margin inward
    palette: [
      P('#2e5d2e', '#42763c', '#20441e', 3.6, { veinLine: '#7a9a4a', mottle: 0.2, spots: 1, holeP: 0.1 }),
      P('#36632c', '#4a7a3c', '#274a20', 2.4, { veinLine: '#84a250', mottle: 0.2, spots: 1, holeP: 0.1 }),
      P('#3a5a2c', '#507040', '#6d2a3a', 1.3, { veinLine: '#8aa050', edgeAmt: 0.85, edgeW: 0.16, edgeBlur: 0.16, mottle: 0.2, spots: 1 }),
      P('#6d2a3a', '#86404a', '#4c1c26', 1.3, { veinLine: '#a06a58', mottle: 0.25, spots: 2 }),
      P('#84403a', '#9c5a4a', '#5e2826', 1.0, { veinLine: '#b07a5a', mottle: 0.25, blotchCols: ['#3a5a2c', '#6a2a2a'], blotch: 6 }),
      P('#5a3a3a', '#74504a', '#402828', 0.4, { veinLine: '#9a7a5a', mottle: 0.25 }),
    ],
    litter: ['#5a3a2e'],
  },
  wintergreen: {
    extras: [{ kind: 'berries', size: 0.02, col: '#d81e1e', n: 2, berry: 0.36 }, { kind: 'berries', size: 0.016, col: '#cf1c1c', n: 1, berry: 0.46 }],
    len: 0.035, pet: 0.1, arr: 'whorl', gloss: 1.0, evergreen: true, tertiary: 0.05, secVein: 0.2,
    shape: { kind: 'simple', ar: 1.5, p: 0.52, ba: 0.8, ta: 0.9, margin: { type: 'serrate', n: 8, depth: 0.03 }, veins: { type: 'pinnate', n: 4, ang: 50, curve: 0.014 } },
    // glossy dark green; only the odd leaf has reddened
    palette: [
      P('#234a26', '#356034', '#19381c', 4, { veinLine: '#86a058', veinGlow: 0.3, mottle: 0.2, spots: 1, holeP: 0.05 }),
      P('#2c5428', '#40693a', '#213f20', 3, { veinLine: '#8ea85e', veinGlow: 0.3, mottle: 0.2, spots: 1 }),
      P('#1f4224', '#305832', '#16321a', 2, { veinLine: '#7e9852', veinGlow: 0.3, mottle: 0.2, spots: 1 }),
      P('#5c3030', '#764646', '#402022', 0.5, { veinLine: '#96705a', spots: 1 }),
    ],
    litter: ['#5a3a2e'],
  },
  partridgeberry: {
    extras: [{ kind: 'berries', size: 0.014, col: '#e0201c', n: 1, berry: 0.5, twin: true }],
    len: 0.014, pet: 0.12, arr: 'opp', gloss: 0.9, evergreen: true, tertiary: 0, res: 96, secVein: 0.14, midW: 1.7,
    shape: { kind: 'simple', ar: 1.15, p: 0.45, ba: 0.6, ta: 0.75, veins: { type: 'pinnate', n: 2, ang: 45, curve: 0.014 } },
    // dark green with a cream midrib
    palette: [
      P('#1f4a2a', '#2f5e34', '#17381f', 4, { veinLine: '#ece4b6', veinGlow: 0.35, glowW: 0.8, mottle: 0.12, spots: 0, holeP: 0 }),
      P('#255230', '#36663a', '#1b3f24', 3, { veinLine: '#efe8c0', veinGlow: 0.35, glowW: 0.8, mottle: 0.12, spots: 0, holeP: 0 }),
      P('#1b4226', '#2a5630', '#14321c', 2, { veinLine: '#e4dcae', veinGlow: 0.3, glowW: 0.8, mottle: 0.12, spots: 0, holeP: 0 }),
    ],
    litter: ['#5a3a2e'],
  },
  stripedwintergreen: {
    len: 0.05, pet: 0.06, arr: 'whorl', gloss: 0.8, evergreen: true, tertiary: 0,
    shape: { kind: 'simple', ar: 3.0, p: 0.42, ba: 0.9, ta: 1.5, drip: 0.08, margin: { type: 'serrate', n: 8, depth: 0.10, fwd: 0.8 }, veins: { type: 'pinnate', n: 5, ang: 50 } },
    palette: [P('#1f3a30', '#dfe8d8', '#182e26', 4, { veinLine: '#e8f0e0', veinGlow: 0.85, glowW: 1.8, mottle: 0.15, spots: 0, holeP: 0.05, edgeAmt: 0.2 }), P('#243f34', '#d8e2d0', '#1a3028', 3, { veinLine: '#e2ecd8', veinGlow: 0.8, glowW: 1.6, mottle: 0.15, spots: 0, edgeAmt: 0.2 })],
    litter: ['#5a3a2e'],
  },
  rattlesnake: {
    len: 0.05, pet: 0.12, petW: 0.05, arr: 'basal', gloss: 0.4, evergreen: true, tertiary: 0,
    // dark green, a broad white midrib, and a fine white net of veins over the whole blade
    net: { n: 3, cell: 0.062, mid: 0.028, wobble: 0.1, col: '#eaf2e2' },
    shape: { kind: 'simple', ar: 1.8, p: 0.45, ba: 0.75, ta: 1.2, bend: 0.015, veins: { type: 'pinnate', n: 0, ang: 30 } },
    palette: [
      P('#2f5a44', '#3d6c50', '#234634', 4, { veinLine: '#eaf2e2', veinGlow: 0, mottle: 0.15, spots: 0, holeP: 0, edgeAmt: 0.3 }),
      P('#2a5438', '#386648', '#1f402c', 3, { veinLine: '#e4eedc', veinGlow: 0, mottle: 0.15, spots: 0, holeP: 0, edgeAmt: 0.3 }),
      P('#34603f', '#447250', '#274a30', 2, { veinLine: '#e8f0e0', veinGlow: 0, mottle: 0.15, spots: 0, holeP: 0.1, edgeAmt: 0.3 }),
    ],
    litter: ['#5a3a2e'],
  },
  wildginger: {
    len: 0.10, pet: 1.1, petW: 0.02, arr: 'basal', tertiary: 0.3,
    shape: { kind: 'round', ar: 0.86, cy: 0.5, sinus: 0.55, sinusR: 0.30, sinusSharp: 4, tip: 0.05, tipSharp: 14, veins: { type: 'palmate', n: 7, spread: 140, sec: 2 } },
    // matte deep green going yellow
    palette: [
      P('#4f7a35', '#62893f', '#3c6028', 3.5, { spots: 3 }), P('#567d30', '#6a8e3c', '#42632a', 2.5, { spots: 3, blotchCols: ['#8a9a3a', '#42632a'] }),
      P('#84963a', '#9aa84a', '#667630', 2, { spots: 5 }), P('#b9b24a', '#ccc466', '#8f8434', 1.6, { spots: 6 }), P('#b8963a', '#ccb052', '#8e6c2a', 0.8, { spots: 8 }),
    ],
    litter: ['#6a5630'],
  },
  aster: {
    extras: [{ kind: 'asterflower', size: 0.026 }, { kind: 'asterflower', size: 0.022, fluff: true }],
    len: 0.085, pet: 0.3, petW: 0.02, arr: 'alt',
    shape: { kind: 'simple', ar: 1.7, p: 0.26, ba: 0.42, ta: 1.5, drip: 0.14, margin: { type: 'serrate', n: 9, depth: 0.16, fwd: 0.9, y0: 0.1 }, veins: { type: 'pinnate', n: 6, ang: 52, curve: 0.012 } },
    palette: [P('#3f6826', '#557c34', '#30521e', 4, { spots: 3 }), P('#4c7228', '#618636', '#3a5a20', 3, { spots: 3 }), P('#869632', '#9caa44', '#6a7828', 1.5, { spots: 6 }), P('#5a4a3a', '#7a6a4a', '#6a3a4a', 0.8, { spots: 5 })],
    litter: ['#6a5630'],
  },
  foamflower: {
    len: 0.075, pet: 1.0, petW: 0.015, arr: 'basal', quilt: 0.8,
    shape: { kind: 'round', ar: 0.95, cy: 0.46, sinus: 0.4, sinusR: 0.4, sinusSharp: 5, lobes: { n: 5, depth: 0.2, sharp: 0.5 }, margin: { type: 'dentate', n: 16, depth: 0.07 }, veins: { type: 'palmate', n: 5, spread: 105, sec: 2 } },
    palette: [P('#476e28', '#6a3026', '#38581f', 3, { veinGlow: 0.6, glowW: 1.6, veinLine: '#6e4030', spots: 2 }), P('#54782c', '#7a3a2e', '#425e22', 3, { veinGlow: 0.7, glowW: 1.8, veinLine: '#784632', spots: 2 }), P('#6a5a30', '#7a3e30', '#5a2e28', 1.5, { veinGlow: 0.6, spots: 3 }), P('#3e6424', '#527a32', '#2f501c', 2, { spots: 2 })],
    litter: ['#6a5630'],
  },
  trillium: {
    len: 0.11, pet: 0.02, arr: 'whorl3',
    shape: { kind: 'simple', ar: 1.25, p: 0.42, ba: 0.7, ta: 1.3, drip: 0.12, veins: { type: 'arcuate', n: 4, ang: 40, y0: 0.04, y1: 0.4, curl: 0.6 } },
    palette: [P('#b8a640', '#ccbc5c', '#8e7a2e', 3, { spots: 9 }), P('#9a8a3a', '#b0a050', '#74602a', 2, { spots: 10 }), P('#8a6a34', '#a4844a', '#664a26', 2, { spots: 10 })],
    litter: ['#6a5630'],
  },
  mayapple: {
    // an umbrella: the sprite is the whole round blade, centred in its cell, 5-9 deep lobes each forked at the tip
    len: 0.2, pet: 0.0, arr: 'peltate', tertiary: 0.2,
    shape: { kind: 'peltate', n: [5, 9], sinus: 0.3, fork: 0.15 },
    // yellow-brown and tattered by mid-October
    palette: [
      P('#b99c3a', '#ccb458', '#7a5626', 3, { spots: 10, tatter: 1, holes: [1, 3], blotch: 9, blotchCols: ['#8a6228', '#6e4a20', '#ccb04c'], edgeAmt: 0.75, edgeW: 0.07, edgeBlur: 0.09, veinGlow: 0.3 }),
      P('#a8842e', '#bea04a', '#6a4620', 2.5, { spots: 12, tatter: 1.2, holes: [2, 5], blotch: 10, blotchCols: ['#7a5424', '#5e3e1c', '#b89a3e'], edgeAmt: 0.8, edgeW: 0.09, edgeBlur: 0.1, veinGlow: 0.3 }),
      P('#8f6a2c', '#a88642', '#5c3c1c', 2, { spots: 12, tatter: 1.5, holes: [2, 6], blotch: 10, blotchCols: ['#6e4a20', '#553618', '#a8843a'], edgeAmt: 0.8, edgeW: 0.1, veinGlow: 0.3 }),
      P('#bdae44', '#c8bc5c', '#86642a', 1.2, { spots: 8, tatter: 0.8, holes: [0, 2], blotch: 8, blotchCols: ['#86642a', '#9a9a3c'], edgeAmt: 0.7, edgeW: 0.07, veinGlow: 0.3 }),
    ],
    litter: ['#6a5630'],
  },
  cucumberroot: {
    extras: [{ kind: 'berries', size: 0.03, col: '#241a3a', n: 3 }],
    len: 0.09, pet: 0.02, arr: 'whorl',
    shape: { kind: 'simple', ar: 2.9, p: 0.5, ba: 1.2, ta: 1.5, drip: 0.10, veins: { type: 'arcuate', n: 3, ang: 22, y0: 0.03, y1: 0.3, curl: 0.4 } },
    palette: [P('#c8b83c', '#dccc5c', '#a8962e', 3, { spots: 4 }), P('#a8a83e', '#bcbc58', '#8a8830', 2.5, { spots: 4 }), P('#d8b040', '#e8c860', '#a02a30', 2, { edgeAmt: 0.0, tip: '#d8b040', spots: 4 }), P('#6f8a2e', '#869e3c', '#587024', 1.5, { spots: 3 })],
    litter: ['#6a5630'],
  },
  creeper: {
    extras: [{ kind: 'berries', size: 0.035, col: '#20264a', n: 6, stalk: 'rgba(190,40,40,0.9)' }],
    len: 0.09, pet: 0.04, arr: 'alt', compound: { type: 'palmate', n: 5, petiole: 0.11, sizes: [0.62, 0.86, 1.0] },
    shape: { kind: 'simple', ar: 2.15, p: 0.56, ba: 1.3, ta: 1.2, drip: 0.12, margin: { type: 'serrate', n: 9, depth: 0.16, fwd: 0.9, y0: 0.35 }, veins: { type: 'pinnate', n: 8, ang: 50, curve: 0.01 } },
    palette: [P('#c41e22', '#dc4a36', '#9a141e', 4), P('#a81a24', '#c43a36', '#7e1020', 3), P('#d8402a', '#e8703c', '#b02822', 2), P('#8a1830', '#a83644', '#641026', 1.5), P('#c86a2a', '#dc9444', '#a02a24', 1, { edgeAmt: 0.7, edgeW: 0.1 })],
    litter: ['#7a2c2a'],
  },

  // ------------------------------------------------------------------ conifer
  hemlock: {
    len: 0.11, pet: 0.0, arr: 'spray', evergreen: true, gloss: 0.12, res: 384,
    // flat lacy sprays: needles about a tenth of the spray length, in two ranks on slender tan twiglets
    shape: { kind: 'needles', cellAspect: 0.9, needle: 0.072, needleW: 0.0105, pitch: 0.02, sides: 8 },
    // blade = mature needle colour, vein = lighter colour of the newest growth toward the twig tips
    palette: [
      P('#2e5226', '#4c7832', '#1c361a', 4, { twig: '#6a563c' }), P('#32562a', '#507c36', '#203e1e', 3, { twig: '#70593c' }),
      P('#284622', '#446c30', '#183016', 2, { twig: '#5e4c34' }), P('#487832', '#5c8a3a', '#305226', 1.6, { twig: '#7a6a44' }),
    ],
    litter: ['#5a4428'],
  },
  // ------------------------------------------------------------------ ferns (whole fronds)
  christmasfern: {
    len: 0.48, arr: 'frond', evergreen: true, gloss: 0.8, res: 640, count: 4,
    shape: { kind: 'frond', ar: 5.2, stipe: 0.2, pairs: 30, widest: 0.34, baseTaper: 0.7, tipTaper: 0.85, pinna: 'blade', ang: 80 },
    palette: [P('#27552a', null, null, 4, { rachis: '#6f7d3c', scales: true }), P('#2f6030', null, null, 3, { rachis: '#768440', scales: true }), P('#234a26', null, null, 2, { rachis: '#69773a', scales: true }), P('#3a6a30', null, '#8a8a3a', 1, { rachis: '#7a8640', scales: true, edgeAmt: 0.3 })],
    litter: ['#5a4a2a'],
  },
  woodfern: {
    len: 0.55, arr: 'frond', evergreen: true, gloss: 0.4, res: 640, count: 4,
    shape: { kind: 'frond', ar: 2.9, stipe: 0.28, pairs: 22, widest: 0.3, baseTaper: 0.78, tipTaper: 0.9, pinna: 'pinnate', pinnules: 13, pinnuleLen: 0.64, pinnuleW: 0.38, ang: 76 },
    palette: [P('#3a7a30', null, null, 4, { rachis: '#7a8a44', scales: true }), P('#438636', null, null, 3, { rachis: '#80904a', scales: true }), P('#33702c', null, null, 2, { rachis: '#748440', scales: true })],
    litter: ['#5a4a2a'],
  },
  ladyfern: {
    len: 0.60, arr: 'frond', res: 640, count: 5,
    shape: { kind: 'frond', ar: 2.5, stipe: 0.30, pairs: 22, widest: 0.12, baseTaper: 0.86, tipTaper: 1.0, pinna: 'pinnate', pinnules: 14, pinnuleLen: 0.72, pinnuleW: 0.38, ang: 74 },
    palette: [P('#8fa238', null, '#c9ac3c', 3, { rachis: '#a8604a', edgeAmt: 0.5 }), P('#a8ac3c', null, '#c8a038', 3, { rachis: '#d2c48c', edgeAmt: 0.6 }), P('#c4b040', null, '#a8782e', 2.5, { rachis: '#b0664c', edgeAmt: 0.6 }), P('#7a9a36', null, '#b8b040', 2, { rachis: '#cfc690', edgeAmt: 0.4 }), P('#b08a3a', null, '#8a5a28', 1.2, { rachis: '#9a5a44', edgeAmt: 0.7 })],
    litter: ['#7a6a34'],
  },
  hayfern: {
    len: 0.50, arr: 'frond', res: 640, count: 5,
    shape: { kind: 'frond', ar: 3.1, stipe: 0.26, pairs: 24, widest: 0.3, baseTaper: 0.72, tipTaper: 0.95, pinna: 'pinnate', pinnules: 12, pinnuleLen: 0.66, pinnuleW: 0.4, ang: 76 },
    palette: [P('#d8c040', null, '#c89a30', 4, { rachis: '#c8a850', edgeAmt: 0.5 }), P('#c8a838', null, '#a8782c', 3, { rachis: '#b8984a', edgeAmt: 0.6 }), P('#e0c850', null, '#d0a838', 3, { rachis: '#d0b45a', edgeAmt: 0.4 }), P('#b4b040', null, '#d4b83c', 1.5, { rachis: '#b8ae56', edgeAmt: 0.5 }), P('#b88a34', null, '#8a5c26', 1.2, { rachis: '#a8843e', edgeAmt: 0.7 })],
    litter: ['#8a7438'],
  },
  bracken: {
    // ternate blade on a stiff stalk: a terminal part and two large basal branches, each triangular and twice divided
    len: 0.62, arr: 'frond', res: 640, count: 5,
    shape: { kind: 'frond', ternate: true, ar: 1.04, stipe: 0.18, branchAng: 68, pairs: 9, pinnules: 16 },
    palette: [P('#a8642a', null, '#7a4420', 4, { rachis: '#8a6a3a', edgeAmt: 0.6 }), P('#8f5222', null, '#66381c', 3, { rachis: '#7c5c34', edgeAmt: 0.6 }), P('#c07a30', null, '#96582a', 3, { rachis: '#9a7840', edgeAmt: 0.5 }), P('#b89a3a', null, '#a86a2a', 1.5, { rachis: '#a8904a', edgeAmt: 0.6 }), P('#8a9038', null, '#b08a34', 1, { rachis: '#98984a', edgeAmt: 0.6 })],
    litter: ['#7a5630'],
  },
  nyfern: {
    len: 0.45, arr: 'frond', res: 640, count: 5,
    shape: { kind: 'frond', ar: 4.0, stipe: 0.10, pairs: 28, widest: 0.52, baseTaper: 0.06, tipTaper: 0.8, pinna: 'lobed', pinnules: 11, pinnuleLen: 0.5, pinnuleW: 0.44, ang: 80 },
    palette: [P('#a8b040', null, '#d0c458', 3, { rachis: '#b0b25a', edgeAmt: 0.5 }), P('#b8b848', null, '#d8cc68', 3, { rachis: '#bcb860', edgeAmt: 0.5 }), P('#d0c458', null, '#c8a840', 2.5, { rachis: '#c8bc64', edgeAmt: 0.4 }), P('#8aa23a', null, '#b8b848', 2, { rachis: '#a4ac52', edgeAmt: 0.4 }), P('#c0a03c', null, '#96702a', 1, { rachis: '#b09848', edgeAmt: 0.6 })],
    litter: ['#8a7a3c'],
  },

  // ------------------------------------------------------------------ grass leaves and seed heads
  grassbits: {
    extras: [{ kind: 'bottlebrush', size: 0.17 }, { kind: 'panicle', size: 0.17 }, { kind: 'panicle', size: 0.15, col: '#8a6a72' }],
    len: 0.15, pet: 0.0, arr: 'alt', tertiary: 0, minAspect: 0.5,
    shape: { kind: 'simple', ar: 10, p: 0.3, ba: 0.6, ta: 1.6, veins: { type: 'pinnate', n: 0, ang: 10 } },
    palette: [P('#8a9a42', '#a0aa52', '#b09a4a', 2, { spots: 1, holeP: 0 }), P('#b8a85a', '#c8b86a', '#a08848', 2, { spots: 1, holeP: 0 }), P('#6a8a3a', '#7a9a48', '#9a9a48', 1, { spots: 1, holeP: 0 })],
    litter: ['#8a7a4a'],
  },
};
