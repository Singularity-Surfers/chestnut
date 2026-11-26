VERDICT: NOT SATISFIED

Score: 4.5 / 10 for photorealism (round 1: 3 / 10).

This build is clearly better than round 1. The woven dither is gone, trunks stand on the ground with a flare, pools reflect the forest coherently, the litter carries real species leaf shapes, and the horizon has layered blue ridges. But no frame in `set7` or `var7` would pass for a photograph, even at thumbnail size. The best ones (`october`, `stream`, `context_dogwood`, `spot_1`) read as an attractive painterly game scene, not as a camera pointed at a forest. Three things cause that in every interior frame: leaves are flat single-colour dabs with dark rims and no translucency; bark is a soft black-dash print on a smooth cone; and the light has no hierarchy, so every part of the frame is equally saturated and busy while evergreens crush to black. On top of those, the weather variants expose a shading fault (trunks turn bone-white in rain and overcast), the aerial views still fail outright, and the cascade still shows pastel rainbow blotches.

Sub-scores, round 1 → round 2: lighting 3 → 4; atmosphere 4 → 4.5; foliage 3 → 4; trunks and bark 2 → 3.5; forest floor 4 → 5.5; rocks and moss 3 → 3.5; water 2 → 4; distant views 1 → 2.5; colour and tone 4 → 3.5; image quality 3 → 6.

How I judged: every file in `shots/set7` and `shots/var7` at full size, plus enlarged crops; all of `portraits3` (24 at full size, including every `context_*`, the rest as 2x2 sheets); all thirteen `sheets2` files. Compared against `chestnut-pic.png`, the `historical-references` trunk photographs, `richards-october.png`, `scarlet-autumn-foliage.png`, `american-chestnut.jpg` and `eastern-hemlock.jpg`. I rendered no extra views and read no source code, so causes below are inferred from the pixels. Coordinates are (x, y) in the 1600x900 frame, origin top-left.

## What works

- The baked leaf litter: chestnut, maple, oak and tulip shapes, burs and twigs, in believable browns and golds. At 3–15 m it is the most convincing surface in the scene (`bark.png` right half, `spot_1`, `ground_*`).
- The round-1 dither is gone. Only a fine grain remains, and it is acceptable.
- Pools now reflect the forest coherently, with a wet gravel margin (`october`, `stream`).
- Trunk bases meet the ground with a flare and a moss tint. Nothing floats any more.
- The leaf and twig atlases in `sheets2` are botanically careful, with correct silhouettes per species.
- Hay-scented, lady and wood ferns have good shape and colour (`ground_ladyfern`, `ground_woodfern`).
- The horizon has four or five ridge layers fading to blue (`vista`), and light shafts appear where the canopy opens (`context_redoak`, `grove`).
- Blurred leaf shadows fall across trunks and ground in a few views (`bark`, `grove`, `spot_4`).

## Blocking issues

### 1. Leaves read as flat paint dabs, not leaves

**Where:** `october` (yellow sapling 110–460, 60–330; red crown 600–1500, 0–200), `stream` (foreground spicebush), `spot_4` (tulip sapling), `bark` and `habit_hobblebush` (pink discs), `cascade` (lime discs 740–1340, 600–900), `context_witchhazel`, `ground_galax` (orange triangles in the foreground), every crown in `trunk` and `context_*`.

**What is wrong:**
- Each leaf is one flat hue. The vein and blotch detail in `sheets2` does not survive to the screen (compare the veined spicebush leaves in `leaves_understory.png` with the blank yellow shapes in `stream`).
- The twig atlases (`twigs_*.png`) are pressed fans with every leaf facing the viewer, so the flatness is built into the source art.
- There is no shading gradient across a leaf, no curl, no sheen on the upper face, and backlit leaves do not glow more than front-lit ones.
- Leaves in a spray are coplanar and face the camera, so a crown reads as overlapping stickers.
- Every leaf has a darker rim, which gives the red crowns a stained-glass look.
- Colours sit near the display primaries: lemon-chrome yellow, bubblegum pink on hobblebush and viburnum, lime green on ground discs.

**Reference:** in `american-chestnut.jpg` one backlit leaf runs from yellow-green through orange to brown, with glowing veins, holes, dry margins and curl, and leaves hang at every angle including edge-on. In `scarlet-autumn-foliage.png` the crowns hold values from near-black shade to orange highlight, with thin dark twigs visible throughout.

