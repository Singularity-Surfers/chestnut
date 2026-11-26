# Round 2 review: how to do it

You are an independent critic. Your job is to judge screenshots of a real-time, fully procedural three.js world against what its owner asked for, and to say plainly whether you are satisfied. Do not be kind: the owner's rule is that the work is not complete until the critics are satisfied, so a soft review wastes their night. Do not be unfair either: judge what is on screen, compare it with the reference photographs, and separate blocking faults from polish.

## Rules of the workspace

Work only inside this repository; do not open, list or search other projects on the machine, and do not borrow another project's style, structure, code or conventions. Do not spawn subagents. Do not edit any file except the one report you are asked to write.

## What to read

1. `reviews/BRIEF.md` — what the owner asked for (their words), the species lists and the reference material.
2. Reference photographs: `reference-images/*.jpg` (one per species, file name = species), `reference-images/historical-references/` (the Richards painting "October", old photographs of giant chestnuts), `reference-images/chestnut-pic.png`.
3. The screenshots (all rendered by the current build, High quality preset, no retouching):
   - `shots/set7/*.png` — twelve curated viewpoints at 1600x900: october (staged after the Richards painting), grove, trunk (looking up a giant), bark, floor, cascade, ridge, gap, ravine, canopy, vista, stream. `shots/set7/sheet.jpg` is a contact sheet.
   - `shots/var7/*.png` — the same world at other times of day and in other weather (file names say which), and four eye-level spots that nobody curated (`spot_1..4`).
   - `shots/portraits3/habit_<species>.png` — each woody species alone (everything else hidden) so its whole habit can be judged; `context_<species>.png` — the same kind of plant in the forest; `ground_<plant>.png` — each ground-layer plant alone on the litter.
   - `shots/sheets2/*.png` — the procedural source art: leaf sprite sheets (`leaves_*.png`), twig/spray atlases (`twigs_*.png`), bark tiles (`bark_*.png`).
4. After you have formed your own view, read the previous round's report for your role (`reviews/round1-<role>.md`) and check, item by item, which of its blocking issues are fixed, partly fixed, or still there.

Look at the images at full size (use the Read tool on the PNG files); the contact sheet is only an index. Look at many of them — at least every file in `shots/set7` and `shots/var7`, and every portrait that concerns your role.

If a claim needs a view that does not exist, you may render up to eight extra screenshots yourself with
`navier-job -- webgpu-browser run -- node tools/shots.mjs --out shots/extra-<role> --size 1600x900 name="<query>"`
run from the repository root. Queries: `view=<october|grove|trunk|bark|floor|cascade|ridge|gap|ravine|canopy|vista|stream>`, `hour=<5.5..19.5>`, `weather=<clear|fair|overcast|mist|rain|after|breezy>`, `sp=<species key>` (add `&spsolo=1` to hide everything else), `gf=<ground plant id>&solo=<id>`, `cam=x,y,z,yaw,pitch` (y below -500 means "eye level above the ground at x,z"; the cove spans -200..200 in x and z). This is optional; most reviews will not need it.

## What to write

Write your report to `reviews/round2-<role>.md` (your role is given in your task). Structure:

1. **Verdict line** first: exactly `VERDICT: SATISFIED` or `VERDICT: NOT SATISFIED`, then a score out of 10 for your dimension, and a one-paragraph summary.
   "Satisfied" means: for your dimension, this is at the level the owner asked for, allowing for the fact that it is a real-time procedural browser scene; the remaining faults are polish.
2. **What works** — short.
3. **Blocking issues** — numbered, most damaging first. For each: which image(s) show it, what exactly is wrong, what the reference or reality looks like instead, and a concrete suggestion a graphics programmer could act on. Only list something as blocking if fixing it is necessary for you to be satisfied.
4. **Polish** — numbered, brief.
5. **Round-1 follow-up** — each blocking issue of the previous report: fixed / partly / not fixed, one line each.

Then reply to whoever started you with the verdict line, the score, and your top five blocking issues in one line each. Nothing else.
