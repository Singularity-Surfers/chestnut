# Round 1 — photorealism review (set3, 12 views)

Reviewer role: environment art director / lighting artist. Judged against a photograph, with the practical bar being the best real-time game environments. Images judged at full 1600x900 plus enlarged crops; compared with `reference-images/` (american-beech, red-maple, christmas-fern, hay-scented-fern, eastern-hemlock, northern-red-oak, american-chestnut) and `historical-references/` (richards-october, chestnut-trunk-with-group) and `chestnut-pic.png`. Source code was not read; causes named below are inferred from what the pixels look like.

Pixel coordinates are (x, y) in the 1600x900 frame, origin top-left.

## Summary

None of the twelve frames would be mistaken for a photograph, even at thumbnail size. The scene has real strengths as a *design*: the species mix and colour distribution are thoughtful, the litter contains recognisable chestnut, maple and oak leaf shapes and chestnut burs, the mid-distance in `grove.png` has believable depth haze, and leaf shadows fall on trunks. But five things each individually break the illusion in under a second: the far-terrain "reptile scale" texture, the water, trunks that end in floating open skirts, painted-on braid bark, and a woven dither pattern over everything in shadow. Behind those sit flat lighting, opaque oversize leaf cards and frosted-looking hemlocks. At present the look is closer to a mid-2000s game with a painterly filter than to a modern real-time forest.

## Scores

| Category | Score (1–10) | One-line reason |
|---|---|---|
| Overall photorealism | 3 | No frame survives a glance; several contain outright rendering faults. |
| Lighting & shadows | 3 | Leaf shadows on trunks exist, but the ground has almost no sun/shade structure, no contact shadows, no bounce. |
| Atmosphere (haze, depth, shafts, sky) | 4 | Interior haze and one set of shafts work; sky is a flat gradient and distant ridges get no aerial perspective. |
| Foliage rendering | 3 | Good colour mix at mid-distance; up close flat, opaque, oversize cards with dither and dark fringes; conifers wrong. |
| Tree trunks & bark | 2 | Smooth cones with a painted regular braid; bases float as open skirts; no root flare; one pattern for all species. |
| Forest floor | 4 | Best area conceptually (species leaf shapes, burs), but flat coplanar cards, textile dither, smearing, toy-coloured plants. |
| Rocks & moss | 3 | Low-poly facets or smooth pillows, plastic gloss, airbrushed uniform moss caps. |
| Water | 2 | Oil-slick iridescence, paint-smear reflections, milky opaque falls, cobble-pattern banks. |
| Distant views | 1 | Voronoi "scale" texture on faceted hills, hard seam to real trees, untextured slabs visible. |
| Colour & tone mapping | 4 | Palette is plausibly autumnal; reds drift to magenta/pink, yellows are chrome, contrast is mid-grey with no true blacks or highlights. |
| Image quality | 3 | Woven dither everywhere, overall softness, grazing-angle smear, LOD seams, alpha fringes. |

## Per-image notes

### october.png — 3/10
- The foreground stream (roughly 100–1500, 580–900) reads as a painted dirt road: a smeared yellow/red/teal reflection with swirly concentric blotches and no specular, no ripples, no visible bed, no bank edge. Along both edges (0–300, 760–850 and 1150–1450, 620–720) a Voronoi "cobblestone" pattern looks like paving.
- The big chestnut at right (1250–1500, 0–570) is a smooth cone with a regular braid drawn on it, a hard horizontal green gradient at the base and a straight intersection with the ground. Compare `chestnut-pic.png`: deep relief, irregular ridges, buttressed mossy bases.
- Conifers at centre (780–1000, 0–400 and 600–700, 100–330) are blue-black with white-blue speckle, so they read as frost-dusted spruce, not hemlock.
- The yellow sapling (250–530, 160–380) has leaves that scale to roughly 30–40 cm against the trunk behind it; flat single-colour cards.
- Against the Richards painting the light structure is missing entirely: no dark foreground, no sunlit path, no glowing backlit canopy. Everything from foreground to background sits at the same mid exposure. Moss boulders (530–750, 540–650) are smooth green cushions with no rock showing.

