VERDICT: NOT SATISFIED

Score: 6.5 / 10 (round 1: 5)

This build is a large step up. Every woody species now has a recognisable leaf, a believable habit and a sensible site, the three communities (streamside, cove slope, dry ridge) can be told apart by their plants, the season is staggered by species, and snags, logs, gaps and root plates exist. A botanist would now name most trees and shrubs from the portraits. I am still not satisfied, for five reasons. The canopy is 55% chestnut instead of the 35% the owner asked for, with hemlock, tulip poplar, the maples, birches and hickories all short, so from above the forest is one mustard-gold carpet. The bark of the hero tree is still a painted pattern rather than chestnut bark, and yellow birch reads as a white-barked birch. Hemlock foliage reads three to four times too coarse and is charcoal, not green. Grasses, sedges, moss and low evergreens cover a fraction of their target and stand as single sprigs, not colonies. And a handful of listed species (bottlebrush grass, Bosc's panic grass, Indian cucumber-root, climbing Virginia creeper, witch hazel in flower) still cannot be identified, or found, in any image.

Material examined: every file in `shots/set7` and `shots/var7`, all 74 portraits in `shots/portraits3` and all 13 sheets in `shots/sheets2` at full size; all 38 species reference photos (on reduced contact sheets), the Richards painting and four historical chestnut photographs. I rendered eight extra views into `shots/extra-botany/` (`top`, `crown_zoom`, `hemlock_zoom`, `chestnut_sap_zoom`, `galax_zoom`, `rattlesnake_zoom`, `aster_zoom`, `wintergreen_zoom`). The canopy shares quoted below are the build's own `[info] canopy share` console line (crown area, saplings excluded), printed during those renders. Colour values quoted "in the image" are medians I sampled from the PNGs.

Not checkable: three leaf sheets are screenshots of a scrolling page and are cut off at the bottom, so the hemlock, bracken, New York fern and Indian cucumber-root leaf rows are missing and the ash row is half visible (`leaves_canopy_b.png`, `leaves_ferns.png`, `leaves_herbs.png`). Buckeye, black gum, ash, cucumber magnolia, black birch and scarlet oak have no twig card on the sheets.

## 2. What works

- **Leaf sheets.** The 45 leaf sets I could see in full (of 50) are correct in outline, margin and venation. White oak, basswood, tulip poplar, Fraser magnolia (eared base), mayapple and rattlesnake plantain were all redrawn correctly since round 1.
- **Chestnut foliage and litter.** `chestnut_sap_zoom.png` and `portraits3/habit_chestnut_sapling.png` show lance-shaped, coarsely toothed, alternate leaves about 15–20 cm long in gold, amber and brown. `set7/floor.png` is a litter a botanist can read species from, with burs.
- **Site sorting.** `set7/stream.png`, `cascade.png`, `ravine.png`: hemlock, rhododendron thicket, doghobble on the bank, hornbeam, spicebush with red fruit, ferns. `set7/ridge.png`, `var7/spot_2.png`, `portraits3/habit_chestnutoak.png`: chestnut oak with dark deep-furrowed bark, mountain laurel, blueberry, bracken, hair-grass. This is right.
- **Habit.** Tulip poplar (tallest, clear straight bole), black gum (right-angle limbs), beech (wide layered crown, smooth bole), dogwood (leaning, tiered), sourwood (curved leaning trunk, drooping tips), hornbeam (multi-stem, low wide crown), Fraser magnolia (umbrella whorls), witch hazel (leaning vase), doghobble (arching) are all correct.
- **Season.** Buckeye and ash nearly bare, tulip poplar and basswood half bare, evergreens green, trillium and mayapple collapsed and yellow, bracken bronze, hay-scented fern gold.
- **Structure.** Giants, mature trees, poles, saplings and beech sprouts; a real gap with a root plate, log and chestnut regeneration (`set7/gap.png`); 105 snags and 555 logs in the log, visible in the solo portraits; lumpy pit-and-mound ground in the ground portraits.
- **Fruit.** Spicebush drupes read clearly in the world (`set7/stream.png`); wintergreen is now an upright sprig with red berries (`wintergreen_zoom.png`).

## 3. Blocking issues

### 1. Canopy composition misses the owner's shares: chestnut 55%, hemlock 2%

Images: `shots/extra-botany/top.png`, `set7/canopy.png`, `set7/vista.png`, `var7/golden_vista.png`.

| Group | Owner's target | This build | Difference |
|---|---|---|---|
| American chestnut | 35% | 54.8% | +19.8 |
| Oaks | 20% | 21.4% (red 7.4, chestnut oak 7.3, white 4.7, scarlet 2.0) | +1.4 |
| Tulip poplar | 10% | 6.3% | −3.7 |
| Red maple | 8% | 5.1% | −2.9 |
| Eastern hemlock | 8% | 2.3% | −5.7 |
| Birches | 5% | 2.0% (yellow 1.3, black 0.7) | −3.0 |
| Sugar maple | 4% | 2.1% | −1.9 |
| American beech | 4% | 3.3% | −0.7 |
| Hickories | 3% | 1.3% | −1.7 |
| Other trees | 3% | 1.4% | −1.6 |

What it looks like: in `top.png` (the whole cove from 380 m) the canopy is one mustard-gold surface, mean colour about `#705523`. Pixels with a green hue are 1.3% of the frame and lie in a single thread along the stream. The red crowns are single small poles, not "islands of scarlet and orange". `canopy.png` and `vista.png` show the same: no dark hemlock spires, no taller clear-yellow tulip poplars standing above the rest, no orange sugar maple groups.

What it should look like: "an immense golden canopy punctuated by islands of scarlet and orange" with "scattered evergreen hemlocks". About one crown in three is chestnut, one in five an oak, one in eight a maple, one in ten a tulip poplar, one in twelve a hemlock.

Suggestion:
- Plant to a quota. Fix each species' crown-area budget up front (share × total crown area), cap chestnut at 35–38%, and stop offering a species once its budget is spent. The present soft balancing cannot overcome seven hero giants, a giant class that favours chestnut, and niche weights near zero.
- Hemlock: let 60% of its crown area be mature and giant trees 28–40 m tall, so it reaches the canopy. Dense within 45 m of water and on north-facing lower slopes; singles scattered up to 150 m from the stream (raise the off-stream factor from 0.07 to about 0.3).
- Tulip poplar, sugar maple, basswood, buckeye: raise their weight on the cove flat and lower slopes until tulip poplar is 25–30% of crown area there.
- Red maple: plant groups of 3–6 mature trees with 10–14 m crowns, so the red reads as islands from above.
- Yellow birch: allow it on north-facing slopes away from the stream. Black birch and hickory: double.
- Print the share line in the HUD and fail the build if any group is more than 3 points off.

### 2. Bark in the world does not identify the trees, starting with the chestnut

Images: `set7/bark.png`, `set7/trunk.png`, `var7/spot_1.png`, `portraits3/context_rhododendron.png` (chestnut); `set7/october.png`, `set7/ravine.png`, `portraits3/context_ybirch.png`, `habit_ybirch.png` (yellow birch); `portraits3/habit_hickory.png` (hickory); `sheets2/bark_c.png` tile 6 (striped maple).

- **Chestnut.** In `bark.png` the trunk is a smooth grey-brown surface with soft black lens-shaped blotches 5–15 cm wide and 30–60 cm long, like scorch marks or tiger stripes. In `trunk.png` the same bark at 5 m is short black dashes on tan, a printed pattern. `reference-images/chestnut-pic.png` and `historical-references/chestnut-trunk-with-man.png` show the opposite proportions: pale flat-topped ridges 5–9 cm wide running unbroken for 0.8–2.5 m, separated by narrow dark furrows 1–3 cm wide and 2–4 cm deep that braid into a long diamond net and often spiral round the bole.
  - Make furrows narrow, crisp and continuous: no more than a quarter of the ridge width, crossing at 8–15°.
  - Give 1 tree in 3 a 5–10° spiral.
  - Ridge tops `#7d766c` to `#8f887c` with fine lengthwise cracks; furrow floor `#2a211b`.
  - Scale ridge count with girth: 60–90 ridges round a 2 m trunk.
  - Give real depth (parallax or displaced normals with occlusion), so the silhouette of the bole is rough.
- **Yellow birch.** Every in-world stem is a smooth pale pole: grey-tan `#94897b` to `#b89e7a` in `context_ybirch.png`, lavender-grey `#a5a3ae` in `october.png`. Against the dark hemlocks it reads as a white-barked birch, and paper birch does not grow in these coves. Nothing shows the curling bark that names the species. Use bronze-yellow `#a08850` to `#b89a58` with a silvery sheen, dark horizontal lenticels 1–3 cm long, and thin curls 1–5 cm peeling sideways that break the outline on stems 8–40 cm thick. Trunks over 50 cm become grey-brown plates.
- **Hickory.** The one close view (`habit_hickory.png`) is a wood-grain smear with black streaks. Pignut bark is a tight mesh of interlacing ridges, diamonds 2–3 cm wide and 8–15 cm long, grey `#7e7a74`.
- **Striped maple.** The tile is green with pale blotches and three hairline streaks. It needs white stripes 2–4 mm wide every 8–15 mm on green `#5a7040`.

### 3. Hemlock does not look like hemlock up close, and is nearly black

Images: `shots/extra-botany/hemlock_zoom.png`, `set7/ravine.png` (left foreground), `set7/trunk.png`, `set7/cascade.png`, `portraits3/habit_hemlock.png`, `var7/noon_october.png`.

What is wrong: the twig card on `sheets2/twigs_canopy_b.png` is fine-needled and a fair blue-green, but that is not what reaches the screen. In the world the needles fuse into solid lobes 3–5 cm long, so the foliage reads as fern fronds or arborvitae (`ravine.png`), and from below as dark lobed broadleaf clumps (`hemlock_zoom.png`, `trunk.png`). Mature crowns have a median colour of `#1b1e1b` to `#262b32` in the images: charcoal with almost no green, only the brightest tenth reaching `#314825`. The foreground sapling in `ravine.png` is greener (`#27321b` to `#42632d`) and nearer the mark. The tiers, the conical outline, the dead branch stubs and the cinnamon furrowed trunk are right; the texture and colour are not.

What it should be: the finest-textured tree in the forest. Needles 8–15 mm long and 1.5–2 mm wide, in two flat ranks on thread-thin twigs, so a 40 cm spray is a lacy comb of 15–25 twiglets with sky showing between the needles. Upper side deep green `#1f3d28` to `#2c4a2e`, this year's tips `#3f6b3c`, underside pale `#8fa58f` from two white bands, so the crown looks silvery from beneath. Branch tips and the leader droop.

Suggestion: keep the needle comb resolved in the world (a larger or sharper card with alpha that does not fill in at distance, twiglets no wider than 12–15 mm including needles, twice the twig count per spray); tint the back face pale; raise the shaded colour so the median sits near `#24452a` and never charcoal; nod the leader 20–40°; hang 1.5–2 cm tan cones at spray tips (they are mature in October).

### 4. Ground layer: grasses, sedges, moss and low evergreens are a fraction of target, and grow as single sprigs

Images: `set7/floor.png`, `set7/grove.png`, `set7/october.png`, `var7/spot_1.png`, `var7/spot_3.png`, `set7/ridge.png`, `portraits3/ground_pasedge.png`, `ground_appsedge.png`, `ground_galax.png`, `galax_zoom.png`, `ground_wildginger.png`, `set7/cascade.png`, `portraits3/habit_laurel.png`.

My estimate of floor cover across the eye-level views, against the owner's shares:

| Layer | Target | Seen |
|---|---|---|
| Leaf litter and burs | 55% | 75–80% |
| Ferns | 15% | 10–15% (good; colonies in `grove.png`, `spot_3.png`) |
| Mosses and low evergreens | 10% | 3–5% (moss only on boulders and as a band on tree bases) |
| Grasses and sedges | 8% | 1–2% (one patch in `ridge.png`, tufts in `gap.png`) |
| Other herbs | 7% | 3–4% |
| Rocks and fallen wood | 5% | 3–5% |

- **Sedges.** Pennsylvania sedge is three wiry dark tufts (`ground_pasedge.png`). The reference photo is a soft lawn. It needs leaves 1–3 mm wide and 15–30 cm long, arching, pale green with straw tips, in patches 3–10 m across at 60–90% cover, on drier slopes under oak and chestnut, in gaps and along the trail. Appalachian sedge has about 30 blades; the reference fountain has 150–300 hair-fine leaves 30–45 cm long.
- **Galax.** One clump of five matte discs. It needs colonies 1–4 m across of 50–300 overlapping leaves, glossy, on the laurel slopes.
- **Partridgeberry and wintergreen.** Correct plants, but a single trail and a single sprig. Make mats 0.5–2 m across with a few red berries.
- **Moss.** Add patches on soil banks, log tops and the north side of tree bases in the cove, to bring moss plus low evergreens to about 10%.
- **Wild ginger is lime green.** In `cascade.png`, `gap.png` and `habit_laurel.png` the heart-shaped leaves are flat, glossy and `#a1b441` to `#c2cb43`; they read as lily pads and are the brightest thing on the floor. Use matte `#4f7a35`, a third of leaves yellowing to `#b9b24a`, 8–12 cm across, in pairs on hairy 10–15 cm stalks, drooping.

The owner's notes call the grassier, more herbaceous floor "an important historical difference", so this is not polish.

### 5. Several listed species still cannot be identified, or found, in the world

The owner asked for "all the plant species described". For these the portrait fails to show the subject, some for the second round running.

- **Bottlebrush grass.** `ground_bottlebrush.png` shows a hobblebush (round 1 showed a spicebush). The straw feathers at lower right of `set7/gap.png` may be it; if so they are pinnate like dead fern fronds. It needs straw culms 70–120 cm tall, each with a spike 8–15 cm long of paired spikelets held at right angles with 2–4 cm bristles, in groups of 5–20 in gaps and along the trail.
- **Bosc's panic grass.** `ground_panicgrass.png` shows two lime ovals on a wire. It needs a 30–60 cm stem with 4–7 short broad blades (7–12 cm × 1.5–3 cm) clasping it, mid-green going tan, with a basal rosette.
- **Indian cucumber-root.** `ground_cucumberroot.png` shows a 40 cm thread with a 4 cm tuft. It needs a lower whorl of 5–9 leaves 6–12 cm long, an upper whorl of 3 leaves stained crimson at the base, and 2–4 purple-black 8 mm berries on red stalks.
- **Virginia creeper as a climbing vine.** Only the ground form is shown. I found no scarlet vine on any trunk in about 40 forest images. It should climb 8–20 m on about one large bole in six.
- **Witch hazel in flower.** The flower sprite is on the sheet, but in `habit_witchhazel.png` and every forest view the shrub is plain yellow. Flowers should read as a lemon haze along the twigs from 5–10 m (petals 15–20 mm), with about 40% of leaves already down.
- **Bracken.** `ground_bracken.png` frames a spicebush. Bracken does appear, bronze and broadly triangular, in `spot_2.png` and `habit_chestnutoak.png`, but the three-part blade cannot be confirmed.
- **Hickory.** `habit_hickory.png` has the camera pressed against a trunk; the compound leaf is confirmed only on the twig sheet.
- **Giants.** `habit_chestnut_giant.png` and `habit_tulip_giant.png` are the same frames as the ordinary portraits, so no 1.5–2.1 m giant is shown with scale.

Suggestion: fix the three graminoid and herb models as specified, then make the portrait camera choose a specimen with a clear line of sight (ray-test against other plants) and stand 1.2–2 m from herbs with a 25–35° field of view.

## 4. Polish

1. Burs render near black (`#100e07` to `#1c1809` in `set7/floor.png`; black dots in `ground_buropen.png`). Use straw to tan-brown `#b59a55` to `#8a6a3a`, 5–7 cm across.
2. A collar of amber foliage passes through the Richards chestnut's trunk at 3–4 m (`set7/october.png`, `var7/noon_october.png`, `context_dogwood.png`). Move the sapling or exclude foliage within 0.5 m of large boles.
3. Moss on tree bases is a uniform green sock, up to 2.5 m on the hemlock in `habit_hemlock.png`. Make it patchy, heaviest on root swells and the north side, none on ridge trees.
4. Chestnut crowns from above are olive-mustard (`#705523` mean). Lift lit crowns toward gold-amber `#c9a227` to `#b5791e`.
5. No green is left in any deciduous crown. A third of red, white and chestnut oak crowns and most scarlet oaks should still be dull green in mid-October; the leaf sheets already hold the green variants.
6. Mountain laurel also grows on the stream bank in the cove bottom (`habit_laurel.png`, `context_laurel.png`). Keep it to slopes and ridge; leave the bank to rhododendron.
7. Hobblebush stands at the foot of the hero chestnut (`set7/bark.png`). Keep it to the north-facing ravine. Its pink-and-lime is a little candy-like; pull saturation down 20%.
8. Evergreen wood fern pinnules are rows of beads (`ground_woodfern.png`). Cut each pinna into toothed pinnules.
9. Galax leaves are matte; add gloss and a slight cup.
10. Sourwood is dull maroon; the reference is scarlet-crimson. Its capsule sprays on the twig sheet are too white; use tan-grey.
11. Dogwood fruit and buds are on the sheet but not visible at 5–8 m in `habit_dogwood.png`.
12. Red maple litter in `set7/gap.png` is saturated crimson; fallen leaves dull to red-brown within days.
13. Fallen chestnut leaves seen from below are near white (`set7/floor.png` foreground); use pale tan `#c9b88a`.
14. Snags are straight poles with clean diagonal cut tops, and logs are uniform dark beams (`habit_blackgum.png`, `spot_4.png`). Splinter the tops, add bark sloughing, brackets and moss.
15. A sapling in `var7/spot_1.png` has dowel-straight pale branches at right angles.
16. Wet trunks turn chalk white in `var7/rain_october.png` and `afterrain_stream.png`. Wet bark darkens.
17. Distant hills in `set7/vista.png` are redder and more speckled than the near canopy.
18. Tulip poplar crowns are small tufts; old trees carry 3–5 massive sinuous limbs (see `reference-images/tulip-poplar.jpg`).
19. Beech trunks are warm tan in sun (`#97815c` in `october.png`, left); use blue-grey `#9a9c9a` with darker lichen patches.
20. White wood aster is a single stem with 1 cm flowers (`aster_zoom.png`). Grow groups of 10–50 stems with heads 2–2.5 cm, half gone to tan fluff.
21. Hair-grass has no spent flower stalks; add tan 40–60 cm panicles.
22. Blueberry and mapleleaf viburnum are dense balls. Open them to twiggy stems so leaf shape shows; blueberry in colonies 2–6 m across on the ridge.
23. Chestnut oak leaf: move the widest point to 55–60% of length.

## 5. Round-1 follow-up

1. Trunk bases and taper: partly fixed. Boles are columnar and fork at staggered heights; the base is still a smooth skirt with a hard edge, without separate root buttresses (`bark.png`).
2. Canopy crowns: fixed. Closed canopy from above, heavy ascending limbs.
3. Hemlock colour, habit, numbers: partly fixed. No longer blue, tiers are right; now too black, too coarse, and too few in the canopy (blocking 1 and 3).
4. Bark relief and scale: partly fixed. Colours and small-stem scale are right; chestnut still painted, yellow birch white (blocking 2).
5. Rhododendron placement and vein fix: fixed.
6. Dry-ridge community: mostly fixed. Laurel, blueberry, bracken, hair-grass, chestnut oak are present; no galax colonies, blueberry is isolated mounds.
7. Dead wood and micro-relief: fixed (105 snags, 555 logs, root plate, mounds); modelling is polish.
8. Gap: fixed.
9. Fern distance rendering and colonies: fixed.
10. Staggered season: mostly fixed. Leaf drop is staggered; no green left in oaks or beech.
11. Herb colour and posture: partly fixed. Wintergreen, partridgeberry, rattlesnake plantain and galax leaf are right; wild ginger is now lime; colonies and cover still missing.
12. White oak leaf: fixed.
13. Fraser magnolia leaf and habit: fixed.
14. Basswood and tulip poplar leaves: fixed.
15. Understory tree shapes: fixed.
16. Bracken: partly fixed. Bronze, horizontal, on the right site; portrait still fails, three-part blade unconfirmed.
17. Sedges and grasses rebuilt and tripled: not fixed. Plantain-leaved sedge and hair-grass are readable; the rest are sparse tufts at 1–2% cover; bottlebrush and panic grass not identifiable.
18. White wood aster visible: partly fixed. Correct zig-zag plant, single stems, tiny flowers.
19. Burs and litter depth: partly fixed. Burs are 3-D and plentiful under chestnuts; still near black.
20. Composition by site and small fixes: partly fixed. Site sorting and leaf fixes are done; overall shares are off (blocking 1); climbing creeper not visible; moss still a uniform band.

## 6. Per-species table

"Identifiable" means in the world, from portraits and views. "Sheet" means confirmed only on the source sheet.

### Canopy trees

| Species | Identifiable? | Correct? | What to change |
|---|---|---|---|
| American chestnut | Yes (sapling leaves, litter, burs, size) | Leaf, habit, colour yes; bark no; share no | Bark as in blocking 2. Share 55% → 35%. Burs tan, not black. Lit crowns to gold-amber. Frame one 1.5–2.1 m giant with scale |
| Northern red oak | Partly (russet crown; leaf on sheet) | Leaf and bark sheet yes | A third of crowns still dull green. Show the long pale "ski-track" ridges 2–4 cm wide on the in-world trunk |
| Chestnut oak | Yes (dark deep-furrowed trunk on ridge, `ridge.png`) | Yes | Leaf widest at 55–60% |
| White oak | Partly (portrait is a backlit silhouette) | Leaf and bark sheet yes | Re-shoot the portrait front-lit |
| Scarlet oak | Yes | Mostly | Mostly green with first scarlet in mid-October; brighter scarlet, less maroon |
| Red maple | Yes | Yes; share 5.1% vs 8% | Mature groups with 10–14 m crowns; opposite twigs |
| Sugar maple | Yes | Yes; share 2.1% vs 4% | More on the cove flat, in groups |
| Tulip poplar | Yes (habit; leaf in `spot_4.png`) | Yes; share 6.3% vs 10% | Fewer, heavier limbs in old crowns; distinct giant |
| Eastern hemlock | As a conifer yes; as hemlock partly | Tiers, trunk, site yes; foliage no; share 2.3% vs 8% | Blocking 3 and 1 |
| Yellow birch | No (reads as a white-barked birch) | Leaf yes; in-world bark no | Bronze-yellow curling bark; perch some on boulders and logs with stilt roots |
| Black birch | Partly | Yes | Old trunks in dark irregular plates |
| American beech | Yes | Yes | Trunk blue-grey, not cream; 30% of leaves still yellow-green |
| Pignut hickory | Sheet only | Leaf and bark sheet yes | Portrait blocked; in-world bark a smear |
| Basswood | Partly | Leaf yes | Often 2–3 trunks from one base |
| Yellow buckeye | Yes (nearly bare, orange remnants) | Yes | — |
| Black gum | Yes | Yes | — |
| Cucumber magnolia | Partly | Yes | — |
| White ash | Yes (purple-bronze, sparse) | Yes | — |

### Understory trees

| Species | Identifiable? | Correct? | What to change |
|---|---|---|---|
| Flowering dogwood | Yes | Yes | Red fruit clusters and grey buds visible at 5–8 m |
| Striped maple | Yes (goosefoot leaf, green stem) | Mostly | Real white stripes on the bark |
| Sourwood | Yes | Mostly | Scarlet-crimson, not maroon; tan capsule sprays |
| American hornbeam | Yes | Yes | — |
| Downy serviceberry | Yes | Yes | — |
| Fraser magnolia | Yes | Yes | Leaves 25–40 cm, so whorls are 60–80 cm across |

### Shrubs

| Species | Identifiable? | Correct? | What to change |
|---|---|---|---|
| American witch hazel | Habit yes; flowers not seen | Leaf, habit, site yes | Flowers legible from 5–10 m; 40% leaf drop |
| Spicebush | Yes, with red fruit | Yes | — |
| Mapleleaf viburnum | By colour; leaf shape not legible | Mostly | Open the dense ball: 2–5 stems, 6–12 leaf pairs each |
| Hillside blueberry | Yes | Mostly | Colonies 2–6 m across; twiggy green stems visible |
| Great rhododendron | Yes | Yes | — |
| Mountain laurel | Yes | Mostly | Remove from the stream bank |
| Mountain doghobble | Yes | Yes | — |
| Hobblebush | Yes | Mostly | North-facing ravine only; slightly less saturated |

### Ferns

| Species | Identifiable? | Correct? | What to change |
|---|---|---|---|
| Christmas fern | Yes | Yes | — |
| Evergreen wood fern | Partly | Outline yes | Toothed pinnules instead of beads |
| Southern lady fern | Yes | Yes (widest near the base, reddish stalk) | — |
| Hay-scented fern | Yes | Yes, in colonies | — |
| Bracken | Partly | Colour and site yes | Confirm the three-part blade; fix portrait |
| New York fern | Yes | Yes (tapers to both ends) | — |

### Grasses and sedges

| Species | Identifiable? | Correct? | What to change |
|---|---|---|---|
| Pennsylvania sedge | No | No | Lawns as in blocking 4 |
| Appalachian woodland sedge | Partly | Too sparse | 150–300 hair-fine leaves 30–45 cm long |
| Plantain-leaved sedge | Yes | Mostly | 8–12 leaves, 2–3 cm wide, puckered, wine-red at the base |
| Bottlebrush grass | No (portrait blocked) | Unknown | Blocking 5 |
| Bosc's panic grass | No | No | Blocking 5 |
| Wavy hair-grass | Yes | Mostly | Tan spent panicles |

### Other ground cover

| Species | Identifiable? | Correct? | What to change |
|---|---|---|---|
| Galax | Yes close up | Leaf yes; growth no | Glossy colonies |
| Wintergreen | Yes | Yes | Mats of 20–100 sprigs |
| Partridgeberry | Yes | Yes | Mats; red berries |
| Striped wintergreen | Yes, tiny | Yes | — |
| Rattlesnake plantain | Yes | Yes | — |
| Wild ginger | By shape | Colour no | Matte deep green, yellowing |
| White wood aster | Yes close up | Mostly | Colonies; larger heads |
| Foamflower | Partly | Yes | — |
| Trillium | Yes | Yes | — |
| Mayapple | Yes | Yes | — |
| Indian cucumber-root | No | Unknown | Blocking 5 |
| Virginia creeper | Ground form yes; climbing form not seen | Leaf yes | Scarlet vines on boles |
| Chestnut seedling and burs | Yes | Yes | Bur colour |
| Moss | On boulders and tree bases | Partly | Patchy, more of it |

### Present that should not be, or missing

- Present by appearance only: paper-white birch stems (yellow birch rendered white); lime "lily pads" (wild ginger).
- Appropriate additions beyond the brief: white, scarlet and chestnut oak, black birch, pignut hickory, cucumber magnolia.
- Missing or unconfirmed: climbing Virginia creeper, witch hazel flowers, sedge lawns, galax colonies, hemlock cones.
