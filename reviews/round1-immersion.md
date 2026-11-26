# Round 1 review: immersion, sense of place and the Richards mood

Reviewer role: technical art QA lead / experience designer. Judged from images only (no source read).

Material reviewed: the brief; `richards-october.png`, `chestnut-trunk-with-group.png`, `chestnut-pic.png`; all twelve views in `shots/set3/` at full size plus magnified crops; 24 portraits from `shots/portraits2/` (tree: chestnut, chestnut_giant, hemlock_giant, tulip_giant, whiteoak, dogwood, beech, redmaple, sugarmaple, ybirch, sourwood, hickory, frasermagnolia, rhododendron, laurel, witchhazel, hobblebush, viburnum; ground: christmasfern, galax, buropen, pasedge, bracken, partridgeberry, aster).

All pixel regions are given as (x-range, y-range) in the image's own pixels: 1600x900 for set3, 1280x800 for portraits.

## Summary

The project has the right ingredients and the right palette: a gold-dominant forest with scarlet islands, a believable species list, and a leaf-litter floor (serrated chestnut leaves, open burs with nuts, Christmas fern, Virginia creeper) that is clearly the product of real botanical care. A few frames have genuine depth: the left half of `grove.png`, the stream line in `ravine.png`, and the sun-through-canopy look-ups in the portraits.

It does not yet feel like standing in a lost old-growth cove, and it is a long way from photoreal. Four things break the spell in almost every frame:

1. A regular dot/weave stipple in every shadowed surface, which turns the floor into needlepoint and foliage into knitted fabric.
2. Water that reads as a tan paved road, a milky oil slick or a white ribbon, never as dark forest water.
3. Giant trunks that are smooth cones with a tent-skirt base and line-drawn bark, so 5–7 ft boles read as stage props with no scale.
4. A far field made of Voronoi "dragon scales" and flat-coloured polygons that is visible not only from the air but through the trees at eye level.

On top of that the lighting is flat midday with a cool blue sky and blue fog, which is the opposite of Richards' low warm backlight, and most of the curated cameras are either blocked by a sapling or pointed at the weakest asset.

## Scores

| Criterion | Score (1–10) | One-line reason |
|---|---|---|
| Immersion | 4 | Colour and species richness evoke autumn woodland; stipple, water, trunks and far field break it in nearly every frame. |
| Sense of scale | 3 | Wide bases but conical boles, no buttress roots, no great limbs, pole-plantation canopy, no scale cues. |
| Composition of the curated views | 3 | Two usable frames (`ravine`, `grove`), one partial (`october`); the rest are blocked, subject-less or expose LOD. |
| Faithfulness to the Richards mood | 3 | Pool, big tree at right and red tree are present; light, tone, pool, boulder, lean, path and atmosphere are not. |
| Natural (non-algorithmic) feel | 4 | Litter is good; placement is even, sizes uniform, every stem straight and upright, moss is a band, no deadwood. |
| Freedom from technical artifacts | 2 | Stipple everywhere, broken water, LOD scales and flat polygons, floating trunk hems, seam line in half the portraits. |
| Visual variety between locations | 5 | Stream, slope, ridge and gap differ in terrain, but share one light, one density, one palette and the same hero assets. |
| Overall beauty | 4 | Pleasant colour at thumbnail size; does not survive full-size viewing. |

Measured support for the mood scores (luminance 0–1, from the PNGs):

| | Median luminance | Bottom-third mean | Blue-dominant pixels | Pixels with saturation > 0.8 |
|---|---|---|---|---|
| Richards, "October" | 0.23 | 0.20 (darkest band) | 0.5% | 2% |
| `october.png` | 0.34 | 0.37 (brightest band) | 7.3% | 12% |
| `floor.png` / `gap.png` | 0.35 / 0.33 | – | – | 30% / 22% |

The painting is a low-key, warm picture whose foreground is its darkest zone. The homage is brighter, cooler, far more saturated, and its foreground is its brightest zone.

## 1. Immersion and sense of place

