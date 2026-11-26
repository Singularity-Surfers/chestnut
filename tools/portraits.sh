#!/bin/sh
# usage: tools/portraits.sh <outdir> — labelled review shots: each woody species alone (whole habit) and in context,
# each herb-layer plant alone on the litter.
out=${1:-shots/portraits}
mkdir -p "$out"
W="chestnut redoak chestnutoak whiteoak scarletoak redmaple sugarmaple tulip hemlock ybirch bbirch beech hickory basswood buckeye blackgum cucumbertree ash dogwood stripedmaple sourwood hornbeam serviceberry frasermagnolia witchhazel spicebush viburnum blueberry rhododendron laurel doghobble hobblebush"
Gf="christmasfern woodfern ladyfern hayfern nyfern bracken pasedge appsedge plantainsedge panicgrass hairgrass bottlebrush galax wintergreen partridgeberry stripedwintergreen rattlesnake wildginger aster foamflower trillium mayapple cucumberroot creeperground seedling:chestnut buropen"
args=""
for s in $W; do args="$args habit_$s=sp=$s&spsolo=1"; done
args="$args habit_chestnut_giant=sp=chestnut&cls=giant&spsolo=1 habit_chestnut_veteran=sp=chestnut&cls=veteran&spsolo=1 habit_chestnut_sapling=sp=chestnut&cls=sap&spsolo=1 habit_tulip_giant=sp=tulip&cls=giant&spsolo=1"
for s in chestnut redoak tulip hemlock beech ybirch dogwood sourwood witchhazel rhododendron laurel blueberry; do args="$args context_$s=sp=$s"; done
for s in $Gf; do n=$(echo $s | tr ':' '_'); args="$args ground_$n=gf=$s&solo=$s"; done
navier-job -- webgpu-browser run -- node tools/shots.mjs --out "$out" --size 1280x720 $args 2>&1 | grep -v "404\|GPU\|woody\|canopy share\|info\|warning"