### grove.png — 3.5/10
- Best part of the whole set is the left third in the mid-distance (100–800, 150–700): layered trunks, haze, plausible colour. It still looks soft and slightly posterised.
- Foreground maple leaves (820–1600, 0–760) are flat cut-outs with a visible woven/halftone pattern on every shadowed leaf, no veins, no thickness, no translucency, and they are far too large.
- The giant trunk (840–1300, 0–870) ends in a concave skirt that hovers on the litter (840–1300, 820–870); moss is an airbrushed green band with a level top edge at about y=640.
- Hemlock (380–850, 0–450) is a set of dark slabs with blue-grey noise; the shafts at (640–760, 60–140) are too faint to register.
- The stream at lower left (0–250, 720–900) is a beige motion-blur smear; the mossy log (200–460, 770–870) is a smooth green tube.

### trunk.png — 3/10
- The trunk is a perfect cone; the bark pattern stretches and shrinks along it (dense scales near the top at 760–860, 150–350, long streaks near the bottom). The reference `northern-red-oak.jpg` shows real plate relief catching rim light.
- The crown is four straight cylinders forming a cross (520–960, 0–200) with leaf clumps floating near, not on, them. No secondary branches, no twigs.
- Leaves against the sky are opaque nuggets with dark outlines; in the reference they glow, with a fine black lattice of twigs. The orange crown (980–1370, 0–300) is the nearest to working.
- Hemlock masses (0–600, 60–560 and 1150–1600, 100–500) have white-blue frosted edges and a dark woven dither. The trunk's sunlit patch (700–800, 330–600) shows a visible screen-door pattern.
- The light shafts (520–720, 540–640) are a good idea but appear as one banded fan from behind the trunk; the sky is an empty gradient.

### bark.png — 2.5/10
- This is the close-up that should sell the tree and it does the opposite: a regular lens-shaped braid of thin black lines on a flat tan surface, like a printed textile. No ridge height, no flat-topped plates, no flaking, no lichen, no colour variation between ridge and furrow.
- The silhouette at left (130–200, 0–640) shows vertical pleats, so the trunk reads as a hanging curtain; the bottom (380–900, 850–900) is a dark open arch above the ground.
- The moss is a green tint with a soft level boundary at y≈640, not patches following crevices and the wet side.
- The blurred leaf shadows on the bark are the best lighting in the set, but they look like paint because the surface has no relief to break them up.
- Hemlocks at right (980–1500, 0–760): pole trunks with broadleaf-shaped cards in grey-white clumps.

### floor.png — 3.5/10
- Strong conceptually: serrated chestnut leaves, maple and oak shapes, burs. But every leaf lies perfectly flat and coplanar, with no curl, thickness, overlap shadow or twigs, and the palette is far too yellow and clean. Compare the leaf litter in `christmas-fern.jpg`: brown, crumpled, wet, three-dimensional.
- A coarse burlap/canvas weave covers the shadowed ground and leaves in the foreground (300–1100, 480–890). This is the most obvious artefact in the image.
- The Virginia creeper (420–1070, 400–890) is flat bubblegum pink, matte and unshaded; it should be deep crimson/scarlet with a waxy sheen and dark veins.
- Fern fronds (480–650, 390–620 and 150–470, 700–820) are flat teal combs with saw-tooth pinnae; the reference Christmas fern is glossy, lighter green, with distinct eared pinnae and arching fronds.
- Toward the horizon (0–1600, 80–330) leaves stretch into streaks, and there are no sun patches or contact shadows anywhere.

### cascade.png — 1.5/10
- The water (0–900, 480–900) is a milky lavender sheet with a rainbow contour "oil slick" (380–720, 560–860) and a rectangular patch of streaks at (680–800, 840–880). Nothing about it reads as water.
- Boulders are low-poly with sharp flat facets and knife edges (440–720, 400–520; 850–1150, 620–760; 380–640, 800–900), shaded like wet black plastic, with a drawn crack line (820–1130, 370–430).
- Moss is a uniform bright-green airbrush with soft grey holes (640–900, 230–340); it has no thickness or edge.
- In the background (440–640, 100–280) large flat yellow and orange slabs and a striped ridge are visible between the trees. This is a far-terrain fault showing through the forest.
- Halftone dots are visible on rock edges (620–760, 300–500) and the bank at right (1150–1500, 560–900), which also shows the cobble Voronoi pattern.

