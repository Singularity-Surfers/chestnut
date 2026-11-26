// Woody plants of the cove: crown architecture, twig clusters, bark and site preferences.
//
// arch (all lengths relative to tree height unless noted):
//   form: 'decurrent' (trunk dissolves into limbs), 'excurrent' (single leader), 'shrub' (multi-stem)
//   bole: [min,max] clear-trunk fraction; l1..l3: branch orders { n, ang:[deg from parent], len:[× parent length], rad, up }
//   shape: crown envelope for first-order branches; droop: tip droop; flat: flatten sprays (layering)
// cl (cluster card): size (m), nodes per twig, branching, extras (fruit etc.)
// niche: m = [min, optimum, max] site moisture (0 dry ridge … 1 streamside); pos: 'cove' | 'slope' | 'ridge' | 'any'
// sizes: canopy stature { h:[m], dbh:[m] } for mature trees; giants allowed where `giant` is set.

const deg = (a, b) => [a, b];

export const SPECIES = {
  // ============================================================ canopy
  chestnut: {
    name: 'American chestnut', sci: 'Castanea dentata', leaf: 'chestnut', bark: 'chestnut', layer: 'canopy',
    share: 0.35, h: [27, 36], dbh: [0.8, 1.5], giant: { h: [34, 40], dbh: [1.6, 2.4], p: 0.22 },
    niche: { m: [0.08, 0.42, 0.82], pos: 'any' }, trans: 0.95, hueVar: 0.10, sparse: 0.82,
    arch: { form: 'decurrent', bole: [0.44, 0.58], flare: 1.55, flareH: 0.06, buttress: 0.22, lean: 0.03, wobble: 0.012, shape: 'round',
      l1: { n: [5, 7], ang: deg(38, 78), len: [0.42, 0.60], rad: 0.60, up: 0.12 },
      l2: { n: [5, 7], ang: deg(32, 66), len: [0.48, 0.70], rad: 0.52, up: 0.08 },
      l3: { n: [4, 6], ang: deg(30, 68), len: [0.45, 0.7], rad: 0.5, up: 0.0 }, droop: 0.25, spread: 1.0 },
    cl: { size: 1.0, nodes: [8, 11], reach: 0.82, branch: 0.45, twig: '#54422e', curl: 1.3, spread: 1.0,
      extras: [{ name: 'bur', p: 0.035, tip: 5, center: true }] },
  },
  redoak: {
    name: 'Northern red oak', sci: 'Quercus rubra', leaf: 'redoak', bark: 'redoak', layer: 'canopy',
    share: 0.08, h: [26, 34], dbh: [0.7, 1.3], giant: { h: [32, 37], dbh: [1.3, 1.7], p: 0.1 },
    niche: { m: [0.2, 0.5, 0.8], pos: 'slope' }, trans: 0.8, hueVar: 0.08, sparse: 0.97,
    arch: { form: 'decurrent', bole: [0.42, 0.56], flare: 1.4, flareH: 0.05, buttress: 0.15, lean: 0.03, wobble: 0.012, shape: 'round',
      l1: { n: [5, 7], ang: deg(35, 62), len: [0.36, 0.54], rad: 0.5, up: 0.2 },
      l2: { n: [4, 6], ang: deg(35, 65), len: [0.45, 0.68], rad: 0.52, up: 0.1 },
      l3: { n: [3, 5], ang: deg(35, 70), len: [0.45, 0.7], rad: 0.5, up: 0.0 }, droop: 0.1 },
    cl: { size: 0.8, nodes: [6, 9], reach: 0.78, branch: 0.4, twig: '#4a3a2c' },
  },
  chestnutoak: {
    name: 'Chestnut oak', sci: 'Quercus montana', leaf: 'chestnutoak', bark: 'chestnutoak', layer: 'canopy',
    share: 0.06, h: [18, 25], dbh: [0.5, 1.1], niche: { m: [0.0, 0.14, 0.42], pos: 'ridge' }, trans: 0.75, hueVar: 0.08, sparse: 0.97,
    arch: { form: 'decurrent', bole: [0.32, 0.46], flare: 1.5, flareH: 0.05, buttress: 0.2, lean: 0.12, wobble: 0.05, shape: 'round',
      l1: { n: [5, 7], ang: deg(38, 68), len: [0.38, 0.56], rad: 0.52, up: 0.15 },
      l2: { n: [4, 6], ang: deg(35, 65), len: [0.45, 0.68], rad: 0.52, up: 0.1 },
      l3: { n: [3, 5], ang: deg(35, 70), len: [0.45, 0.7], rad: 0.5, up: 0.0 }, droop: 0.1 },
    cl: { size: 0.75, nodes: [6, 9], reach: 0.78, branch: 0.4, twig: '#4a3a2c' },
  },
  whiteoak: {
    name: 'White oak', sci: 'Quercus alba', leaf: 'whiteoak', bark: 'whiteoak', layer: 'canopy',
    share: 0.04, h: [25, 32], dbh: [0.7, 1.4], giant: { h: [30, 35], dbh: [1.4, 1.8], p: 0.12 },
    niche: { m: [0.1, 0.38, 0.7], pos: 'slope' }, trans: 0.75, hueVar: 0.07, sparse: 0.97,
    arch: { form: 'decurrent', bole: [0.38, 0.52], flare: 1.45, flareH: 0.05, buttress: 0.15, lean: 0.03, wobble: 0.015, shape: 'spreading',
      l1: { n: [5, 7], ang: deg(45, 78), len: [0.40, 0.58], rad: 0.52, up: 0.2 },
      l2: { n: [4, 6], ang: deg(35, 65), len: [0.45, 0.68], rad: 0.52, up: 0.1 },
      l3: { n: [3, 5], ang: deg(35, 70), len: [0.45, 0.7], rad: 0.5, up: 0.0 }, droop: 0.05 },
    cl: { size: 0.7, nodes: [6, 9], reach: 0.78, branch: 0.45, twig: '#5a4a3a' },
  },
  scarletoak: {
    name: 'Scarlet oak', sci: 'Quercus coccinea', leaf: 'scarletoak', bark: 'redoak', layer: 'canopy',
    share: 0.02, h: [22, 29], dbh: [0.5, 0.95], niche: { m: [0.0, 0.16, 0.42], pos: 'ridge' }, trans: 0.85, hueVar: 0.08, sparse: 0.97,
    arch: { form: 'decurrent', bole: [0.4, 0.54], flare: 1.6, flareH: 0.05, buttress: 0.2, lean: 0.03, wobble: 0.012, shape: 'round',
      l1: { n: [5, 7], ang: deg(40, 70), len: [0.3, 0.44], rad: 0.48, up: 0.15 },
      l2: { n: [4, 6], ang: deg(35, 65), len: [0.45, 0.68], rad: 0.52, up: 0.1 },
      l3: { n: [3, 5], ang: deg(35, 70), len: [0.45, 0.7], rad: 0.5, up: 0.0 }, droop: 0.15 },
    cl: { size: 0.7, nodes: [6, 9], reach: 0.78, branch: 0.4, twig: '#4a3a2c' },
  },
  redmaple: {
    name: 'Red maple', sci: 'Acer rubrum', leaf: 'redmaple', bark: 'redmaple', layer: 'canopy',
    share: 0.08, h: [20, 29], dbh: [0.4, 0.9], niche: { m: [0.1, 0.6, 1.0], pos: 'any' }, trans: 1.0, hueVar: 0.16, sparse: 0.72,
    arch: { form: 'decurrent', bole: [0.36, 0.52], flare: 1.35, flareH: 0.045, buttress: 0.12, lean: 0.04, wobble: 0.015, shape: 'oval',
      l1: { n: [5, 8], ang: deg(22, 48), len: [0.40, 0.58], rad: 0.5, up: 0.3 },
      l2: { n: [4, 6], ang: deg(28, 55), len: [0.45, 0.66], rad: 0.5, up: 0.2 },
      l3: { n: [3, 5], ang: deg(30, 60), len: [0.45, 0.7], rad: 0.5, up: 0.1 }, droop: 0.05 },
    cl: { size: 0.62, nodes: [4, 6], reach: 0.62, branch: 0.5, twig: '#6a2a28', scale: 1.0, tilt: 0.7 },
  },
  sugarmaple: {
    name: 'Sugar maple', sci: 'Acer saccharum', leaf: 'sugarmaple', bark: 'sugarmaple', layer: 'canopy',
    share: 0.04, h: [24, 32], dbh: [0.6, 1.2], giant: { h: [30, 35], dbh: [1.2, 1.5], p: 0.08 },
    niche: { m: [0.42, 0.74, 0.98], pos: 'cove' }, trans: 1.0, hueVar: 0.14, sparse: 0.8,
    arch: { form: 'decurrent', bole: [0.4, 0.55], flare: 1.4, flareH: 0.05, buttress: 0.14, lean: 0.03, wobble: 0.012, shape: 'oval',
      l1: { n: [6, 8], ang: deg(24, 50), len: [0.38, 0.56], rad: 0.5, up: 0.3 },
      l2: { n: [4, 6], ang: deg(28, 55), len: [0.45, 0.66], rad: 0.5, up: 0.2 },
      l3: { n: [3, 5], ang: deg(30, 60), len: [0.45, 0.7], rad: 0.5, up: 0.1 }, droop: 0.05 },
    cl: { size: 0.68, nodes: [4, 6], reach: 0.62, branch: 0.5, twig: '#5a4630', tilt: 0.7 },
  },
  tulip: {
    name: 'Tulip poplar', sci: 'Liriodendron tulipifera', leaf: 'tulip', bark: 'tulip', layer: 'canopy',
    share: 0.10, h: [33, 44], dbh: [0.8, 1.6], giant: { h: [42, 50], dbh: [1.6, 2.2], p: 0.15 },
    niche: { m: [0.4, 0.76, 1.0], pos: 'cove' }, trans: 1.0, hueVar: 0.07, sparse: 0.52,
    arch: { form: 'decurrent', bole: [0.56, 0.7], flare: 1.3, flareH: 0.035, buttress: 0.1, lean: 0.015, wobble: 0.006, shape: 'oval',
      l1: { n: [5, 8], ang: deg(30, 60), len: [0.2, 0.32], rad: 0.42, up: 0.3 },
      l2: { n: [4, 6], ang: deg(30, 60), len: [0.45, 0.68], rad: 0.5, up: 0.15 },
      l3: { n: [3, 5], ang: deg(30, 60), len: [0.45, 0.7], rad: 0.5, up: 0.1 }, droop: 0.05 },
    cl: { size: 0.72, nodes: [5, 7], reach: 0.66, branch: 0.4, twig: '#5a4a34', tilt: 0.7 },
  },
  hemlock: {
    name: 'Eastern hemlock', sci: 'Tsuga canadensis', leaf: 'hemlock', bark: 'hemlock', layer: 'canopy', evergreen: true,
    share: 0.08, h: [24, 34], dbh: [0.6, 1.2], giant: { h: [33, 40], dbh: [1.2, 1.6], p: 0.12 },
    niche: { m: [0.55, 0.9, 1.0], pos: 'cove', north: 0.5, stream: 16, away: 0.07 }, trans: 0.5, hueVar: 0.04, gloss: 0.3, bright: 1.9,
    // long, slender, slightly drooping limbs carrying flat lacy sprays that hang at the tips; a nodding leader
    arch: { form: 'excurrent', bole: [0.24, 0.42], flare: 1.35, flareH: 0.04, buttress: 0.12, lean: 0.015, wobble: 0.006, shape: 'conical',
      l1: { n: [52, 70], ang: deg(80, 104), len: [0.17, 0.27], rad: 0.2, up: -0.16 },
      l2: { n: [8, 11], ang: deg(40, 68), len: [0.28, 0.5], rad: 0.5, up: -0.04, flat: true },
      droop: 0.85, flat: 1.0, leader: 0.3, irregular: 0.9 },
    cl: { size: 0.46, nodes: [8, 11], reach: 0.92, branch: 0.7, twig: '#5a4630', spread: 0.8, scale: 1.0, bare: 0.04, nodeMul: 1.2, farTwigs: 3 },
  },
  ybirch: {
    name: 'Yellow birch', sci: 'Betula alleghaniensis', leaf: 'ybirch', bark: 'ybirch', layer: 'canopy',
    share: 0.03, h: [20, 28], dbh: [0.5, 1.0], niche: { m: [0.55, 0.88, 1.0], pos: 'cove', north: 0.4, stream: 20, away: 0.2 }, trans: 1.0, hueVar: 0.05, sparse: 0.6,
    arch: { form: 'decurrent', bole: [0.34, 0.5], flare: 1.6, flareH: 0.06, buttress: 0.35, lean: 0.06, wobble: 0.02, shape: 'round',
      l1: { n: [5, 7], ang: deg(35, 65), len: [0.34, 0.5], rad: 0.5, up: 0.2 },
      l2: { n: [4, 6], ang: deg(35, 65), len: [0.45, 0.68], rad: 0.5, up: 0.05 },
      l3: { n: [4, 6], ang: deg(35, 70), len: [0.45, 0.7], rad: 0.5, up: -0.1 }, droop: 0.35 },
    cl: { size: 0.6, nodes: [7, 10], reach: 0.84, branch: 0.5, twig: '#4a3626', zigzag: 0.12, twigW: 0.008 },
  },
  bbirch: {
    name: 'Black birch', sci: 'Betula lenta', leaf: 'bbirch', bark: 'bbirch', layer: 'canopy',
    share: 0.02, h: [19, 26], dbh: [0.4, 0.8], niche: { m: [0.3, 0.6, 0.9], pos: 'slope' }, trans: 1.0, hueVar: 0.05, sparse: 0.62,
    arch: { form: 'decurrent', bole: [0.38, 0.52], flare: 1.3, flareH: 0.04, buttress: 0.12, lean: 0.04, wobble: 0.015, shape: 'oval',
      l1: { n: [5, 7], ang: deg(30, 55), len: [0.32, 0.48], rad: 0.48, up: 0.25 },
      l2: { n: [4, 6], ang: deg(35, 65), len: [0.45, 0.68], rad: 0.5, up: 0.05 },
      l3: { n: [4, 6], ang: deg(35, 70), len: [0.45, 0.7], rad: 0.5, up: -0.1 }, droop: 0.3 },
    cl: { size: 0.58, nodes: [7, 10], reach: 0.84, branch: 0.5, twig: '#3a2a22', zigzag: 0.12, twigW: 0.008 },
  },
  beech: {
    name: 'American beech', sci: 'Fagus grandifolia', leaf: 'beech', bark: 'beech', layer: 'canopy',
    share: 0.04, h: [22, 30], dbh: [0.5, 1.0], niche: { m: [0.35, 0.66, 0.95], pos: 'cove' }, trans: 1.0, hueVar: 0.07, sparse: 0.97,
    arch: { form: 'decurrent', bole: [0.3, 0.46], flare: 1.5, flareH: 0.05, buttress: 0.3, lean: 0.03, wobble: 0.012, shape: 'spreading',
      l1: { n: [7, 10], ang: deg(48, 82), len: [0.38, 0.56], rad: 0.42, up: 0.1 },
      l2: { n: [5, 7], ang: deg(35, 60), len: [0.45, 0.66], rad: 0.5, up: 0.0, flat: true },
      l3: { n: [4, 6], ang: deg(35, 60), len: [0.45, 0.7], rad: 0.5, up: 0.0, flat: true }, droop: 0.15, flat: 0.7 },
    cl: { size: 0.62, nodes: [7, 10], reach: 0.86, branch: 0.55, twig: '#5a4a3c', zigzag: 0.15, twigW: 0.008 },
  },
  hickory: {
    name: 'Pignut hickory', sci: 'Carya glabra', leaf: 'hickory', bark: 'hickory', layer: 'canopy',
    share: 0.03, h: [24, 31], dbh: [0.5, 0.95], niche: { m: [0.08, 0.32, 0.62], pos: 'slope' }, trans: 0.95, hueVar: 0.05, sparse: 0.62,
    arch: { form: 'decurrent', bole: [0.45, 0.6], flare: 1.3, flareH: 0.04, buttress: 0.1, lean: 0.02, wobble: 0.01, shape: 'oval',
      l1: { n: [5, 7], ang: deg(32, 62), len: [0.26, 0.4], rad: 0.45, up: 0.15 },
      l2: { n: [4, 5], ang: deg(35, 65), len: [0.45, 0.68], rad: 0.52, up: 0.0 },
      l3: { n: [3, 4], ang: deg(35, 70), len: [0.45, 0.7], rad: 0.5, up: -0.1 }, droop: 0.3 },
    cl: { size: 0.95, nodes: [3, 5], reach: 0.5, branch: 0.25, twig: '#4a3c2c', rachis: '#9a8a3a', twigW: 0.016 },
  },
  basswood: {
    name: 'American basswood', sci: 'Tilia americana', leaf: 'basswood', bark: 'basswood', layer: 'canopy',
    share: 0.008, h: [24, 31], dbh: [0.6, 1.1], niche: { m: [0.55, 0.82, 1.0], pos: 'cove' }, trans: 1.0, hueVar: 0.05, sparse: 0.5,
    arch: { form: 'decurrent', bole: [0.42, 0.56], flare: 1.4, flareH: 0.05, buttress: 0.2, lean: 0.03, wobble: 0.012, shape: 'oval',
      l1: { n: [5, 7], ang: deg(30, 58), len: [0.3, 0.44], rad: 0.48, up: 0.2 },
      l2: { n: [4, 6], ang: deg(35, 65), len: [0.45, 0.68], rad: 0.5, up: 0.05 },
      l3: { n: [3, 5], ang: deg(35, 70), len: [0.45, 0.7], rad: 0.5, up: -0.05 }, droop: 0.2 },
    cl: { size: 0.75, nodes: [5, 7], reach: 0.8, branch: 0.4, twig: '#5a3a2c', zigzag: 0.14 },
  },
  buckeye: {
    name: 'Yellow buckeye', sci: 'Aesculus flava', leaf: 'buckeye', bark: 'buckeye', layer: 'canopy',
    share: 0.006, h: [24, 32], dbh: [0.6, 1.2], niche: { m: [0.6, 0.85, 1.0], pos: 'cove' }, trans: 1.0, hueVar: 0.06, sparse: 0.16,
    arch: { form: 'decurrent', bole: [0.45, 0.58], flare: 1.35, flareH: 0.045, buttress: 0.15, lean: 0.02, wobble: 0.01, shape: 'oval',
      l1: { n: [5, 7], ang: deg(30, 58), len: [0.28, 0.42], rad: 0.48, up: 0.2 },
      l2: { n: [3, 5], ang: deg(35, 65), len: [0.45, 0.68], rad: 0.52, up: 0.1 },
      l3: { n: [3, 4], ang: deg(35, 70), len: [0.45, 0.7], rad: 0.5, up: 0.0 }, droop: 0.2 },
    cl: { size: 0.85, nodes: [2, 4], reach: 0.42, branch: 0.2, twig: '#6a5a44', rachis: '#b08a40', twigW: 0.02 },
  },
  blackgum: {
    name: 'Black gum', sci: 'Nyssa sylvatica', leaf: 'blackgum', bark: 'blackgum', layer: 'canopy',
    share: 0.008, h: [20, 27], dbh: [0.4, 0.9], niche: { m: [0.0, 0.3, 0.7], pos: 'ridge' }, trans: 0.9, hueVar: 0.12, gloss: 0.5, sparse: 0.5,
    arch: { form: 'excurrent', bole: [0.4, 0.55], flare: 1.4, flareH: 0.05, buttress: 0.15, lean: 0.03, wobble: 0.015, shape: 'oval',
      l1: { n: [16, 24], ang: deg(80, 98), len: [0.18, 0.3], rad: 0.24, up: 0.0 },
      l2: { n: [5, 7], ang: deg(45, 75), len: [0.35, 0.55], rad: 0.5, up: 0.0, flat: true }, droop: 0.2, flat: 0.6, leader: 0.1 },
    cl: { size: 0.55, nodes: [6, 9], reach: 0.8, branch: 0.5, twig: '#5a3a30' },
  },
  cucumbertree: {
    name: 'Cucumber magnolia', sci: 'Magnolia acuminata', leaf: 'magnolia', bark: 'basswood', layer: 'canopy',
    share: 0.006, h: [24, 31], dbh: [0.5, 1.0], niche: { m: [0.5, 0.8, 1.0], pos: 'cove' }, trans: 0.9, hueVar: 0.05, sparse: 0.6,
    arch: { form: 'decurrent', bole: [0.45, 0.6], flare: 1.3, flareH: 0.04, buttress: 0.1, lean: 0.02, wobble: 0.01, shape: 'oval',
      l1: { n: [5, 7], ang: deg(30, 58), len: [0.26, 0.4], rad: 0.46, up: 0.2 },
      l2: { n: [3, 5], ang: deg(35, 65), len: [0.45, 0.68], rad: 0.52, up: 0.1 },
      l3: { n: [3, 4], ang: deg(35, 70), len: [0.45, 0.7], rad: 0.5, up: 0.05 }, droop: 0.15 },
    cl: { size: 0.8, nodes: [3, 4], reach: 0.5, branch: 0.6, nodeMul: 1, twig: '#5a4a3a', whorl: [5, 7], scale: 0.62, droop: 0.6 },
  },
  ash: {
    name: 'White ash', sci: 'Fraxinus americana', leaf: 'ash', bark: 'ash', layer: 'canopy',
    share: 0.006, h: [25, 33], dbh: [0.5, 1.0], niche: { m: [0.5, 0.78, 1.0], pos: 'cove' }, trans: 0.95, hueVar: 0.14, sparse: 0.3,
    arch: { form: 'decurrent', bole: [0.48, 0.62], flare: 1.3, flareH: 0.04, buttress: 0.1, lean: 0.02, wobble: 0.01, shape: 'oval',
      l1: { n: [5, 7], ang: deg(28, 52), len: [0.26, 0.4], rad: 0.46, up: 0.25 },
      l2: { n: [3, 5], ang: deg(30, 55), len: [0.45, 0.68], rad: 0.52, up: 0.15 },
      l3: { n: [3, 4], ang: deg(30, 60), len: [0.45, 0.7], rad: 0.5, up: 0.1 }, droop: 0.1 },
    cl: { size: 0.9, nodes: [2, 4], reach: 0.45, branch: 0.25, twig: '#6a6250', rachis: '#8a6a4a', twigW: 0.018 },
  },
  // ============================================================ understory trees
  dogwood: {
    name: 'Flowering dogwood', sci: 'Cornus florida', leaf: 'dogwood', bark: 'dogwood', layer: 'under',
    h: [4, 8], dbh: [0.08, 0.2], niche: { m: [0.12, 0.45, 0.8], pos: 'any' }, density: 1.0, trans: 1.0, hueVar: 0.10, sparse: 0.85,
    arch: { form: 'decurrent', bole: [0.2, 0.36], flare: 1.25, flareH: 0.05, buttress: 0.1, lean: 0.14, wobble: 0.05, shape: 'spreading',
      l1: { n: [5, 8], ang: deg(55, 85), len: [0.45, 0.7], rad: 0.5, up: 0.05, flat: true },
      l2: { n: [4, 6], ang: deg(35, 60), len: [0.4, 0.6], rad: 0.55, up: 0.0, flat: true },
      l3: { n: [3, 5], ang: deg(35, 60), len: [0.4, 0.62], rad: 0.55, up: 0.12, flat: true }, droop: 0.0, flat: 1.0 },
    cl: { size: 0.42, nodes: [3, 5], reach: 0.7, branch: 0.5, twig: '#5a2a34', twigW: 0.012, tilt: 0.6, extras: [{ name: 'berries', p: 0.12, tip: 4 }, { name: 'dogbud', p: 0.05, tip: 9 }] },
  },
  stripedmaple: {
    name: 'Striped maple', sci: 'Acer pensylvanicum', leaf: 'stripedmaple', bark: 'stripedmaple', layer: 'under',
    h: [3.5, 8], dbh: [0.05, 0.14], niche: { m: [0.45, 0.72, 1.0], pos: 'cove', north: 0.5 }, density: 0.5, trans: 1.0, hueVar: 0.05, sparse: 0.6,
    arch: { form: 'decurrent', bole: [0.3, 0.5], flare: 1.1, flareH: 0.04, buttress: 0.0, lean: 0.1, wobble: 0.03, shape: 'oval',
      l1: { n: [4, 7], ang: deg(35, 60), len: [0.3, 0.5], rad: 0.55, up: 0.3 },
      l2: { n: [2, 4], ang: deg(35, 55), len: [0.4, 0.6], rad: 0.6, up: 0.2 }, droop: 0.0 },
    cl: { size: 0.6, nodes: [2, 4], reach: 0.6, branch: 0.25, twig: '#5a6a3a', twigW: 0.014, tilt: 0.6 },
  },
  sourwood: {
    name: 'Sourwood', sci: 'Oxydendrum arboreum', leaf: 'sourwood', bark: 'sourwood', layer: 'under',
    h: [7, 15], dbh: [0.12, 0.32], niche: { m: [0.0, 0.25, 0.58], pos: 'ridge' }, density: 0.7, trans: 0.95, hueVar: 0.10, gloss: 0.4, sparse: 0.88,
    arch: { form: 'decurrent', bole: [0.4, 0.58], flare: 1.3, flareH: 0.04, buttress: 0.1, lean: 0.22, wobble: 0.05, shape: 'oval',
      l1: { n: [5, 7], ang: deg(40, 70), len: [0.24, 0.4], rad: 0.5, up: 0.0 },
      l2: { n: [3, 5], ang: deg(35, 65), len: [0.45, 0.65], rad: 0.55, up: -0.25 },
      l3: { n: [3, 4], ang: deg(35, 65), len: [0.45, 0.65], rad: 0.55, up: -0.3 }, droop: 0.7 },
    cl: { size: 0.55, nodes: [5, 8], reach: 0.78, branch: 0.3, twig: '#6a3a34', curl: 1.5, extras: [{ name: 'capsules', p: 0.12, tip: 7, center: false }] },
  },
  hornbeam: {
    name: 'American hornbeam', sci: 'Carpinus caroliniana', leaf: 'hornbeam', bark: 'hornbeam', layer: 'under',
    h: [4, 8.5], dbh: [0.08, 0.2], niche: { m: [0.6, 0.9, 1.0], pos: 'cove', stream: 25, away: 0.25 }, density: 0.7, trans: 1.0, hueVar: 0.14, sparse: 0.8,
    arch: { form: 'decurrent', bole: [0.16, 0.3], flare: 1.4, flareH: 0.07, buttress: 0.45, lean: 0.22, wobble: 0.09, shape: 'spreading', stems: [1, 3], flute: 1,
      l1: { n: [5, 8], ang: deg(45, 78), len: [0.42, 0.65], rad: 0.5, up: 0.1 },
      l2: { n: [4, 6], ang: deg(35, 60), len: [0.4, 0.62], rad: 0.55, up: 0.0, flat: true },
      l3: { n: [3, 5], ang: deg(35, 60), len: [0.4, 0.62], rad: 0.55, up: 0.0, flat: true }, droop: 0.2, flat: 0.7 },
    cl: { size: 0.42, nodes: [6, 9], reach: 0.86, branch: 0.5, twig: '#4a3830', zigzag: 0.16, twigW: 0.008 },
  },
  serviceberry: {
    name: 'Downy serviceberry', sci: 'Amelanchier arborea', leaf: 'serviceberry', bark: 'serviceberry', layer: 'under',
    h: [4, 9], dbh: [0.06, 0.18], niche: { m: [0.05, 0.35, 0.7], pos: 'slope' }, density: 0.5, trans: 1.0, hueVar: 0.10, sparse: 0.55,
    arch: { form: 'decurrent', bole: [0.25, 0.42], flare: 1.15, flareH: 0.04, buttress: 0.0, lean: 0.16, wobble: 0.05, shape: 'oval', stems: [2, 4],
      l1: { n: [5, 8], ang: deg(25, 52), len: [0.3, 0.5], rad: 0.5, up: 0.25 },
      l2: { n: [3, 5], ang: deg(30, 55), len: [0.4, 0.6], rad: 0.55, up: 0.1 },
      l3: { n: [3, 4], ang: deg(30, 60), len: [0.4, 0.62], rad: 0.55, up: 0.0 }, droop: 0.1 },
    cl: { size: 0.36, nodes: [5, 8], reach: 0.82, branch: 0.4, twig: '#4a3630', twigW: 0.008 },
  },
  frasermagnolia: {
    name: 'Fraser magnolia', sci: 'Magnolia fraseri', leaf: 'frasermagnolia', bark: 'magnolia', layer: 'under',
    h: [7, 14], dbh: [0.12, 0.3], niche: { m: [0.5, 0.8, 1.0], pos: 'cove' }, density: 0.45, trans: 0.9, hueVar: 0.05, sparse: 0.6,
    arch: { form: 'decurrent', bole: [0.35, 0.52], flare: 1.2, flareH: 0.04, buttress: 0.05, lean: 0.1, wobble: 0.03, shape: 'oval', stems: [1, 2],
      l1: { n: [3, 5], ang: deg(25, 50), len: [0.3, 0.46], rad: 0.55, up: 0.35 },
      l2: { n: [2, 3], ang: deg(30, 55), len: [0.4, 0.6], rad: 0.6, up: 0.3 }, droop: 0.0 },
    cl: { size: 0.9, nodes: [2, 3], reach: 0.42, branch: 0.4, nodeMul: 1, fill: 0, twig: '#5a4a3a', whorl: [6, 8], scale: 0.9, droop: 0.7, twigW: 0.022 },
  },
  // ============================================================ shrubs
  witchhazel: {
    name: 'American witch hazel', sci: 'Hamamelis virginiana', leaf: 'witchhazel', bark: 'smoothgray', layer: 'shrub',
    h: [2.5, 5.5], dbh: [0.03, 0.08], niche: { m: [0.15, 0.5, 0.88], pos: 'any' }, density: 0.8, trans: 1.0, hueVar: 0.06, sparse: 0.5,
    arch: { form: 'shrub', stems: [3, 5], lean: 0.75, wobble: 0.08, shape: 'vase', flare: 1.0, arch: 0.35,
      l1: { n: [4, 6], ang: deg(30, 60), len: [0.35, 0.55], rad: 0.55, up: 0.1, flat: true },
      l2: { n: [3, 5], ang: deg(35, 60), len: [0.4, 0.6], rad: 0.6, up: 0.0, flat: true }, droop: 0.2, flat: 0.6 },
    cl: { size: 0.45, nodes: [4, 6], reach: 0.82, branch: 0.4, twig: '#5a4a3a', zigzag: 0.2, twigW: 0.009, extras: [{ name: 'hazelflower', p: 0.85, tip: 1 }] },
  },
  spicebush: {
    name: 'Spicebush', sci: 'Lindera benzoin', leaf: 'spicebush', bark: 'smoothgray', layer: 'shrub',
    h: [1.6, 3.4], dbh: [0.02, 0.05], niche: { m: [0.58, 0.88, 1.0], pos: 'cove' }, density: 0.8, trans: 1.0, hueVar: 0.05, sparse: 0.6,
    arch: { form: 'shrub', stems: [3, 6], lean: 0.6, wobble: 0.07, shape: 'vase', flare: 1.0, arch: 0.25,
      l1: { n: [4, 7], ang: deg(30, 60), len: [0.35, 0.55], rad: 0.55, up: 0.15 },
      l2: { n: [3, 5], ang: deg(35, 60), len: [0.4, 0.6], rad: 0.6, up: 0.0 }, droop: 0.15 },
    cl: { size: 0.4, nodes: [5, 7], reach: 0.82, branch: 0.4, twig: '#4a4a34', twigW: 0.008, extras: [{ name: 'berries', p: 0.12, tip: 1 }] },
  },
  viburnum: {
    name: 'Mapleleaf viburnum', sci: 'Viburnum acerifolium', leaf: 'viburnum', bark: 'smoothgray', layer: 'shrub',
    h: [0.8, 1.7], dbh: [0.01, 0.02], niche: { m: [0.05, 0.3, 0.62], pos: 'slope' }, density: 1.2, trans: 1.0, hueVar: 0.12, colony: 0.6, sparse: 0.8,
    arch: { form: 'shrub', stems: [2, 5], lean: 0.2, wobble: 0.04, shape: 'oval', flare: 1.0,
      l1: { n: [2, 4], ang: deg(30, 50), len: [0.3, 0.5], rad: 0.6, up: 0.3 }, droop: 0.0 },
    cl: { size: 0.34, nodes: [2, 4], reach: 0.6, branch: 0.2, twig: '#5a4a44', twigW: 0.01, tilt: 0.6, extras: [{ name: 'berries', p: 0.25, tip: 3, center: true }] },
  },
  blueberry: {
    name: 'Hillside blueberry', sci: 'Vaccinium pallidum', leaf: 'blueberry', bark: 'greenstem', layer: 'shrub',
    h: [0.25, 0.6], dbh: [0.005, 0.01], niche: { m: [0.0, 0.12, 0.42], pos: 'ridge' }, density: 9, trans: 1.0, hueVar: 0.10, colony: 0.85, sparse: 0.5,
    arch: { form: 'shrub', stems: [5, 10], lean: 1.1, wobble: 0.1, shape: 'vase', flare: 1.0,
      l1: { n: [2, 4], ang: deg(35, 70), len: [0.4, 0.65], rad: 0.6, up: 0.15 },
      l2: { n: [2, 3], ang: deg(35, 60), len: [0.4, 0.6], rad: 0.6, up: 0.1 }, droop: 0.0 },
    cl: { size: 0.2, nodes: [6, 9], reach: 0.85, branch: 0.6, twig: '#6a7a3a', twigW: 0.009 },
  },
  rhododendron: {
    name: 'Great rhododendron', sci: 'Rhododendron maximum', leaf: 'rhododendron', bark: 'rhodo', layer: 'shrub', evergreen: true,
    h: [2.2, 5.0], dbh: [0.04, 0.10], niche: { m: [0.6, 0.95, 1.0], pos: 'cove', north: 0.3, stream: 11, away: 0.0 }, density: 9, trans: 0.25, hueVar: 0.03, gloss: 1.0, colony: 0.8,
    arch: { form: 'shrub', stems: [3, 6], lean: 0.65, wobble: 0.12, shape: 'round', flare: 1.0,
      l1: { n: [3, 5], ang: deg(35, 70), len: [0.4, 0.6], rad: 0.6, up: 0.25 },
      l2: { n: [2, 4], ang: deg(35, 65), len: [0.4, 0.6], rad: 0.65, up: 0.3 }, droop: 0.0 },
    cl: { size: 0.62, nodes: [2, 3], reach: 0.5, branch: 0.7, nodeMul: 1, twig: '#5a4a34', whorl: [6, 9], droop: 1.0, twigW: 0.02, bump: 1.2, extras: [{ name: 'rhodobud', p: 0.4 }] },
  },
  laurel: {
    name: 'Mountain laurel', sci: 'Kalmia latifolia', leaf: 'laurel', bark: 'rhodo', layer: 'shrub', evergreen: true,
    h: [1.4, 3.6], dbh: [0.03, 0.07], niche: { m: [0.0, 0.16, 0.46], pos: 'ridge' }, density: 5.5, trans: 0.3, hueVar: 0.03, gloss: 0.9, colony: 0.75,
    arch: { form: 'shrub', stems: [3, 6], lean: 0.6, wobble: 0.14, shape: 'round', flare: 1.0,
      l1: { n: [3, 5], ang: deg(35, 70), len: [0.4, 0.6], rad: 0.6, up: 0.25 },
      l2: { n: [3, 4], ang: deg(35, 65), len: [0.4, 0.6], rad: 0.65, up: 0.3 }, droop: 0.0 },
    cl: { size: 0.36, nodes: [2, 3], reach: 0.55, branch: 0.7, nodeMul: 1, twig: '#6a5a44', whorl: [7, 11], droop: 0.6, twigW: 0.018 },
  },
  doghobble: {
    name: 'Mountain doghobble', sci: 'Leucothoe fontanesiana', leaf: 'doghobble', bark: 'greenstem', layer: 'shrub', evergreen: true,
    h: [0.7, 1.5], dbh: [0.008, 0.015], niche: { m: [0.7, 0.97, 1.0], pos: 'cove', stream: 6, away: 0.0 }, density: 6, trans: 0.3, hueVar: 0.04, gloss: 1.0, colony: 0.8,
    arch: { form: 'shrub', stems: [5, 10], lean: 0.75, wobble: 0.05, shape: 'arching', flare: 1.0,
      l1: { n: [1, 3], ang: deg(20, 45), len: [0.3, 0.5], rad: 0.7, up: -0.3 }, droop: 1.0, arch: 1.0 },
    cl: { size: 0.42, nodes: [8, 12], reach: 0.9, branch: 0.1, twig: '#6a3a3a', twigW: 0.01, spread: 0.9 },
  },
  hobblebush: {
    name: 'Hobblebush', sci: 'Viburnum lantanoides', leaf: 'hobblebush', bark: 'smoothgray', layer: 'shrub',
    h: [1.0, 2.4], dbh: [0.015, 0.03], niche: { m: [0.62, 0.86, 1.0], pos: 'cove', north: 0.8 }, density: 0.6, trans: 1.0, hueVar: 0.10, colony: 0.6, sparse: 0.7,
    arch: { form: 'shrub', stems: [2, 5], lean: 0.75, wobble: 0.06, shape: 'arching', flare: 1.0,
      l1: { n: [2, 4], ang: deg(30, 60), len: [0.35, 0.6], rad: 0.65, up: 0.0, flat: true }, droop: 0.5, flat: 0.8, arch: 0.6 },
    cl: { size: 0.5, nodes: [2, 4], reach: 0.62, branch: 0.15, twig: '#5a4a3a', twigW: 0.012, tilt: 0.5, extras: [{ name: 'berries', p: 0.15, tip: 3, center: true }] },
  },
};

