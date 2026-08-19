import fs from 'node:fs'
import { optimizePacking } from '../src/packing-fast.js'
const project=JSON.parse(fs.readFileSync('/mnt/data/container-fit-project_2026-08-19_13-11-00.json','utf8'))
for(const c of project.cargo){
  if(['machine','tank-open','pallet-crate'].includes(c.id)){c.canBeStacked=false;c.canSupportCargo=true;c.stackable=true;c.maxStackLayers=Math.max(2,c.maxStackLayers||2);c.sameCargoStackOnly=false}
  if(['box-a','box-b'].includes(c.id)){c.canBeStacked=true;c.canSupportCargo=false;c.stackable=false;c.maxStackLayers=Math.max(2,c.maxStackLayers||2);c.sameCargoStackOnly=false}
}
project.settings={...project.settings,useDeckBoards:true,deckBridgeGap:100,deckThickness:0,innerItemGap:0}
const t=performance.now(),result=optimizePacking(project.cargo,project.containers,project.settings),elapsed=performance.now()-t
const nested=result.nestedAssignments.reduce((s,a)=>s+a.placements.length,0),deck=result.containers.reduce((s,c)=>s+c.placements.filter(p=>p.onDeck).length,0),types=result.containers.map(c=>c.spec.shortName)
if(result.unpacked.length||types.length!==1||types[0]!=='40STD'||nested<30||deck<10||elapsed>2000){
  console.error({types,nested,deck,unpacked:result.unpacked.length,elapsed})
  process.exit(1)
}
console.log('Nested/deck regression OK:',types.join(' + '),'nested',nested,'deck',deck,'elapsed',elapsed.toFixed(1),'ms')