### ridge.png — 3/10
- The central trunk (940–1180, 0–790) is near-black with vertical pleats and stands on the slope as an open tent: litter is visible under and inside the arch at (950–1170, 720–790). The trunk behind it (900–1000, 0–570) carries the same braid.
- There is no directional light on the ground at all: no trunk shadows, no sunflecks, no darkening under the red maples (0–900, 60–500). The floor is one evenly lit carpet.
- The red maples at left are the best foliage colour in the set, but their trunks are thin poles with a snake-skin net pattern (225–255, 400–670).
- The slope has no fallen branches, rocks, sedge patches or hillside blueberry that the brief places on drier slopes; just leaf cards and one red bush (1470–1600, 630–720).
- Sky at top right is a flat blue-grey fill.

### gap.png — 3/10
- A tree-fall gap should be a pool of hard sunlight surrounded by darker forest. Here exposure is uniform; nothing says "gap".
- The red foliage (0–1200, 0–400) is magenta/hot pink with a heavy checker dither on the darker leaves (200–700, 60–300).
- The fallen trunk (170–750, 380–500) reads as a flat woven mat, with fan-shaped leaf cards hovering on it; the leaning trunk (730–900, 0–850) is a straight cylinder with a net pattern.
- Ground cover at lower left (0–600, 780–900) is pale mint and cream discs lying flat like confetti; the far ground at right (1300–1600, 550–800) shows fan/scale stacking patterns in the leaf cards.
- The rock (840–1190, 570–700) is a dark low-poly pillow with dither and no contact shadow.

### ravine.png — 4/10
- The strongest composition: a stepped stream, mossy stones, banks, layered trunks. At thumbnail size it nearly works.
- The falls (560–720, 540–700) are a white smear with vertical streaks and no foam, spray or sparkle; the pool below (200–700, 720–900) is frosted glass. Banks (430–560, 560–640 and 690–790, 560–860) are covered in the cobblestone pattern.
- Stones are repeated smooth pillows with identical green caps (430–610, 600–700; 590–680, 470–500; 310–400, 700–750).
- The hemlock sapling (850–1280, 150–800) is a black mass with silver-white lobed cards; the stream-side "ferns" (350–500, 380–520) look like broad-leaved tropical rosettes.
- Light is flat and bright in what should be the darkest, dampest place in the forest; every trunk carries the same bark in a different tint.

### canopy.png — 2/10
- The far hills (0–1600, 0–190) are a mosaic of coloured cells that reads as snake skin or pebbles, on visibly triangulated terrain (260–420, 60–180), with a hard line where real trees stop.
- Real crowns are thin clumps on grey poles; the ground and trunks are visible between them everywhere (200–700, 480–800). An old-growth canopy from above is closed, with broad interlocking domes and deep shadow between them.
- No sunlit and shaded sides to the crowns, no cast shadows from crown to crown; the whole frame is one muddy olive-yellow value with a dirty yellow fog.

### vista.png — 1/10
- The entire ridge system is the cell texture over a low-poly surface, including a sharp crease at (380–450, 380–640). It looks like beadwork, not forest.
- No aerial perspective: the far ridge at the horizon (0–1000, 200–260) has the same contrast and saturation as the near slope. The signature of these mountains is successive ridges fading to pale blue.
- Sky is a flat mauve gradient with no sun, cloud or horizon glow; near trees (0–1600, 440–900) are underlit and brown.

### stream.png — 3/10
- Stream surface (0–1000, 430–900): a blurred autumn-colour smear with a blue patch and cobbles showing through, no ripples, glints, depth or wet margin. It reads as a painted floor.
- The beech at right (1090–1350, 0–590) is the one trunk with a species-appropriate pale smooth bark, but it has a burlap weave across it, a soft dark-green blob for moss, and a three-sided tent base floating on the litter (1090–1350, 540–590).
- Hay-scented fern at lower right (780–1600, 600–900) is the best ground plant in the set in shape and colour, spoiled by the dither pattern and flat shading.
- Mid-ground (150–1000, 100–450) has pleasing variety and depth, but background hemlocks (700–1000, 0–300) are blue-grey speckle, and round ground leaves (760–900, 840–900) are flat green discs.

## The 15 most damaging problems, ranked