**Scale of the giants.** The reference photographs show columns: almost no taper for the first 10–15 m, a huge root flare with buttresses that grip the slope, bark in long interlacing flat-topped ridges several centimetres deep, moss and ferns climbing the roots, and people dwarfed beside them. The renders show cones. In `trunk.png` the bole tapers evenly to a point where four thin limbs leave from one node in a cross, like a telegraph pole. In `bark.png`, `grove.png`, `ridge.png` and `stream.png` the base is a smooth skirt ending in a clean hem. Measured against the ferns, the right-hand chestnut in `october.png` is about 1.6 m across at the base, so the size is nominally there, but nothing lets the eye read it: no root, no limb, no fallen branch, no path, nothing of known size except ferns that are themselves uniform. In `canopy.png` and `vista.png` the same forest reads as a 30-year-old pole stand: narrow tufts on thin stems with the ground visible between them. Old-growth chestnut crowns should be 15–25 m wide and interlocking.

**Depth and layering.** The vertical layering the brief asks for is present in principle (canopy, understory dogwood/maple tier, shrubs, ferns). The left half of `grove.png` shows it best, with pale trunks stepping back into haze. Elsewhere sightlines end at 15–30 m in a wall of small yellow shrubs and saplings. Richards looks 60–100 m down a lit path.

**Openness.** `ridge.png` and the portrait `tree_laurel.png` come closest to the "open, park-like" pre-blight understory. `october.png`, `gap.png`, `stream.png` and most portraits are too busy at eye level, and the busyness is even rather than patchy.

**Variety.** Terrain varies (pool, stream steps, slope, crest). Light, weather, density, palette and assets do not. Every frame has the same sun height and the same sky, except `vista.png`, which is dusk. Five portraits (`tree_ash`, `tree_buckeye`, `tree_tulip`, `tree_tulip_giant`, `tree_whiteoak`) are the same frame of the October pool, and each `_giant` portrait is the same frame as its ordinary partner, so a visitor has no way to tell a giant from an ordinary tree.

**Viewpoints.** See the per-image notes. In short: the lens is blocked in `grove`, `gap`, `ravine` and `bark`; the horizon is dull or broken in `vista`, `canopy` and `cascade`; the subject is unclear in `ridge`, `cascade` and `gap`.

## 2. Faithfulness to Richards in `october.png`

**What is right**

- A pool in the foreground, a great chestnut on the right, a red small tree in front of it with horizontal tiers of foliage.
- Mossy rocks at the water's edge and ferns on the banks.
- Gold canopy with red and orange accents and dark evergreen notes.
- A faint litter corridor running back on the left (150–330, 420–560).

**What is missing or wrong**

- **Format and lens.** The painting is upright (about 5:6), which is what makes the trunks tower. A wide-angle 16:9 frame flattens the trees and stretches the pool into a road.
- **Light direction and warmth.** Richards uses low, warm sun from behind and to the left: a glowing orange vanishing point at the end of the path, lit faces on the left-hand trunks and the boulder top, a luminous green-gold shrub in the centre, and deep shadow over the pool and the right foreground. The render has high, flat, shadowless light, open blue sky top centre (560–1100, 0–130) and blue-grey fog on the far trunks (250–700, 0–400).
- **The pool.** In the painting it is small, still and nearly black-brown, a sliver in the bottom 15% holding soft reflections, rimmed by dark wet stones. Here it is a pale olive-gold slab (0–1500, 560–900) filling the bottom 35%, dead centre, opaque, with blotchy distortion and no reflection of any trunk.
- **Boulders.** The painting's pale grey, lichen-spotted boulder pair, about chest height and catching the light at centre, is the hinge of the composition. It is absent. What stands in for it is three smooth green pillows (530–750, 545–650) and a flat white water patch (915–1000, 505–560).
- **The leaning dogwood.** Richards' dogwood trunk is a long pale diagonal from lower right to upper centre, crossing the chestnut, with red foliage spreading over the top half of the picture. Here the dogwood stem is vertical, dark, and lost against the chestnut bark (1330–1350, 380–590); its crown is cut by the top and right edges; there is no diagonal.
- **The chestnut.** In the painting it forks at about 4 m into two great limbs with a broken stub, and its bark is pale grey-green in the light. Here it is a smooth cone that leaves the frame without a single limb (1250–1500, 0–570).
- **The receding path.** No worn tread, no lit patches, no vanishing glow. The left side is closed by a near trunk and a dark hemlock shrub.
- **Atmosphere between trunks.** The painting's planes grow lighter and warmer with distance under a closed canopy. The render is crisp and its distance goes blue.
- **Understory.** The painting has one luminous shrub mass and is otherwise open. The render has an even row of yellow shrub spheres across the middle (560–1100, 380–560) and evenly dotted fern rosettes.
- **Foreground incident.** The painting's fallen limb at lower left, dark pool-edge stones and red creeper on the right-hand rock are missing.