**Suggestion:**
- Two-sided leaf shading with a transmission term (transmitted colour x sun x saturate(dot(-N, L)) x shadow). Make the transmitted colour more saturated than the reflected colour, and add a GGX highlight at roughness 0.35–0.5 on the upper face.
- Cut reflectance saturation by about a quarter and let transmission supply the glow.
- Bend each leaf along the midrib (two quads, 10–30° dihedral), curl it lengthwise, and jitter leaf normals within a spray by ±35°. Within about 8 m, instance real leaf meshes on twigs instead of whole-spray cards.
- Keep at least 128 texels along a near leaf. Derive a normal map from the veins, and add per-instance hue and value jitter with brown margins and spots.
- Remove the rims: pad colour past the alpha edge, and use premultiplied alpha or alpha-to-coverage.
- Darken leaves by depth inside the crown (per-cluster occlusion) so crowns have volume.

### 2. Bark is a printed pattern on a smooth cone, and trunks are featureless columns

**Where:** `bark` (300–900, 0–450), `october` (1250–1500, 0–570), `ridge` and `breezy_ridge` (1230–1500, full height), `context_rhododendron`, `trunk` (whole centre trunk), `spot_2` (left trunk), `sheets2/bark_a..c`.

**What is wrong:**
- The furrows are soft-edged black blobs painted into the albedo on a tan sheet. In `bark.png` this reads as tiger-stripe veneer; in `ridge.png` as draped velvet.
- Relief is a low, rounded normal map, like quilted leather. The trunk outline is a perfectly smooth line.
- There is no fine structure: no fibrous striation, cross-cracks, flakes, lichen or algae.
- The blocky tiles in `bark_c` are plain Voronoi cells and read as cobbles or reptile skin.
- The pattern stretches along the taper in `trunk.png`, fine near the top and long streaks at the base.
- Trunk form: the giants are perfect cones with no sweep, lean, burls, limb scars, dead stubs or low limbs.

**Reference:** `chestnut-pic.png` and `chestnut-trunk-with-man.png` show long flat-topped ridges interlacing in a net, crisp edges with light crests and shadowed furrows, relief visible at the silhouette, moss in patches, a burl, woodpecker holes. `massive-branching-trunk-with-person.png` shows twist, huge low limbs and an irregular column.

**Suggestion:**
- Bake a real height field per species. For chestnut: an anisotropic ridged network stretched about 1:12, shaped to flat plateaus and V-shaped furrows. Derive normal, occlusion and curvature from it.
- Build albedo from height and curvature (paler crests, warm-brown furrows, never pure black) and let occlusion and shadow supply the darkness.
- Add two finer octaves (fibrous striation at about 1:40, then grain) and lichen and algae masks.
- Within about 10 m use parallax occlusion mapping with self-shadowing, or true displacement on the nearest level of detail, so the silhouette is rough.
- Keep texel density constant: horizontal repeats proportional to girth, fixed metres per tile vertically.
- Trunk form: lobed, non-circular cross-sections, slight spiral and sweep, burls, branch-scar collars, a few dead stubs.

### 3. The light has no photographic structure; tone is over-saturated with crushed blacks

**Where:**
- `ridge`, `breezy_ridge`, `spot_3`: no sun patches or trunk shadows anywhere, everything lit equally.
- `gap`: the gap is no brighter than the forest around it.
- `golden_grove`, `dawn_grove`: low sun is only an orange tint, with no raking beams, long shadows or warm rims; the stream clips to flat white at 1370–1600, 670–730.
- `golden_vista`: the canopy is unlit dull olive under a pink sky.
- `october` vs `noon_october`: almost identical.
- `dusk_october`: near-black, with a birch glowing white at 960–990, 250–450.
- `night_grove`: full autumn saturation under moonlight.
- Evergreen shrubs (`october` 300–420, 400–520; `stream` 880–1200, 400–900) are solid black with no form.

**What is wrong:** there is no exposure hierarchy. Colour and contrast are the same in foreground, middle and background, so nothing leads the eye and depth collapses beyond about 30 m in clear weather. The lit areas are saturated albedo at full strength; the shade under shrubs and conifers is black. Ambient occlusion, contact shadow and bounce are barely visible. Time of day changes tint, not the direction and character of the light.

**Reference:** a photograph of a forest interior has sunflecks three to five stops above the shade with soft edges, blown sky gaps, shade filled with warm bounce from the litter, and trunks growing paler and bluer at 20, 50 and 100 m. `richards-october.png` has a dark foreground, a lit path and a glowing middle canopy.