### 1. Distant forest is a cell-pattern texture on low-poly hills — BLOCKER
**Seen in:** vista, canopy, cascade (background slabs at 440–640, 100–280).
**Fix:** Replace the far shell with a canopy representation built from the same placement function as the real trees so colour and density match across the seam.
- Mid range (about 150 m to 1.5 km): instanced crown proxies, either octahedral impostors captured from each species' tree at init, or 30–60 triangle noise-displaced domes with per-species vertex colour.
- Far range: displace the terrain shell upward by canopy height plus a crown bump field (inverted Worley F1 with jittered radii of 8–20 m, domain-warped), derive normals from that field, darken the valleys between crowns with the F1 distance as ambient occlusion, and light it with the sun so crowns have lit and shaded sides.
- Dither-crossfade each LOD boundary over a 50–100 m band instead of a hard cut.
- Apply aerial perspective to everything far: exponential height fog plus in-scatter that pulls contrast and saturation down and shifts hue to pale blue-grey with distance; show four or five ridge layers.
- Raise the far terrain tessellation or smooth its normals so creases and triangles are not visible, and find the tiles that render as plain yellow/orange slabs (missing material, skirt geometry, or a fog-exempt LOD).

### 2. Water does not read as water — BLOCKER
**Seen in:** cascade (worst), october, stream, ravine, grove.
**Fix:** Rebuild the water material.
- Refraction: sample the scene colour behind the surface offset by the water normal; attenuate with Beer–Lambert depth absorption and a faint tea-brown tannin tint so shallow edges are clear and pools darken.
- Reflection: Schlick Fresnel with F0 = 0.02, sampling a prefiltered cube probe captured at the stream (sky gaps and canopy), with screen-space reflection only as an optional refinement that falls back to the probe. The current smear looks like a reflection lookup distorted by a normal field that is far too strong and too low in frequency.
- Surface: two flow-mapped normal layers scrolling downstream at small amplitude, tighter and faster in riffles, nearly still in pools; GGX sun glints at roughness 0.05–0.1.
- Foam and falls: foam where slope or speed is high and where depth difference to rocks is small, using flow-advected noise with soft edges; build falls as separate strips with streaked, scrolling alpha and a few spray sprites at the base.
- Banks: darken and gloss a 10–30 cm wet margin; remove whatever maps a noise field through a hue ramp (the rainbow contours in cascade).

### 3. Trunks end in floating open skirts; no root flare — BLOCKER
**Seen in:** ridge (centre trunk), stream (beech), bark, grove, october, gap.
**Fix:**
- Extend every trunk 0.5–1 m below ground and never leave the bottom ring open.
- Build root flare by modulating radius in the lowest 1–1.5 m with 5–9 angular lobes of random phase and strength, falling off exponentially with height, and continue the strongest lobes as tapered surface roots that dive into the soil.
- Sample terrain height per vertex for the lowest rings so the flare follows the slope.
- Blend the last 10–20 cm of trunk into the litter material by height above terrain, pile leaf instances and moss in the root crotches, and stamp a soft ambient-occlusion decal on the ground around each base.

### 4. Bark is a painted, regular braid on a smooth cylinder, identical on every species — BLOCKER
**Seen in:** bark, grove, trunk, october, ridge, ravine, gap.
**Fix:**
- Generate a height field per species and bake height, normal, ambient occlusion, albedo and roughness to tileable textures at start-up. Chestnut: long, flat-topped, interlacing ridges 3–8 cm wide that split and merge, furrows 2–5 cm deep, from domain-warped ridged noise or Voronoi edge distance stretched about 1:10 vertically, with irregular spacing. Beech: smooth pale grey with fine horizontal wrinkles and lichen blotches. Yellow birch: bronze with horizontal lenticels and peeling curls. Hemlock: red-brown scaly plates. Tulip poplar: tight pale interlacing furrows. Oaks: blocky plates or long shiny "ski tracks" for red oak.
- Give near trees real relief: parallax occlusion mapping with self-shadowing, or displaced geometry on the nearest LOD so the silhouette is rough.
- Lighten ridge tops, darken furrows, vary roughness, and keep texel density constant along the trunk (scale UVs with girth) to stop the stretching seen in trunk.png.
- Place moss and lichen with a mask from facing direction, height, moisture noise and crevice depth so it is patchy, not a level green band.