**How to re-stage it.** Use a 4:5 or 3:2 frame, or keep 16:9 with a 35–40 mm-equivalent lens. Put the camera about 1.2 m high at the near edge of a small dark pool so the water is a sliver in the bottom 15–20%. Chestnut on the right third with its first fork inside the frame. Dogwood leaning 20–25 degrees across it, pale-barked. A pale, lichened boulder group at centre, lit from behind-left. A bare-earth footpath on the left third winding to a backlit gap. Sun 15–25 degrees high from behind-left, warm haze, closed canopy, no sky.

## 3. Per-image notes for the twelve curated views

### `october.png`
- **Works:** the cast is assembled; palette; ferns and litter on the banks.
- **Breaks it:** everything in section 2; hemlocks read as snow-dusted blue spruce (600–1000, 0–330); stream banks look like crazy paving (0–420, 720–880 and 1380–1600, 690–900); stipple on bank ferns (160–320, 560–700).
- **Re-frame:** as described in section 2.

### `grove.png`
- **Works:** the left half (0–800, 150–700) is the most convincing forest interior in the set: layered saplings, pale boles receding into haze, a faint light shaft (640–800, 60–180).
- **Breaks it:** a maple sapling a metre from the lens fills the right 40% with stippled, plate-sized leaves and white leaf backs (1000–1600, 0–700; white at 1055–1110, 160–240). The giant is cropped top and bottom so it reads as a wall, and its base is a clean arc with corner spikes (830–1310, 790–880). Frosted hemlock (370–870, 0–420). Road-like water at lower left (0–470, 700–800).
- **Re-frame:** step back 8–10 m and left so two or three giants are seen whole from root flare to first limbs, with the hemlock behind. No foliage within 3 m of the lens. About 40 degrees horizontal field of view.

### `trunk.png`
- **Works:** the look-up idea is right; gold against sky; moss on the upper sides of limbs; a light shaft (480–760, 540–640).
- **Breaks it:** perfect cone ending in a four-way cross of thin limbs (520–1130, 60–330); canopy only about half closed; leaf clusters are popcorn blobs with dark rims; hemlock frosting (0–600, 60–900); a maple sprig stuck in the corner (1100–1600, 480–900); moire across the bark and a squarish pale patch (690–800, 470–560).
- **Re-frame:** stand 2 m from the bole and tilt up about 60 degrees, not 85, so root flare and bark fill the lower frame and the column recedes. Pick a tree whose neighbours' crowns interlock overhead.

### `bark.png`
- **Works:** moss toward the base is the right idea; the understory on the right has pleasant layering.
- **Breaks it:** the weakest material in the project fills 55% of the frame. The bark is thin dark lines and soft blurred blotches on smooth tan planks with no relief at the silhouette; the left edge shows pleated ribbons (100–200, 0–900); there is a black void under the base (380–900, 860–900); nothing gives scale. It reads as a curtain or wickerwork.
- **Re-frame:** not until the bark is rebuilt. Then shoot obliquely with raking light from 1.5 m, trunk on one third, forest receding on the other two, with a fern frond, a bur or a creeper stem on the bark for scale.

### `floor.png`
- **Works:** the best content in the project: recognisable chestnut leaves, open burs with nuts, creeper, Christmas fern, sedge tuft.
- **Breaks it:** the stipple makes it embroidery (0–1000, 430–900); every leaf is flat and coplanar; fern is saturated plastic teal-green; creeper is salmon pink rather than scarlet; the camera is about 15 cm off the ground with a very wide lens, so leaves look 40 cm long; the top band is a cluttered, cropped horizon with a hot magenta shrub (480–550, 0–80); painted-in litter leaves have staircase edges (1000–1600, 450–900).
- **Re-frame:** camera at 40–50 cm, pitched 25 degrees down, longer lens with shallow depth of field, a buttress root and bole base in the upper third as the subject.