**Suggestion:**
- Check that the canopy casts into the sun shadow map at every distance (`ridge` and `gap` show none). Set sun-to-shade to roughly 8–10:1, with a penumbra that widens with blocker distance.
- Attenuate sky ambient under the canopy with a top-down visibility map. Add horizon-based ambient occlusion, screen-space contact shadows, and a warm ground-bounce hemisphere term.
- Add light height fog with sun in-scatter in clear weather so distant trunks lift and desaturate.
- Use a filmic tone curve that desaturates highlights, exposure keyed to interior mid-tones, and about 20% less global saturation.
- Give evergreens a minimum albedo and ambient so they hold detail.
- At low sun make the direct light warm and the fill blue. At night, desaturate strongly toward a cool grey.

### 4. Rain, overcast and mist turn trunks white and conifers frosted

**Where:** `rain_october` (all trunks bone-white, e.g. 1180–1600, 60–560), `afterrain_stream` (right trunk putty-grey at 1180–1560; pale pillars behind), `overcast_october` and `overcast_ravine` (pale grey trunks; grey-white blotches on hemlock), `mist_grove` (hemlock 1040–1420, 0–330).

**What is wrong:** with the sun removed, bark goes pale and a broad sky reflection washes it toward white. Wet surfaces get lighter instead of darker, and the bark normal map shows as carved plaster. Conifer cards mirror the white sky. The rain frame is close to monochrome, with white columns.

**Reference:** rain darkens bark to about half its dry value and saturates it. Wet trunks are the darkest things in the frame, with thin highlights on ridge crests. Overcast is when autumn colour photographs best: soft light, deep occlusion, saturated wet leaves.

**Suggestion:**
- Wetness should multiply albedo by about 0.5 on porous surfaces and lower roughness only as a thin film.
- Occlude specular and ambient reflection by canopy sky-visibility and by bark occlusion, so only crests glint.
- Check that fog in-scatter is not added to nearby surfaces, and that exposure under overcast is not lifting mid-greys to near white.
- For foliage, smooth the card normals, keep roughness at 0.5 or more, and derive roughness from normal variance to stop sky mirroring.
- Add ripple rings on the water in rain. Rain streaks should be denser and shorter.

### 5. Distant forest is a scale texture on smooth hills, with a hard seam

**Where:** `vista` (0–1600, 150–400; seam at y ≈ 330–400; gap patch 880–1150, 540–650), `canopy` (top 200 px, where the pattern swirls and smears), `golden_vista`, the background hills in every `habit_*` portrait, `spot_2` (930–1010, 230–270).

**What is wrong:**
- The far hills carry a tiny-blob fish-scale pattern with no crown relief or shading, stretched on slopes, over visibly faceted silhouettes. It reads as a knitted blanket.
- The join to real trees is a hard line with a jump in texture, colour and brightness.
- The near canopy from above is fuzzy olive noise: crowns are not separable, have no sunlit and shaded sides and no dark crevices between them. Its colour does not match the saturated interior.
- The gap in `vista` shows a flat foggy patch with stick trunks.

**Reference:** an autumn canopy from above is a cauliflower of distinct domed crowns 10–25 m across, each with a lit and a shaded side and deep shadow between, colour varying tree by tree.

**Suggestion:**
- Drive the far shell from the same tree placement as the real forest. Build a crown-bump height field (inverted Worley with jittered radii), take normals and valley occlusion from it, light it with the sun, and colour each cell from the species map.
- Use slope-compensated or triplanar mapping to stop the stretching.
- Add impostor crowns out to about 1.5 km, with a dithered cross-fade band 80–150 m wide.
- Smooth the far-terrain normals.

### 6. Hemlocks and evergreen shrubs are black, broad-leaved blobs

**Where:** `trunk` (150–700, 120–520), `habit_hemlock`, `october` (700–1050, 0–450), `cascade` (0–330, 0–480), `context_hemlock`; rhododendron, laurel and doghobble in `stream` (880–1200, 400–900), `spot_1` (120–560, 190–520), `habit_rhododendron`.

**What is wrong:** the needle-spray atlas is correct, but on screen each spray is so large and so dark that it reads as one big lobed leaf. Hemlock crowns are near-black slabs with no visible limbs, no lacy texture and no transmitted light. Evergreen shrubs merge into black masses dotted with white single-pixel sparkles (`spot_1` around 565, 228 and 690, 437).

**Reference:** `eastern-hemlock.jpg` shows radiating limbs, fine feathery sprays, bright yellow-green where backlit and mid-green in shade, never black. Rhododendron leaves are leathery, whorled at branch tips, each with a broad soft sheen.

**Suggestion:**
- Hemlock: spray cards no larger than about 40 cm, three to four times as many, hung on drooping branchlets in flat tiers along visible limbs.
- Raise albedo to a real dark green, add strong transmission and a top-lit, dark-underside gradient per tier.
- Preserve alpha coverage across mips so cards do not go solid with distance.
- Rhododendron and laurel: individual leaves 10–20 cm with a midrib normal, roughness about 0.35, sky reflection occluded under canopy, and roughness derived from normal variance to remove the sparkles.