### 5. Woven "burlap" / halftone dither over everything in shadow — BLOCKER
**Seen in:** floor, grove, gap, cascade, stream, trunk, bark.
**Fix:** The pattern sits in shadowed and occluded regions, which points to stochastic shadow or ambient-occlusion sampling (or hashed alpha) with a fixed screen-space pattern and no filtering.
- Use a 9–16 tap Vogel-disc PCF rotated by interleaved gradient noise that changes every frame, and resolve it with temporal anti-aliasing; without TAA, follow with a depth-aware 4x4 blur of the shadow term.
- If it is ambient occlusion, add the missing bilateral blur and upsample.
- For cut-out foliage use alpha-to-coverage with MSAA, or alpha test with mip-coverage preservation, rather than hashed/dithered alpha.
- Use three or four shadow cascades at 2048 so near shadows do not need such a wide noisy kernel.

### 6. Flat lighting: no sun/shade structure on the ground, no contact shadows, no bounce — BLOCKER
**Seen in:** ridge, gap, october, ravine, stream, floor, canopy.
**Fix:**
- Make the canopy cast into the sun shadow map (alpha-tested depth) so the floor gets sunflecks, and raise the sun-to-sky ratio so flecks sit three to four stops above shade.
- Attenuate sky ambient under the canopy with a top-down sky-visibility map (render canopy density from above, blur it, sample by world position) and tint that ambient warm with leaf-transmitted colour.
- Add ground-truth-style ambient occlusion (GTAO or HBAO at half resolution with bilateral upsample) plus short screen-space contact shadows toward the sun (8–16 depth steps) for ferns, litter and rock bases.
- Add bounce: a hemisphere term whose ground colour is litter albedo times sun irradiance, so trunk undersides and lower leaves pick up warm fill.
- For the gap view specifically, the opening should be the brightest thing in frame with surrounding forest a couple of stops down.

### 7. Leaves are flat, opaque, oversize cards — MAJOR
**Seen in:** grove, trunk, gap, october, stream, ridge.
**Fix:**
- Two-sided foliage shading with transmission: when the sun is behind a leaf, add a saturated transmitted term (albedo-tinted, wrapped, masked by shadow) so backlit canopy glows as in `northern-red-oak.jpg` and `american-chestnut.jpg`.
- Give each leaf shape: two to four quads bent along the midrib with random cup, curl and twist; procedural per-species atlas with veins in normal and albedo, blotchy colour (green along veins, brown spots, dried edges), waxy top and matte underside.
- Correct sizes against the trunks: chestnut 12–22 cm, red maple 6–10 cm, sugar maple 8–15 cm. Several foreground leaves currently read at 30 cm or more.
- Remove dark outlines: dilate colour past the alpha edge, use premultiplied alpha, preserve coverage across mips.
- Add twig-cluster cards (a branchlet with 8–20 leaves) to raise density without raising leaf size.

### 8. Hemlocks look frost-dusted and broad-leaved — MAJOR
**Seen in:** october, grove, trunk, bark, ravine, stream.
**Fix:**
- Replace lobed cards with flat needle-spray cards: two-ranked needles 8–15 mm on fine twigs, drawn into a procedural atlas, arranged in horizontal tiers with drooping tips and a nodding leader.
- Albedo deep green rather than black; remove the blue-white by capping specular (roughness 0.6 or more) and softening card normals toward a per-cluster spherical normal so they do not mirror the sky. The pale underside stripes should be faint and only visible from below at close range.
- Add transmission so backlit sprays turn bright yellow-green, as in `eastern-hemlock.jpg`.
- Give hemlock its own red-brown scaly bark and irregular dead lower branches.

### 9. Rocks are low-poly or pillow-shaped with plastic shading and airbrushed moss — MAJOR
**Seen in:** cascade, ravine, october, gap, stream.
**Fix:**
- More geometry (icosphere level 4–5) shaped by multi-octave noise plus a few planar cuts for angular bedding and fracture faces; smooth normals plus a triplanar detail normal.
- Dry rock roughness 0.7–0.9; gloss only in a wet band at the waterline. Grey-brown albedo with pale crustose lichen discs and dark water staining.
- Moss as a layer with thickness: shells or short displaced tufts, placed by up-facing normal times moisture times noise with a ragged edge, colour varying from yellow-green to dark green, with rim-lit velvet shading and caught leaf litter.
- Bury rocks 20–40% and blend litter and soil up their sides; add contact shadow.
- Replace the Voronoi "cobble" bank with instanced pebbles and cobbles of mixed size over wet gravel, sand and mud, with undercut banks and exposed roots.