### `cascade.png`
- **Works:** the wet-rock surface detail on the centre boulder (800–1150, 380–520) is the most photoreal surface in the set.
- **Breaks it:** the weakest frame. No falling water is visible. The water is a milky grey sheet with rainbow oil-slick contours (350–760, 480–850) and rectangular glitch tiles (745–840, 847–880). Rocks are low-poly wedges and prisms (430–730, 380–480; 850–1150, 620–770; 370–640, 800–900). Moss is an airbrushed green blanket. Behind, the scale-textured hill and two giant flat-coloured triangles show through the trees (400–760, 110–290). Heavy stipple on the right (880–1600, 520–900). Flat, veinless tulip-poplar leaf cut-outs (1280–1450, 590–900).
- **Re-frame:** move 6–8 m downstream, camera 1.2 m high, looking upstream so the drop is seen as falling water framed by boulders, ferns and rhododendron under hemlock boughs, with no sky or far hill in frame.

### `ridge.png`
- **Works:** the most open understory in the set, with a clean litter floor.
- **Breaks it:** a near-black trunk splits the frame (940–1180, 0–790) and its hem hangs above the slope with a pointed corner (935–1185, 730–800). Nothing says "ridge": no fall-away, no sky through trunks, no drier-site character (chestnut oak, blueberry, laurel). Saplings are straight poles with horizontal sprays. Flat teal, lime, yellow and lavender polygons show between the stems (145–480, 280–365; 815–870, 395–425). Litter leaves and burs are sprinkled at uniform density (0–900, 600–900).
- **Re-frame:** stand on the crest looking along it with ground falling away on both sides, low sun through the trunks, and blue ridges glimpsed between boles.

### `gap.png`
- **Works:** a windthrow gap with a fallen bole is the right story; the floor is rich.
- **Breaks it:** a sapling trunk stands dead centre (730–880, 100–850) under a hot magenta crown that covers the top half (0–1200, 0–330) with knit-pattern stipple. The log reads as a wattle fence because its bark pattern runs around it instead of along it (160–760, 380–500). There is no gap: no sky opening, no pool of light, no root plate, no regeneration thicket. Bracken fronds are flat horizontal plates floating like doilies (1100–1420, 330–440; 1290–1600, 700–780). Ball shrubs (1180–1300, 235–330). Pale round discs like lily pads (0–330, 800–900).
- **Re-frame:** stand in shade at the gap edge looking into a sunlit opening: a huge fallen bole with its root plate and pit, light pouring in, tall grasses and saplings racing up, a wall of giants around it.

### `ravine.png`
- **Works:** the best composition in the set. The stream leads the eye up three steps past mossy boulders to hemlock trunks about 40 m away; colour balance is good.
- **Breaks it:** a hemlock sapling blocks the right-centre third and half of it is grey-white, as if flocked (760–1250, 150–900); its leader is a ruler-straight pole with a perfect right-angle cross (980–1160, 130–165). The channel is lined with flagstones (430–900, 560–900). The fall is a flat white sheet (560–720, 540–700) over dead-straight lips. The boulders are near-identical green loaves spaced like stepping stones; one has a black square hole (354–369, 704–715). The banks are too gentle to be a ravine.
- **Re-frame:** move 2 m left and 1 m forward to clear the sapling, lower to 1.3 m, and tilt so hemlock boughs close the top of the frame. Steepen the banks and add rhododendron.

### `canopy.png`
- **Works:** gold canopy with red islands and dark hemlock spires matches the brief's colour description.
- **Breaks it:** the top fifth is scale-textured hill with a zig-zag stretch on a steep facet (250–330, 50–180) and a hard seam where real trees stop (0–1600, 150–260). Crowns are small tufts on poles with ground showing between; trunks are blue-grey; no emergent giants; flat light.
- **Re-frame:** camera just above crown level looking across the canopy toward a low sun, so crowns overlap into a billowing surface with hemlock spires and layered ridges in haze behind.

### `vista.png`
- **Works:** a different time of day.
- **Breaks it:** 60% of the frame is Voronoi scales (0–1600, 210–700) with a faceted fold (380–470, 380–640); at the seam the scales become extruded blocks with flat red sides, like hay bales (1370–1600, 480–590). The ridge line is a smooth polygon edge with no tree silhouettes. The sky is a flat, empty lavender gradient. The foreground is under-exposed and has no focal point.
- **Re-frame:** remove from the curated set until the far field is rebuilt. Then shoot from a rock outcrop with laurel and a chestnut-oak limb framing layered blue ridges.

