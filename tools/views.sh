#!/bin/sh
# usage: tools/views.sh <outdir> [extra query]  — renders every curated viewpoint
out=${1:-shots/set}; extra=${2:-}
mkdir -p "$out"
navier-job -- webgpu-browser run -- node tools/shots.mjs --out "$out" --size 1600x900 \
  october="view=october$extra" grove="view=grove$extra" trunk="view=trunk$extra" bark="view=bark$extra" floor="view=floor$extra" \
  cascade="view=cascade$extra" ridge="view=ridge$extra" gap="view=gap$extra" ravine="view=ravine$extra" canopy="view=canopy$extra" \
  vista="view=vista$extra" stream="view=stream$extra" 2>&1 | grep -v "404\|GPU\|woody\|canopy share\|info\|warning"
python3 -I - "$out" <<'PY'
import sys,glob,os
from PIL import Image
d=sys.argv[1]
names=['october','grove','trunk','bark','floor','cascade','ridge','gap','ravine','canopy','vista','stream']
ims=[(n,Image.open(f'{d}/{n}.png').convert('RGB')) for n in names if os.path.exists(f'{d}/{n}.png')]
cols=3; w,h=640,360
sh=Image.new('RGB',(cols*w,((len(ims)+cols-1)//cols)*h))
for i,(n,im) in enumerate(ims): sh.paste(im.resize((w,h),Image.LANCZOS),((i%cols)*w,(i//cols)*h))
sh.save(f'{d}/sheet.jpg',quality=88)
PY