### 7. Water: rainbow-blotched falls and motionless mirror pools

**Where:** `cascade` (540–860, 380–600: pink, cyan and yellow patches inside a white smear), `habit_hornbeam` (yellow blotches in the falls), `october` and `noon_october` (0–1600, 600–900), `stream`, `golden_grove` (flat white patch), `rain_october` (no ripple rings).

**What is wrong:** the falls are a blurred veil with pastel colour patches, which looks like refraction sampling foliage at large offsets. Pools are perfectly still, so the stream reads as a puddle or wet tarmac: no ripples, flow lines, glints, foam, or visible bed beyond the edge.

**Reference:** a mountain brook has clear tea-coloured water over visible cobbles and leaf packs, sparkle on riffles, standing waves around stones, foam lines below drops, and white aerated strands over dark wet rock in the falls.

**Suggestion:**
- Clamp the refraction offset by depth difference, and reject samples in front of the surface.
- Build falls from stretched, scrolling alpha strands with foam and a few mist sprites at the base.
- Add flow-mapped normals whose speed follows slope, sun glints at roughness 0.05–0.1, depth absorption so the bed shows in the shallows, and foam where depth is small.
- Stop reflected sky clipping to flat white.

### 8. Moss, rock, deadwood and roots are smooth primitives

**Where:**
- Boulders: `cascade` (330–850, 380–640), `october` (530–780, 500–640), `ground_mayapple`, `context_witchhazel` (680–1280, 560–720).
- Stream bank: `october` (dark featureless wedge, 1100–1600, 620–720).
- Logs: `spot_1`, `spot_3`, `spot_4` (straight dark bars); `gap` (170–960, 390–520, root plate of flat shards).
- Snags: every `habit_*` portrait (straight poles with flat-cut tops and peg branches).
- Roots: `bark` (880–1060, 560–830) and `spot_1` (zero-thickness black fins).
- Moss: a green tint with a soft level edge on trunk bases (`habit_hemlock`, `ravine`) and an airbrushed cap on rocks.

**Reference:** in `chestnut-pic.png` moss sits in textured patches on rounded root buttresses that merge gradually into the ground. Appalachian boulders have fracture planes, bedding, pale lichen crusts, thick moss on tops and damp sides, litter caught in hollows and a dark damp base. Logs are tapered and broken, with bark sloughing off, sunk into the litter. Snags have jagged tops.

**Suggestion:**
- Rocks: more geometry, displaced by ridged noise with a few planar cuts; triplanar detail at two scales; lichen splats; litter blended up the base; an occlusion decal on the ground.
- Moss: a layer with thickness (shells or short fins) and a ragged edge, placed by up-facing normal, moisture and crevice depth, with colour varying yellow-green to dark green.
- Logs: tapered, curved, with displaced bark, noise-cut broken ends, and partly buried.
- Snags: displaced jagged tops, with patches of missing bark.
- Roots: lobes with a round cross-section of at least 8–15 cm that taper and dive below ground. Blend the lowest 10–25 cm of trunk into the litter and pile leaves in the crotches.

### 9. Forest floor up close: good texture, no depth; ground plants are flat cut-outs

**Where:** all `ground_*` portraits (litter draped over smooth pillow mounds), `floor` (500–1100, 550–900), `ravine` and `overcast_ravine` (900–1600, 480–900: leaf cards like confetti on black), `cascade`, `ground_wildginger` and `ground_trillium` (flat lime and yellow discs), `gap` (pale feather-like fronds scattered everywhere), `grove` and `spot_3` (near-identical fern rosettes at even spacing).

**What is wrong:** within 3 m the litter is a flat picture, coplanar and without shadow between layers. Near leaves in `floor` are cream paper with a plaid hatch instead of veins. The terrain under it is inflated 3–5 m swells with no small-scale relief. Ground plants have no sheen, no shading gradient and no dark base.

**Reference:** a real litter layer has depth: cupped and curled leaves, dark gaps, sticks, bark slabs and nuts, over ground broken by roots, stones and hollows. Galax and wintergreen are glossy.

**Suggestion:**
- Parallax or displacement from the litter height map within about 6 m.
- Scatter curled leaf meshes with contact shadows near the camera.
- Give loose leaf cards the same litter base beneath them instead of black.
- Add terrain relief at 0.3–1.5 m wavelength, driven by root and rock positions.
- Give ground-plant leaves normal maps and gloss.
- Vary fern rosettes in frond count, size, lean and browning, and group them in colonies.