### `stream.png`
- **Works:** the mid-ground beech with coppery leaves over witch hazel (350–1050, 150–450) is attractive, and a smooth grey beech bole is a welcome change of bark.
- **Breaks it:** the water is a tan road filling 60% of the frame (0–1000, 380–900), with smeared diagonal streaks, flagstones showing through (560–1000, 640–900) and a step that looks like carpet over a kerb (880–1000, 380–420). The beech base is a tent with fins (1090–1340, 480–590), its moss is an airbrushed blob (1150–1290, 350–520) and it carries a hatched dark smudge (1240–1340, 40–130). A regular array of identical two-tone rosettes covers the left bank (20–420, 390–480).
- **Re-frame:** lower the camera to 0.8 m at the water's edge looking along the stream, beech on the right third, trunks reflected in dark water, the stream taking no more than a quarter of the frame.

## 4. Artifact list

### A. Stipple / dither (highest priority)
A regular dot lattice with a 3–4 px period appears wherever a surface is in shadow or penumbra. Under light shafts it becomes a 2 px checker. It will shimmer in motion.

| Image | Region |
|---|---|
| `floor.png` | (0–1000, 430–900), worst around the creeper (400–1000, 560–900) |
| `grove.png` | sapling leaves (1040–1300, 250–520); trunk contact shadow (880–1280, 760–850) |
| `gap.png` | red foliage (0–900, 0–330); ground (0–500, 600–900); rock (840–1180, 570–700) |
| `cascade.png` | ground (880–1600, 520–900); rock flanks (0–450, 480–600) |
| `bark.png` | base (780–1000, 760–900); left margin (110–200, 0–700) |
| `trunk.png` | whole bole (640–940, 300–900); checker in the shaft (700–800, 470–560) |
| `ridge.png` | dark trunk (940–1180, 0–790) |
| `stream.png` | beech bole (1090–1360, 0–590); foreground ferns (780–1600, 600–900) |
| `october.png` | bank ferns (160–320, 560–700; 1380–1600, 560–760) |
| `ravine.png` | shaded rock sides (420–610, 640–720); right-bank ferns (1040–1300, 760–900) |
| Portraits | `tree_witchhazel` (540–1060, 0–700); `tree_rhododendron` (0–620, 120–780); `tree_hobblebush` and `tree_viburnum` throughout; every `ground_*` foreground |

### B. Water
- `october.png`: opaque olive slab with blotchy, paint-like distortion (0–1500, 560–900); short red/yellow horizontal dash glitches (815–870, 855–862), (950–975, 855–860), (1015–1050, 785–790); flat white patch for the riffle (915–1000, 505–560).
- `cascade.png`: rainbow contour swirls (350–760, 480–850); streak (0–120, 600–760); rectangular tiles (745–840, 847–880), faint ones near (280–330, 680–710).
- `stream.png`: smeared diagonal reflection streaks over the whole surface; no specular ripples; no wet margin.
- `ravine.png`: flat white fall with no foam or volume (560–720, 540–700); straight weir-like lips (570–730, 455–470).
- `tree_beech.png`: a strip of water surface hangs in mid-air and is seen edge-on from below, like a white plank (780–1180, 610–760).
- `tree_tulip_giant.png`, `tree_whiteoak.png`, `tree_tulip.png`, `tree_ash.png`, `tree_buckeye.png`: a dark hairline crosses the pool at y = 722–723 (see H).

### C. Far field and LOD
- `vista.png`: scale texture (0–1600, 210–700); faceted fold (380–470, 380–640); extruded flat-sided blocks at the seam (1370–1600, 480–590); smooth ridge silhouette (0–1600, 200–260); hard boundary between real trees and proxy (0–1600, 440–620).
- `canopy.png`: scales (0–1600, 0–200); zig-zag stretch (250–330, 50–180); seam (0–1600, 150–260).
- `cascade.png`: scale hill and large flat orange/yellow triangles through the trees (400–760, 110–290).
- `ridge.png`: flat teal (145–178, 282–302; 417–445, 315–345), lime (200–225, 300–345), pale yellow (275–315, 285–325) and lavender (465–480, 350–365) polygons between stems; more at (815–870, 395–425).
- No aerial perspective anywhere: far hills are as saturated and contrasty as near crowns.

