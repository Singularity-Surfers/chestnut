#!/bin/sh
# usage: tools/review-set.sh <N> — everything the critics look at: shots/set<N>, shots/portraits<N>... (see reviews/)
# views -> shots/set$1, variants -> shots/var$1, portraits -> shots/portraits$2, source art -> shots/sheets$3
set=${1:-7}; por=${2:-3}; sh=${3:-2}
B=http://127.0.0.1:8377
run() { navier-job -- webgpu-browser run -- node tools/shots.mjs "$@" 2>&1 | grep -v "404\|GPU\|woody\|canopy share\|info\|warning"; }
sh tools/views.sh shots/set$set
run --out shots/var$set --size 1600x900 \
  "dawn_grove=view=grove&hour=7.2" "noon_october=view=october&hour=12.6" "golden_grove=view=grove&hour=17.3" "dusk_october=view=october&hour=18.2" \
  "night_grove=view=grove&hour=19.5" "overcast_october=view=october&weather=overcast" "mist_grove=view=grove&weather=mist&hour=8.2" \
  "rain_october=view=october&weather=rain" "afterrain_stream=view=stream&weather=after" "breezy_ridge=view=ridge&weather=breezy" \
  "overcast_ravine=view=ravine&weather=overcast" "golden_vista=view=vista&hour=17.6" \
  "spot_1=cam=-20,-999,30,1.0,0&hour=14" "spot_2=cam=40,-999,-40,2.5,0&hour=11" "spot_3=cam=-60,-999,-20,0.3,0.05&hour=15.5" "spot_4=cam=80,-999,60,4,0&hour=13"
sh tools/portraits.sh shots/portraits$por
L="$B/tools/debug-leaves.html"; A="$B/tools/debug-atlas.html"; K="$B/tools/debug-bark.html"
run --out shots/sheets$sh --size 1800x1000 --base $L "leaves_canopy_a=only=chestnut,redoak,scarletoak,chestnutoak,whiteoak,redmaple,sugarmaple,tulip,ybirch" \
  "leaves_canopy_b=only=bbirch,beech,hickory,basswood,buckeye,blackgum,magnolia,frasermagnolia,ash,hemlock" \
  "leaves_understory=only=dogwood,stripedmaple,sourwood,hornbeam,serviceberry,witchhazel,spicebush,viburnum,creeper" \
  "leaves_shrubs=only=blueberry,rhododendron,laurel,doghobble,hobblebush" \
  "leaves_herbs=only=galax,wintergreen,partridgeberry,stripedwintergreen,rattlesnake,wildginger,aster,foamflower,trillium,mayapple,cucumberroot" \
  "leaves_ferns=only=christmasfern,woodfern,ladyfern,hayfern,bracken,nyfern"
run --out shots/sheets$sh --size 1800x1000 --base $A "twigs_canopy_a=only=chestnut,redoak,chestnutoak,whiteoak,redmaple,sugarmaple" "twigs_canopy_b=only=tulip,hemlock,ybirch,beech,hickory,basswood" \
  "twigs_understory=only=dogwood,stripedmaple,sourwood,hornbeam,serviceberry,frasermagnolia" "twigs_shrubs=only=witchhazel,spicebush,viburnum,blueberry,rhododendron,laurel,doghobble,hobblebush"
run --out shots/sheets$sh --size 1800x1000 --base $K "bark_a=only=chestnut,redoak,chestnutoak,whiteoak,redmaple,sugarmaple" "bark_b=only=tulip,hemlock,ybirch,bbirch,beech,hickory" \
  "bark_c=only=basswood,buckeye,blackgum,ash,dogwood,stripedmaple,sourwood,hornbeam"
echo REVIEW-SET-DONE