### 10. Construction faults visible in the curated views

- `october`, `noon_october`, `overcast_october`, `rain_october` (1190–1470, 240–360): an understory crown is wrapped round the giant chestnut like a wreath. Reject understory stems within trunk radius plus about 2 m, or clip sprays that fall inside another trunk. This is in the hero frame.
- `gap` (170–960, 390–520): fern fronds draw on top of the fallen log.
- `spot_1` (840–1160, 0–600): a sapling with dead-straight limbs at right angles reads as scaffolding. `spot_2` (1150–1200, 0–800): a twisted striped pole.
- `vista` (880–1150, 540–650): the flat fog patch in the canopy gap.

**Done when:** at least nine of the twelve `set7` views pass as a photograph at first glance; no view shows a rendering fault; `bark.png` holds up beside `chestnut-pic.png` for relief and root form; and the overcast and rain variants look like the same forest photographed in wet weather.

## Polish

1. The sky is an empty gradient. Add a lit cloud layer and horizon glow; overcast needs cloud structure, not flat white.
2. Light shafts appear as one fan from a point (`habit_ash`, `habit_cucumbertree`). March the shadow map so beams form wherever the canopy opens.
3. Minor tree species are a pole with a small tuft (`habit_ash`, `habit_basswood`, `habit_cucumbertree`, `habit_tulip_giant`). Add branch orders and wider crowns.
4. Christmas fern pinnae are sharp triangles (`leaves_ferns.png`). They should be eared, glossy and arching.
5. Pebbles at the stream edge are flat pale ovals (`october` 0–300, 760–860). Use small instanced stones.
6. Litter in `gap` and `ravine` is strongly red. The brief asks for a largely golden-brown floor.
7. Mist is too thin to layer the trunks (`mist_grove`). Valley mist should hide trunks beyond 40–60 m.
8. Chestnut burs are evenly spaced dark dots at mid-distance (`ground_buropen`). Cluster them under chestnut crowns.
9. Night should keep only the faintest colour, with visible moonlit patches.
10. Leaf-litter cards far up slopes still stretch into streaks at grazing angles (`ground_partridgeberry`, top third).

## Round-1 follow-up

Blockers:

1. Distant forest as a cell texture on low-poly hills: **partly.** Blue ridge layers added and the slabs no longer show through the forest; the hills are still scale-textured with a hard seam (issue 5).
2. Water does not read as water: **partly.** Pool reflections are coherent and the oil-slick is gone from pools; falls are still a pastel-blotched smear and nothing moves (issue 7).
3. Floating open trunk skirts, no root flare: **mostly fixed.** Trunks are grounded with a flare; the flare is a smooth cone with zero-thickness fins and no litter blend (issues 2 and 8).
4. Painted braid bark, identical on every species: **partly.** Per-species tiles exist and the braid is gone; bark still reads as a print on a smooth cone (issue 2).
5. Woven dither in shadow: **fixed.** Only fine grain remains.
6. Flat lighting, no sun/shade structure, contact shadows or bounce: **partly.** Sun patches and trunk shadows in `grove`, `bark`, `october`, `spot_4`; none in `ridge`, `gap`, `spot_3`; occlusion and bounce still weak (issue 3).

Majors and minor:

7. Flat, opaque, oversize leaf cards: **partly.** Twig sprays, correct silhouettes and saner sizes; still flat, single-hue, rimmed and without transmission (issue 1).
8. Frosted, broad-leaved hemlocks: **partly.** Needle atlas made and the frost is gone in clear weather; still black blobs, and the frost returns in overcast, mist and rain (issues 4 and 6).
9. Low-poly or pillow rocks with airbrushed moss: **partly.** Facets gone; now smooth blobs with the same airbrushed moss (issue 8).
10. Floor as a flat carpet of coplanar cards: **partly.** Much better baked litter; still flat and draped up close, and confetti on black in `ravine` (issue 9).
11. Pole trunks and thin crowns: **partly.** Forks and scaffold limbs on chestnuts; giants are still limbless cones and minor species are pole-and-tuft.
12. Sky and aerial perspective: **partly.** Ridge layers and shafts added; the sky is still empty.
13. Plastic ground plants: **partly.** Three fern species are good; galax and wild ginger are flat discs, and rosettes repeat.
14. Colour and tone mapping: **not fixed.** It has swung from flat mid-grey to over-saturated with crushed blacks; shrub reds are still pink or magenta.
15. General image quality: **mostly fixed.** Sharp and stable; what remains is dark alpha rims, the far seam and specular sparkles.