### D. Trunks and bark
- Line-drawn bark with blurred blotches and no relief: `bark.png` (160–900, 0–900); also `october.png` (1250–1500, 0–570), `grove.png`, `trunk.png`, `tree_dogwood.png` (0–330, 60–800), `tree_ybirch.png` (500–1280, 0–800).
- Pleated-ribbon silhouette: `bark.png` (100–200, 0–900); `ground_galax.png` (900–1230, 0–110); `ground_pasedge.png` (960–1280, 0–100).
- Floating or undercut base: `ridge.png` (935–1185, 730–800); `bark.png` (380–900, 860–900); `grove.png` (830–1310, 790–880).
- Tent-with-fins base: `stream.png` (1090–1340, 480–590).
- Cone taper and four-way cross: `trunk.png` (520–1130, 60–330).
- Crushed black bole: `ridge.png` (940–1180, 0–780).
- Vertically stretched streak bark on distant boles: `ravine.png` (150–250, 0–520; 640–680, 130–400); `tree_laurel.png` (150–350, 0–700).
- Oversized cell bark on small stems ("giraffe skin"): `gap.png` (730–880, 100–850); `ground_pasedge.png` (870–960, 0–250).
- Log with bark wrapped the wrong way: `gap.png` (160–760, 380–500); `tree_sourwood.png` (430–1200, 740–800).
- Uniform moss band at one height all round every bole: `october.png` (380–490, 510–570; 1260–1490, 480–560); `grove.png` (840–1300, 620–860); airbrushed blob in `stream.png` (1150–1290, 350–520).
- Leaf sprig sprouting from bare bark: `tree_ybirch.png` (710–950, 0–200).

### E. Foliage
- Hemlock white/grey frosting and blue cast: `october.png` (600–1000, 0–330; 590–700, 220–400); `grove.png` (370–870, 0–420); `bark.png` (880–1540, 0–700); `ravine.png` (760–1250, 150–520); `trunk.png` (0–600, 60–900; 1150–1600, 100–600).
- Hemlock sprays seen edge-on smear into white streaks: `tree_hemlock_giant.png` (60–470, 400–480; 0–330, 740–800).
- Ruler-straight leader with right-angle cross: `ravine.png` (980–1160, 130–165).
- White leaf backs: `grove.png` (1055–1110, 160–240).
- Popcorn leaf clusters with dark rims in the high canopy: `trunk.png` (400–1250, 0–600); all of `canopy.png`.
- Hot magenta / candy pink instead of scarlet, crimson or wine: `gap.png` (0–1200, 0–330); `floor.png` (480–550, 0–80); `ground_aster.png` (0–180, 0–280); `tree_viburnum.png` (500–830, 150–560).
- Square, pixel-like leaf cards: `tree_viburnum.png` (680–830, 190–330).
- Translucent overlapping pink discs, like tissue-paper flowers: `tree_hobblebush.png` (50–1280, 180–800).
- Lollipop crowns: `tree_beech.png` (670–900, 140–390; 565–720, 650–790); `gap.png` (1180–1300, 235–330; 1030–1080, 395–440).
- Flat plate bracken: `gap.png` (1100–1420, 330–440; 1290–1600, 700–780); `ground_bracken.png` (400–640, 230–420).
- Pale round discs: `gap.png` (0–330, 800–900); `stream.png` (830–900, 840–900).
- Flat veinless leaf cut-outs: `cascade.png` (1280–1450, 590–900).
- Partridgeberry as a neat stripe of teal dots: `ground_partridgeberry.png` (400–900, 380–540).

### F. Ground, rocks and placement
- Flagstone stream margins: `october.png` (0–420, 720–880; 1380–1600, 690–900); `ravine.png` (430–900, 560–900); `cascade.png` (1050–1420, 500–740); `stream.png` (560–1000, 640–900).
- Identical smooth moss loaves: `october.png` (530–750, 545–650; 1000–1090, 495–545); `ravine.png` (430–610, 600–720; 585–680, 450–500; 310–400, 695–750; 525–685, 700–760).
- Faceted low-poly rocks: `cascade.png` (see per-image notes).
- Black hole in moss: `ravine.png` (354–369, 704–715).
- Staircase edges on painted litter: `floor.png` (1000–1600, 450–900).
- Burs as uniform black dots: `ridge.png` (0–900, 600–900); `ground_aster.png` (300–1280, 250–600).
- Floating twig: `ground_partridgeberry.png` (620–780, 580–660).
- Straight poles lying dead level: `gap.png` (1310–1420, 338–342); a pale "goalpost" in `ground_bracken.png` (180–470, 0–160).
- Litter leaves aligned like roof shingles on a slope: `tree_laurel.png` (700–1280, 250–800).

