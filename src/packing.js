const EPS=0.001
export const boxVolumeM3=(l,w,h)=>(l*w*h)/1_000_000_000

export function expandCargo(cargo){
  const out=[]
  cargo.forEach(item=>{for(let i=0;i<Math.max(0,Math.floor(item.quantity));i++) out.push({uid:`${item.id}-${i+1}`,cargoId:item.id,cargoName:item.name,length:item.length,width:item.width,height:item.height,weightKg:item.weightKg,rotation:item.rotation,stackable:item.stackable,canBeNested:item.canBeNested,color:item.color,innerSpace:item.innerSpace})})
  return out
}
function orientations(unit){
  const d=[unit.length,unit.width,unit.height]
  const raw=unit.rotation==='locked' ? [[d[0],d[1],d[2],'L×W×H']] : unit.rotation==='upright' ? [[d[0],d[1],d[2],'L×W×H'],[d[1],d[0],d[2],'W×L×H']] : [[d[0],d[1],d[2],'L×W×H'],[d[0],d[2],d[1],'L×H×W'],[d[1],d[0],d[2],'W×L×H'],[d[1],d[2],d[0],'W×H×L'],[d[2],d[0],d[1],'H×L×W'],[d[2],d[1],d[0],'H×W×L']]
  const seen=new Set(); return raw.filter(([l,w,h])=>{const k=`${l}|${w}|${h}`;if(seen.has(k))return false;seen.add(k);return true}).map(([length,width,height,label])=>({length,width,height,label}))
}
function intersects(a,x,y,z,l,w,h,gap){return !(x+l+gap<=a.x+EPS||a.x+a.length+gap<=x+EPS||y+w+gap<=a.y+EPS||a.y+a.width+gap<=y+EPS||z+h<=a.z+EPS||a.z+a.height<=z+EPS)}
function overlapArea(a,x,y,l,w){const ox=Math.max(0,Math.min(a.x+a.length,x+l)-Math.max(a.x,x));const oy=Math.max(0,Math.min(a.y+a.width,y+w)-Math.max(a.y,y));return ox*oy}
function supportRatioAt(placements,x,y,z,l,w){if(z<=EPS)return 1;let supported=0;placements.forEach(p=>{if(Math.abs(p.z+p.height-z)<=1)supported+=overlapArea(p,x,y,l,w)});return Math.min(1,supported/Math.max(1,l*w))}
function supportersStackable(placements,lookup,x,y,z,l,w){if(z<=EPS)return true;return placements.filter(p=>Math.abs(p.z+p.height-z)<=1&&overlapArea(p,x,y,l,w)>0).every(p=>lookup.get(p.uid)?.stackable!==false)}
function points(placements,dims,clearance,gap){const pts=[{x:clearance,y:clearance,z:0}];placements.forEach(p=>pts.push({x:p.x+p.length+gap,y:p.y,z:p.z},{x:p.x,y:p.y+p.width+gap,z:p.z},{x:p.x,y:p.y,z:p.z+p.height},{x:p.x+p.length+gap,y:p.y+p.width+gap,z:p.z},{x:p.x+p.length+gap,y:p.y,z:p.z+p.height},{x:p.x,y:p.y+p.width+gap,z:p.z+p.height}));const uniq=new Map();pts.forEach(p=>{if(p.x<dims.length-clearance+EPS&&p.y<dims.width-clearance+EPS&&p.z<dims.height-clearance+EPS)uniq.set(`${Math.round(p.x)}|${Math.round(p.y)}|${Math.round(p.z)}`,p)});return [...uniq.values()].sort((a,b)=>a.z-b.z||a.y-b.y||a.x-b.x)}
function placeUnits(units,dims,settings,nestedInsideUid){
  const placements=[],unpacked=[];let usedWeightKg=0;const lookup=new Map(units.map(u=>[u.uid,u]));
  const sorted=[...units].sort((a,b)=>(b.length*b.width*b.height)-(a.length*a.width*a.height)||b.weightKg-a.weightKg)
  for(const unit of sorted){
    if(usedWeightKg+unit.weightKg>dims.maxWeightKg+EPS){unpacked.push(unit);continue}
    let best=null
    for(const point of points(placements,dims,settings.wallClearance,settings.itemGap)) for(const o of orientations(unit)){
      const maxX=dims.length-settings.wallClearance,maxY=dims.width-settings.wallClearance,maxZ=dims.height-settings.wallClearance
      if(dims.doorWidth&&dims.doorHeight){
        const clearDoorW=Math.max(0,dims.doorWidth-settings.wallClearance*2), clearDoorH=Math.max(0,dims.doorHeight-settings.wallClearance)
        if(o.width>clearDoorW+EPS||o.height>clearDoorH+EPS)continue
      }
      if(point.x+o.length>maxX+EPS||point.y+o.width>maxY+EPS||point.z+o.height>maxZ+EPS)continue
      if(placements.some(p=>intersects(p,point.x,point.y,point.z,o.length,o.width,o.height,settings.itemGap)))continue
      if(supportRatioAt(placements,point.x,point.y,point.z,o.length,o.width)+EPS<settings.supportRatio)continue
      if(!supportersStackable(placements,lookup,point.x,point.y,point.z,o.length,o.width))continue
      const compact=point.z*1_000_000+point.y*1_000+point.x
      const residual=(maxX-(point.x+o.length))+(maxY-(point.y+o.width))+(maxZ-(point.z+o.height))*.15
      const score=compact+residual
      if(!best||score<best.score)best={point,o,score}
    }
    if(!best){unpacked.push(unit);continue}
    placements.push({uid:unit.uid,cargoId:unit.cargoId,cargoName:unit.cargoName,x:best.point.x,y:best.point.y,z:best.point.z,length:best.o.length,width:best.o.width,height:best.o.height,weightKg:unit.weightKg,color:unit.color,orientation:best.o.label,nestedInsideUid})
    usedWeightKg+=unit.weightKg
  }
  return {placements,unpacked,usedWeightKg}
}
function packNestedSpaces(units,settings){
  if(!settings.useInnerSpaces)return {remaining:units,assignments:[]}
  const hosts=units.filter(u=>u.innerSpace?.enabled&&u.innerSpace.length>0&&u.innerSpace.width>0&&u.innerSpace.height>0).sort((a,b)=>(b.innerSpace.length*b.innerSpace.width*b.innerSpace.height)-(a.innerSpace.length*a.innerSpace.width*a.innerSpace.height))
  const consumed=new Set(),assignments=[]
  for(const host of hosts){
    if(consumed.has(host.uid))continue
    const candidates=units.filter(u=>!consumed.has(u.uid)&&u.uid!==host.uid&&u.canBeNested&&!u.innerSpace?.enabled)
    if(!candidates.length)continue
    const maxPayload=host.innerSpace.maxPayloadKg>0?host.innerSpace.maxPayloadKg:Number.MAX_SAFE_INTEGER
    const nestedSettings={...settings,wallClearance:0,itemGap:Math.min(settings.itemGap,5),supportRatio:Math.min(settings.supportRatio,.75)}
    const packed=placeUnits(candidates,{length:host.innerSpace.length,width:host.innerSpace.width,height:host.innerSpace.height,maxWeightKg:maxPayload},nestedSettings,host.uid)
    if(!packed.placements.length)continue
    packed.placements.forEach(p=>consumed.add(p.uid))
    assignments.push({hostUid:host.uid,hostCargoName:host.cargoName,placements:packed.placements,usedVolumeM3:packed.placements.reduce((s,p)=>s+boxVolumeM3(p.length,p.width,p.height),0),availableVolumeM3:boxVolumeM3(host.innerSpace.length,host.innerSpace.width,host.innerSpace.height),usedWeightKg:packed.usedWeightKg})
  }
  const nestedWeightByHost=new Map(assignments.map(a=>[a.hostUid,a.usedWeightKg]))
  return {remaining:units.filter(u=>!consumed.has(u.uid)).map(u=>({...u,weightKg:u.weightKg+(nestedWeightByHost.get(u.uid)||0)})),assignments}
}
function packOne(units,spec,settings){return placeUnits(units,{length:spec.length,width:spec.width,height:spec.height,maxWeightKg:spec.maxPayloadKg,doorWidth:spec.doorWidth,doorHeight:spec.doorHeight},settings)}
function selectBest(units,specs,settings){
  const candidates=specs.map(spec=>{const packed=packOne(units,spec,settings);const packedVol=packed.placements.reduce((s,p)=>s+boxVolumeM3(p.length,p.width,p.height),0);return{spec,packed,packedVol}}).filter(c=>c.packed.placements.length)
  if(!candidates.length)return null
  const full=candidates.filter(c=>!c.packed.unpacked.length)
  if(full.length)return full.sort((a,b)=>a.spec.nominalVolumeM3-b.spec.nominalVolumeM3||b.spec.maxPayloadKg-a.spec.maxPayloadKg)[0]
  return candidates.sort((a,b)=>b.packedVol-a.packedVol||b.packed.placements.length-a.packed.placements.length||a.spec.nominalVolumeM3-b.spec.nominalVolumeM3)[0]
}
export function optimizePacking(cargo,containerSpecs,settings){
  const start=performance.now(),allUnits=expandCargo(cargo)
  const totalCargoVolumeM3=allUnits.reduce((s,u)=>s+boxVolumeM3(u.length,u.width,u.height),0),totalWeightKg=allUnits.reduce((s,u)=>s+u.weightKg,0)
  const nesting=packNestedSpaces(allUnits,settings);let remaining=nesting.remaining
  const topLevelCargoVolumeM3=remaining.reduce((s,u)=>s+boxVolumeM3(u.length,u.width,u.height),0),nestedSavedVolumeM3=totalCargoVolumeM3-topLevelCargoVolumeM3
  const enabled=containerSpecs.filter(c=>c.enabled&&c.length>0&&c.width>0&&c.height>0&&c.maxPayloadKg>0),containers=[]
  const hardLimit=Math.max(1,Math.min(100,allUnits.length+5))
  for(let i=0;i<hardLimit&&remaining.length;i++){
    const best=selectBest(remaining,enabled,settings);if(!best)break
    const ids=new Set(best.packed.placements.map(p=>p.uid)),nestedFor=nesting.assignments.filter(a=>ids.has(a.hostUid))
    const usedVolumeM3=best.packed.placements.reduce((s,p)=>s+boxVolumeM3(p.length,p.width,p.height),0),usedWeightKg=best.packed.usedWeightKg
    const usableVolume=boxVolumeM3(Math.max(0,best.spec.length-settings.wallClearance*2),Math.max(0,best.spec.width-settings.wallClearance*2),Math.max(0,best.spec.height-settings.wallClearance))
    containers.push({index:containers.length+1,spec:best.spec,placements:best.packed.placements,nestedAssignments:nestedFor,usedVolumeM3,usedWeightKg,volumeUtilization:usableVolume?usedVolumeM3/usableVolume:0,weightUtilization:usedWeightKg/best.spec.maxPayloadKg,remainingVolumeM3:Math.max(0,usableVolume-usedVolumeM3)})
    remaining=remaining.filter(u=>!ids.has(u.uid))
  }
  return {containers,unpacked:remaining,nestedAssignments:nesting.assignments,totalCargoVolumeM3,topLevelCargoVolumeM3,nestedSavedVolumeM3,totalWeightKg,elapsedMs:performance.now()-start}
}