### 10. Forest floor is a flat carpet of coplanar leaf cards — MAJOR
**Seen in:** floor, ridge, gap, ravine, stream, october.
**Fix:**
- Base layer: a baked tileable litter material (many overlapping leaves composited with height, normal and occlusion) dominated by browns and tans, with parallax, 16x anisotropic filtering and proper mips to end the grazing-angle streaks.
- Near camera: instanced leaf meshes with curl, cupping and tilt up to 30–40°, some on edge, with contact shadows.
- Debris: twigs, fallen branches, bark flakes, opened burs with nuts, acorns, hemlock cones, bare soil and moss patches.
- Shift colour so 60–70% of litter is brown/tan with moisture-driven value variation, keeping fresh yellow and red leaves as accents; add a little waxy sheen.
- Break the fan/scale stacking patterns by randomising card yaw and scale per instance.

### 11. Tree architecture: pole trunks, a few straight limbs, thin crowns — MAJOR
**Seen in:** trunk, canopy, ridge, october, bark.
**Fix:**
- Grow trees with a recursive or space-colonisation model with at least four branch orders, taper, curvature under gravity and toward light, and branch collars.
- Add trunk sweep and lean, non-circular lobed cross-sections, burls, stubs and dead limbs; give old chestnuts massive scaffold limbs and crowns 15–25 m wide.
- Size crowns so neighbouring trees interlock and cover is 85% or more from above, with narrow gaps between crowns; add snags and a few true canopy gaps.

### 12. Sky and aerial perspective — MAJOR
**Seen in:** vista, canopy, trunk, ridge, october.
**Fix:**
- A physically based sky (Hosek/Preetham or a precomputed scattering table) with a sun disc, horizon brightening and a lit cloud layer.
- Drive fog colour from the same scattering model so haze is blue-grey in shade and warm toward the sun, with height falloff and valley mist over the stream.
- Volumetric shafts by marching the sun shadow map at half resolution (16–32 jittered steps, forward-scattering phase function, bilateral and temporal filter) so beams appear wherever the canopy opens, without banding.

### 13. Ground plants look like plastic rosettes — MAJOR
**Seen in:** october, ravine, floor, gap, grove, stream.
**Fix:**
- Fern fronds as arching strips with three to five bends along the rachis, 20–40 pinna pairs from a procedural alpha atlas: once-pinnate, glossy, eared pinnae for Christmas fern; lacy twice-cut fronds turning pale yellow for hay-scented and lady fern; 6–15 fronds per crown in a vase form with drooping tips.
- Desaturate the greens, add transmission and self-shadowing, darken the crown base.
- Sedges as dense clumps of thin curved blades with a specular line; galax as glossy round leaves on short petioles turning burgundy, not flat pale discs; Virginia creeper in deep scarlet with sheen.

### 14. Colour and tone mapping — MAJOR
**Seen in:** gap, floor, vista, canopy, ridge.
**Fix:**
- Filmic tone map (ACES or AgX) with exposure keyed to the forest interior, letting sky gaps and sunflecks roll off, plus restrained bloom.
- Move reds from magenta/pink toward scarlet and crimson and give them value variation; reduce yellow albedo saturation and let transmission supply the glow.
- Establish real blacks in deep shade and a slight cool-shadow / warm-light split; fix the dirty yellow cast in canopy and the muddy brown in vista.

### 15. General image quality: softness, smear, fringes, LOD seams — MINOR
**Seen in:** all; most visible in floor (horizon), stream, gap (fallen log), canopy.
**Fix:** Render at native resolution with TAA or 4x MSAA plus alpha-to-coverage; enable 16x anisotropic filtering and mipmaps on all procedural textures; cross-fade LODs; fix the fallen log's UV direction and give it round shading; make sure every far object receives fog.

## What already works and should be kept
- Species-specific leaf silhouettes in the litter and chestnut burs on the ground (floor).
- The colour distribution of the stand at mid-distance (grove left third, stream mid-ground, ridge left).
- Blurred leaf shadows falling across trunks (bark, grove) and the presence of light shafts (trunk).
- The stepped-stream layout and layered understory in ravine.

VERDICT: NOT SATISFIED
I would be satisfied when at least nine of the twelve views read as a photograph at first glance at 1600x900, with no view showing a rendering fault (cell-textured hills, oil-slick or smeared water, floating trunk bases, woven dither), and with the giant chestnut close-ups holding up beside `chestnut-pic.png` for bark relief and root flare.