### G. Light and tone
- Flat, empty sky: `vista.png` (0–1600, 0–250); no clouds or visible sun in any curated view.
- Blown sky: `tree_chestnut.png` (0–400, 0–300).
- Crushed blacks: `ridge.png` bole; `bark.png` base; 4.2% of pixels below 4% luminance in `floor.png` and `ridge.png`.
- Cool blue fog on distant boles: `october.png` (250–700, 0–400); `canopy.png` trunks.
- Light shafts exist but are faint and rare: `grove.png` (640–800, 60–180); `trunk.png` (480–760, 540–640).
- No banding found (the sky carries grain). No UI overlays in set3.

### H. Capture and portrait issues
- A full-width dark hairline at y = 722–723 in 32 of the 62 portraits (for example `ground_aster.png`, `tree_tulip_giant.png`, `tree_laurel.png`). Not present in set3.
- Duplicate frames: `tree_ash` = `tree_buckeye` = `tree_tulip` = `tree_tulip_giant` = `tree_whiteoak`; `tree_chestnut` = `tree_chestnut_giant`; `tree_hemlock` = `tree_hemlock_giant`.
- Very wide field of view with the camera pitched up makes every bole lean inward (`tree_hemlock_giant`, `tree_beech`, `tree_sourwood`); the named species is often not the subject.

## 5. What looks arranged rather than grown

- Mid-ground shrubs are evenly spaced yellow spheres (`october.png` 560–1100, 380–560).
- Ferns are single rosettes of one size and one colour at near-regular spacing (`october.png` both banks; `ravine.png` right slope).
- The same rosette herb repeats in a grid along stream banks (`stream.png` 20–420, 390–480; `ravine.png` 370–480, 430–520).
- Burs and loose leaves are scattered at one density everywhere, including far from any chestnut; every loose leaf lies flat.
- Every bole is perfectly vertical, round and straight with the same conical flare. No lean, sweep, fork, wound, hollow or burl. Saplings are poles with horizontal whorls.
- Moss is a band at one height around every trunk, on all sides, rather than patchy, aspect-dependent and running up the tops of roots.
- Boulders are one shape in three sizes, spaced like stepping stones, all fully moss-capped.
- The stream has constant width, smooth banks and straight step lips.
- Branches leave at right angles (hemlock) or from a single node (chestnut crown).
- Nothing has ever fallen over: no tip-up mounds, snags, stumps, branch litter, leaf drifts against logs or animal trails.

## 6. Additions that would most increase the feeling of being there

1. Warm volumetric haze between trunks with strong, frequent light shafts through canopy gaps.
2. Leaves falling and drifting, with dappled leaf shadows that move on the ground and boles.
3. Coarse woody debris at old-growth scale: fallen boles 1 m and more across, in several stages of decay, with moss, bracket fungi, root plates and pits; standing snags.
4. A worn footpath or game trail, which gives both a compositional line and a scale cue.
5. Vines: scarlet Virginia creeper climbing boles (it is in the brief) and heavy grape vines hanging from the canopy.
6. Depth of field for close views and a mild lens falloff for interiors.
7. Lichen and fungi on bark and rock, and pale, lichened rock faces to contrast with the moss.
8. A real sky: broken cloud, a visible low sun, and at least one overcast or post-rain mist variant.
9. Period life: a turkey, squirrels, a passenger-pigeon flock crossing a canopy gap.
10. Sound, if not already present: stream, leaf fall, wind in the crowns.

## 7. The 15 most valuable changes, ranked

