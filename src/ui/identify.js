// Field-guide readout: what is the viewer looking at?
import { SPECIES } from '../flora/species.js';

const GROUND_NAMES = {
  christmasfern: ['Christmas fern', 'Polystichum acrostichoides'], woodfern: ['Evergreen wood fern', 'Dryopteris intermedia'],
  ladyfern: ['Southern lady fern', 'Athyrium asplenioides'], hayfern: ['Hay-scented fern', 'Dennstaedtia punctilobula'],
  nyfern: ['New York fern', 'Amauropelta noveboracensis'], bracken: ['Bracken fern', 'Pteridium aquilinum'],
  pasedge: ['Pennsylvania sedge', 'Carex pensylvanica'], appsedge: ['Appalachian woodland sedge', 'Carex austrolucorum'],
  plantainsedge: ['Plantain-leaved sedge', 'Carex plantaginea'], panicgrass: ["Bosc's panic grass", 'Dichanthelium boscii'],
  hairgrass: ['Wavy hair-grass', 'Deschampsia flexuosa'], hairgrassheads: ['Wavy hair-grass', 'Deschampsia flexuosa'], bottlebrush: ['Bottlebrush grass', 'Elymus hystrix'],
  galax: ['Galax', 'Galax urceolata'], wintergreen: ['Wintergreen', 'Gaultheria procumbens'], partridgeberry: ['Partridgeberry', 'Mitchella repens'],
  stripedwintergreen: ['Striped wintergreen', 'Chimaphila maculata'], rattlesnake: ['Rattlesnake plantain', 'Goodyera pubescens'],
  wildginger: ['Wild ginger', 'Asarum canadense'], aster: ['White wood aster', 'Eurybia divaricata'], foamflower: ['Foamflower', 'Tiarella cordifolia'],
  trillium: ['Trillium (senescent)', 'Trillium sp.'], mayapple: ['Mayapple (senescent)', 'Podophyllum peltatum'],
  cucumberroot: ['Indian cucumber-root', 'Medeola virginiana'], creeperground: ['Virginia creeper', 'Parthenocissus quinquefolia'],
  bur: ['Chestnut bur', 'Castanea dentata'], buropen: ['Chestnut bur with nuts', 'Castanea dentata'],
};

export function identify(camera, terrain, eco, gf) {
  const o = camera.position;
  const d = camera.getWorldDirection(new (o.constructor)());
  // 1. woody plants: closest approach of the view ray to a stem or crown
  let best = null, bs = 1e9;
  const near = [];
  eco.big.near(o.x + d.x * 14, o.z + d.z * 14, 34, near);
  eco.small.near(o.x + d.x * 8, o.z + d.z * 8, 14, near);
  for (const e of near) {
    const t = e[3];
    if (!t) continue;
    const vx = t.x - o.x, vz = t.z - o.z;
    const along = vx * d.x + vz * d.z;
    if (along < 0.5 || along > 45) continue;
    const yAt = o.y + d.y * (along / Math.max(0.2, Math.hypot(d.x, d.z)));
    if (yAt < t.y - 0.5 || yAt > t.y + t.h + 1) continue;
    const lat = Math.abs(vx * d.z - vz * d.x) / Math.max(0.2, Math.hypot(d.x, d.z));
    // trunk hit for tall trees, crown hit for shrubs and when looking up
    const trunk = yAt < t.y + t.h * 0.45;
    const rad = trunk && t.h > 6 ? Math.max(0.25, t.dbh * 0.8) : Math.max(0.4, t.crownR * 0.55);
    if (lat > rad) continue;
    const score = along + lat * 3;
    if (score < bs) { bs = score; best = t; }
  }
  // 2. ground: where does the view ray meet the forest floor?
  let hit = null;
  if (d.y < -0.08) {
    let s = 0.3;
    for (let i = 0; i < 60; i++) {
      const x = o.x + d.x * s, y = o.y + d.y * s, z = o.z + d.z * s;
      if (y < terrain.heightAt(x, z) + 0.12) { hit = [x, z, s]; break; }
      s += 0.12 + s * 0.04;
    }
  }
  if (hit && (!best || hit[2] < bs - 0.5) && hit[2] < 14) {
    const CELL = 8;
    const ci = Math.floor(hit[0] / CELL), cj = Math.floor(hit[1] / CELL);
    let gb = null, gd = 0.5;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const c = gf.cells.get((ci + i) * 4096 + (cj + j));
      if (!c) continue;
      for (const t of gf.types) {
        const nm = GROUND_NAMES[t.id] || (t.id.startsWith('seedling:') ? 'seedling' : null);
        if (!nm) continue;
        const l = c.lists[t.index];
        if (!l) continue;
        for (let k = 0; k < l.length; k += 8) {
          const dd = Math.hypot(l[k] - hit[0], l[k + 2] - hit[1]);
          if (dd < gd) { gd = dd; gb = t.id; }
        }
      }
    }
    if (gb) {
      if (gb.startsWith('seedling:')) { const sp = SPECIES[gb.slice(9)]; return { name: sp.name + ' seedling', sci: sp.sci }; }
      return { name: GROUND_NAMES[gb][0], sci: GROUND_NAMES[gb][1] };
    }
  }
  if (!best) return null;
  const sp = SPECIES[best.sp];
  const ft = Math.round(best.h * 3.28 / 5) * 5;
  const note = best.layer === 'canopy' ? (best.cls === 'sap' ? 'sapling' : `${ft} ft tall, ${(best.dbh * 3.28).toFixed(1)} ft through`) : `${ft < 10 ? Math.round(best.h * 3.28) : ft} ft`;
  return { name: sp.name, sci: sp.sci, note };
}