// Virginia creeper climbs the boles of the great trees (generated per host by generateVine).
export const CREEPER = {
  name: 'Virginia creeper', sci: 'Parthenocissus quinquefolia', leaf: 'creeper', bark: 'smoothgray', layer: 'vine', trans: 1.0, hueVar: 0.10,
  cl: { size: 0.36, nodes: [2, 3], reach: 0.5, branch: 0.2, twig: '#6a3030', rachis: '#b03a34', twigW: 0.012, nodeMul: 1, fill: 0 },
};

// Saplings and pole-sized trees of canopy species share the adult cluster art with juvenile architecture.
export function juvenileArch(sp, stage) {
  const a = sp.arch;
  // stage 0: sapling (1.5–5 m), 1: pole/subcanopy
  const j = JSON.parse(JSON.stringify(a));
  if (j.form === 'decurrent') {
    j.bole = stage === 0 ? [0.25, 0.4] : [0.42, 0.6];
    j.flare = 1 + (a.flare - 1) * (stage === 0 ? 0.15 : 0.5);
    j.buttress = (a.buttress || 0) * (stage === 0 ? 0 : 0.4);
    j.l1 = { ...a.l1, n: stage === 0 ? [4, 7] : [6, 9], len: stage === 0 ? [0.3, 0.5] : [0.2, 0.32], ang: [a.l1.ang[0] * 0.75, a.l1.ang[1] * 0.8], up: 0.35 };
    if (stage === 0) { j.l2 = { ...a.l2, n: [2, 3] }; delete j.l3; }
    else j.l3 = a.l3 ? { ...a.l3, n: [2, 3] } : undefined;
    j.lean = (a.lean || 0) + (stage === 0 ? 0.08 : 0.04);
    j.wobble = (a.wobble || 0) * 2.5;
  } else if (j.form === 'excurrent') {
    j.bole = stage === 0 ? [0.08, 0.2] : [0.2, 0.36];
    j.l1 = { ...a.l1, n: stage === 0 ? [12, 18] : [26, 38] };
    j.flare = 1 + (a.flare - 1) * 0.3; j.buttress = 0;
  }
  return j;
}

export const CANOPY = Object.keys(SPECIES).filter((k) => SPECIES[k].layer === 'canopy');
export const UNDER = Object.keys(SPECIES).filter((k) => SPECIES[k].layer === 'under');
export const SHRUBS = Object.keys(SPECIES).filter((k) => SPECIES[k].layer === 'shrub');