1. **Blocker — remove the shadow stipple.** Replace the visible dither with properly filtered soft shadows (or blur the dither with a depth-aware pass, or resolve it with temporal accumulation). Acceptance: no dot lattice visible at 300% zoom in `floor.png` (400–1000, 560–900), the `grove.png` sapling or the `gap.png` crown.
2. **Blocker — rebuild water shading.** Still water should be dark, tannin-brown and mostly reflective at grazing angles, mirroring trunks, canopy and sky, with the bed visible only in the shallows. Add fine specular ripples, discrete floating leaves and a dark wet margin. Clamp refraction so it cannot produce rainbow contours or tile glitches (`cascade.png`, `october.png`). White water only on drops, as broken foam with vertical streaking. Clip the surface to the channel so no strip floats (`tree_beech.png`).
3. **Blocker — replace the far field.** Swap the Voronoi scale texture and extruded blocks for crown impostors at true crown size, with a bumpy tree-line silhouette on ridges, a mid-distance blend zone, and aerial perspective (two or three ridge layers fading blue-violet). Fix the flat-coloured polygons that show through the forest at eye level (`ridge.png`, `cascade.png`).
4. **Blocker — rebuild the giant boles.** Columnar for the first 12–18 m. A root flare of five to eight irregular buttresses sunk into the terrain with litter piled against them and proper contact shadow. Real relief in the bark: long, interlacing, flat-topped ridges with deep furrows that break the silhouette. Add burls, branch scars, a basal hollow on some trees, lichen. First limbs 0.5–1 m thick, staggered, ascending, not a cross (`bark.png`, `trunk.png`, `ridge.png`, `grove.png`).
5. **Major — light and grade for the Richards mood.** Sun 15–25 degrees high, warm, from behind-left in the hero views. Median luminance near 0.23 rather than 0.33, with the foreground the darkest zone. Warm amber haze instead of blue fog. Reduce saturation by 15–20% and move magentas to scarlet and wine. Darker, warmer ambient under the canopy.
6. **Major — re-stage `october.png`** as specified in section 2: small dark pool, pale lichened boulder group at centre, leaning pale dogwood crossing a forked chestnut, earth path receding left to a backlit gap, closed canopy, upright or 3:2 framing.
7. **Major — fix hemlock.** Remove the white/grey frosting and blue cast so foliage is deep warm green with a paler underside seen only from below. Build flat, feathery, drooping sprays, irregular whorls and a nodding leader (`ravine.png`, `october.png`, `grove.png`, `trunk.png`).
8. **Major — close the canopy and enlarge the crowns.** Crowns 15–25 m wide with secondary and tertiary branching and finer leaves, interlocking so that sky shows as small gaps (10–20%) from below and the ground is invisible from above (`trunk.png`, `canopy.png`).
9. **Major — open and de-regularise the understory.** Place shrubs and ferns in clumps tied to moisture and light, leave broad litter aisles with 60–100 m sightlines between boles, vary size widely, add lean and sweep to saplings and multi-stem clumps, remove ball crowns (`october.png`, `gap.png`, `stream.png`).
10. **Major — add deadwood and disturbance.** Large fallen boles with root plates and pits, snags, branch litter, with bark running along the log and proper ends and ground contact (`gap.png`).
11. **Major — natural stream channel and rocks.** Mixed cobble, gravel and sand bed with leaf packs, undercut and irregular banks, pools and riffles, uneven step lips. Varied boulders, angular and rounded, pale and lichen-spotted, moss on tops and shaded faces only, part buried, from fist-size to room-size. Rhododendron and doghobble thickets on the banks (`ravine.png`, `stream.png`, `cascade.png`).
12. **Major — re-shoot the curated set to a camera standard.** Eye height 1.6 m, 35–50 mm-equivalent lens, nothing within 3 m of the lens unless it is the subject, a clear foreground / mid-ground / background, a scale cue in every frame, no far-field proxy in shot. Drop `vista.png` and `cascade.png` until their subjects are fixed.
13. **Major — give the floor relief.** Curled and cupped leaves, drifts against roots and logs, hummocks, surfacing roots, moss and bare-soil patches, burs clustered under chestnuts rather than uniform, sharper litter texture edges, less plastic fern colour (`floor.png`, `ridge.png`).
14. **Minor — atmosphere in motion.** Falling leaves, motes in shafts, moving dapple, gentle sway, depth of field in close views, a cloud layer and visible sun.
15. **Minor — species asset and capture fixes.** Viburnum (square pink cards), hobblebush (translucent discs), bracken (flat plates), galax discs, tulip-poplar ground leaves (flat cut-outs), dogwood bark cell scale, partridgeberry stripe; remove the y = 722–723 hairline in portraits; make each portrait frame its named plant and give giants their own frames.

VERDICT: NOT SATISFIED — I would be satisfied when `october.png` can sit beside the Richards painting and share its low warm backlight, dark reflecting pool, pale boulder, leaning dogwood and receding path, and when every curated view survives full-size inspection with no stipple, no painted-road water, no cone-and-skirt trunks and no scale-textured hills, so that the giants read as giants without a figure for scale.
