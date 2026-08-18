const EPS=0.001
export const boxVolumeM3=(l,w,h)=>(Math.max(0,l)*Math.max(0,w)*Math.max(0,h))/1_000_000_000

export function packedDimensions(item){
  const p=item.packaging||{}
  if(p.overrideOuter&&p.outerLength>0&&p.outerWidth>0&&p.outerHeight>0){
    return {length:Number(p.outerLength),width:Number(p.outerWidth),height:Number(p.outerHeight)}
  }
  return {
    length:Number(item.length||0)+Number(p.addLength||0),
    width:Number(item.width||0)+Number(p.addWidth||0),
    height:Number(item.height||0)+Number(p.addHeight||0),
  }
}

export function packedWeightKg(item){return Number(item.weightKg||0)+Number(item.packaging?.tareWeightKg||0)}

export function expandCargo(cargo){
  const out=[]
  cargo.forEach(item=>{
    const d=packedDimensions(item),w=packedWeightKg(item)
    for(let i=0;i<Math.max(0,Math.floor(item.quantity));i++){
      out.push({
        uid:`${item.id}-${i+1}`,
        cargoId:item.id,
        cargoName:item.name,
        rawLength:Number(item.length),rawWidth:Number(item.width),rawHeight:Number(item.height),rawWeightKg:Number(item.weightKg),
        length:d.length,width:d.width,height:d.height,weightKg:w,
        packageTareWeightKg:Number(item.packaging?.tareWeightKg||0),
        packagingType:item.packaging?.type||'bare', packagingLabel:item.packaging?.label||'장비 직접 적재',
        rotation:item.rotation,stackable:item.stackable,canBeNested:item.canBeNested,color:item.color,innerSpace:item.innerSpace,
      })
    }
  })
  return out
}

function orientations(unit){
  const d=[unit.length,unit.width,unit.height]
  const raw=unit.rotation==='locked'
    ? [[d[0],d[1],d[2],'L×W×H']]
    : unit.rotation==='upright'
      ? [[d[0],d[1],d[2],'L×W×H'],[d[1],d[0],d[2],'W×L×H']]
      : [[d[0],d[1],d[2],'L×W×H'],[d[0],d[2],d[1],'L×H×W'],[d[1],d[0],d[2],'W×L×H'],[d[1],d[2],d[0],'W×H×L'],[d[2],d[0],d[1],'H×L×W'],[d[2],d[1],d[0],'H×W×L']]
  const seen=new Set()
  return raw.filter(([l,w,h])=>{const k=`${l}|${w}|${h}`;if(seen.has(k))return false;seen.add(k);return true}).map(([length,width,height,label])=>({length,width,height,label}))
}

function boundsFor(dims,settings){
  const minX=Math.max(0,Number(settings.doorClearance||0))
  const minY=Math.max(0,Number(settings.sideClearance||0))
  const minZ=Math.max(0,Number(settings.floorClearance||0))
  const maxX=Math.max(minX,Number(dims.length)-Math.max(0,Number(settings.rearClearance||0)))
  const maxY=Math.max(minY,Number(dims.width)-Math.max(0,Number(settings.sideClearance||0))-Math.max(0,Number(settings.aisleWidth||0)))
  const heightCap=Number(settings.maxLoadHeight||0)>0?Math.min(Number(dims.height),Number(settings.maxLoadHeight)):Number(dims.height)
  const maxZ=Math.max(minZ,heightCap-Math.max(0,Number(settings.ceilingClearance||0)))
  return {minX,minY,minZ,maxX,maxY,maxZ}
}

function intersects(a,x,y,z,l,w,h,gap,verticalGap){
  return !(x+l+gap<=a.x+EPS||a.x+a.length+gap<=x+EPS||y+w+gap<=a.y+EPS||a.y+a.width+gap<=y+EPS||z+h+verticalGap<=a.z+EPS||a.z+a.height+verticalGap<=z+EPS)
}
function overlapArea(a,x,y,l,w){const ox=Math.max(0,Math.min(a.x+a.length,x+l)-Math.max(a.x,x));const oy=Math.max(0,Math.min(a.y+a.width,y+w)-Math.max(a.y,y));return ox*oy}
function supportRatioAt(placements,x,y,z,l,w,bounds,verticalGap){
  if(z<=bounds.minZ+EPS)return 1
  let supported=0
  placements.forEach(p=>{if(Math.abs(p.z+p.height+verticalGap-z)<=1)supported+=overlapArea(p,x,y,l,w)})
  return Math.min(1,supported/Math.max(1,l*w))
}
function supportersStackable(placements,lookup,x,y,z,l,w,bounds,verticalGap){
  if(z<=bounds.minZ+EPS)return true
  return placements.filter(p=>Math.abs(p.z+p.height+verticalGap-z)<=1&&overlapArea(p,x,y,l,w)>0).every(p=>lookup.get(p.uid)?.stackable!==false)
}
function candidatePoints(placements,bounds,gap,verticalGap){
  const pts=[{x:bounds.minX,y:bounds.minY,z:bounds.minZ}]
  placements.forEach(p=>pts.push(
    {x:p.x+p.length+gap,y:p.y,z:p.z},
    {x:p.x,y:p.y+p.width+gap,z:p.z},
    {x:p.x,y:p.y,z:p.z+p.height+verticalGap},
    {x:p.x+p.length+gap,y:p.y+p.width+gap,z:p.z},
    {x:p.x+p.length+gap,y:p.y,z:p.z+p.height+verticalGap},
    {x:p.x,y:p.y+p.width+gap,z:p.z+p.height+verticalGap}
  ))
  const uniq=new Map()
  pts.forEach(p=>{if(p.x<bounds.maxX+EPS&&p.y<bounds.maxY+EPS&&p.z<bounds.maxZ+EPS)uniq.set(`${Math.round(p.x)}|${Math.round(p.y)}|${Math.round(p.z)}`,p)})
  return [...uniq.values()].sort((a,b)=>a.z-b.z||a.y-b.y||a.x-b.x)
}

function placeUnits(units,dims,settings,nestedInsideUid){
  const placements=[],unpacked=[];let usedWeightKg=0
  const lookup=new Map(units.map(u=>[u.uid,u])), bounds=boundsFor(dims,settings)
  const gap=Math.max(0,Number(settings.itemGap||0)), verticalGap=Math.max(0,Number(settings.verticalGap||0))
  const sorted=[...units].sort((a,b)=>(b.length*b.width*b.height)-(a.length*a.width*a.height)||b.weightKg-a.weightKg)
  for(const unit of sorted){
    if(usedWeightKg+unit.weightKg>Number(dims.maxWeightKg||Number.MAX_SAFE_INTEGER)+EPS){unpacked.push({...unit,unpackedReason:'weight'});continue}
    let best=null
    for(const point of candidatePoints(placements,bounds,gap,verticalGap)) for(const o of orientations(unit)){
      if(dims.doorWidth&&dims.doorHeight){
        const pass=Math.max(0,Number(settings.doorPassClearance||0))
        const clearDoorW=Math.max(0,Number(dims.doorWidth)-pass*2),clearDoorH=Math.max(0,Number(dims.doorHeight)-pass)
        if(o.width>clearDoorW+EPS||o.height>clearDoorH+EPS)continue
      }
      if(point.x<bounds.minX-EPS||point.y<bounds.minY-EPS||point.z<bounds.minZ-EPS)continue
      if(point.x+o.length>bounds.maxX+EPS||point.y+o.width>bounds.maxY+EPS||point.z+o.height>bounds.maxZ+EPS)continue
      if(placements.some(p=>intersects(p,point.x,point.y,point.z,o.length,o.width,o.height,gap,verticalGap)))continue
      if(supportRatioAt(placements,point.x,point.y,point.z,o.length,o.width,bounds,verticalGap)+EPS<Number(settings.supportRatio||0))continue
      if(!supportersStackable(placements,lookup,point.x,point.y,point.z,o.length,o.width,bounds,verticalGap))continue
      const compact=(point.z-bounds.minZ)*1_000_000+(point.y-bounds.minY)*1_000+(point.x-bounds.minX)
      const residual=(bounds.maxX-(point.x+o.length))+(bounds.maxY-(point.y+o.width))+(bounds.maxZ-(point.z+o.height))*.12
      const edgeBonus=(Math.abs(point.x-bounds.minX)<1||Math.abs(point.y-bounds.minY)<1)?-20:0
      const score=compact+residual+edgeBonus
      if(!best||score<best.score)best={point,o,score}
    }
    if(!best){unpacked.push({...unit,unpackedReason:'space-or-constraints'});continue}
    placements.push({
      uid:unit.uid,cargoId:unit.cargoId,cargoName:unit.cargoName,
      x:best.point.x,y:best.point.y,z:best.point.z,length:best.o.length,width:best.o.width,height:best.o.height,
      rawLength:unit.rawLength,rawWidth:unit.rawWidth,rawHeight:unit.rawHeight,
      weightKg:unit.weightKg,rawWeightKg:unit.rawWeightKg,packageTareWeightKg:unit.packageTareWeightKg,
      packagingType:unit.packagingType,packagingLabel:unit.packagingLabel,
      color:unit.color,orientation:best.o.label,nestedInsideUid
    })
    usedWeightKg+=unit.weightKg
  }
  return {placements,unpacked,usedWeightKg,bounds}
}

function packNestedSpaces(units,settings){
  if(!settings.useInnerSpaces)return {remaining:units,assignments:[]}
  const hosts=units.filter(u=>u.innerSpace?.enabled&&u.innerSpace.length>0&&u.innerSpace.width>0&&u.innerSpace.height>0).sort((a,b)=>(b.innerSpace.length*b.innerSpace.width*b.innerSpace.height)-(a.innerSpace.length*a.innerSpace.width*a.innerSpace.height))
  const consumed=new Set(),assignments=[]
  for(const host of hosts){
    if(consumed.has(host.uid))continue
    const candidates=units.filter(u=>!consumed.has(u.uid)&&u.uid!==host.uid&&u.canBeNested&&!u.innerSpace?.enabled)
    if(!candidates.length)continue
    const maxPayload=Number(host.innerSpace.maxPayloadKg)>0?Number(host.innerSpace.maxPayloadKg):Number.MAX_SAFE_INTEGER
    const nestedSettings={...settings,doorClearance:0,rearClearance:0,sideClearance:0,ceilingClearance:0,floorClearance:0,aisleWidth:0,doorPassClearance:0,itemGap:Math.min(Number(settings.itemGap||0),5),verticalGap:0,supportRatio:Math.min(Number(settings.supportRatio||.75),.75),maxLoadHeight:0}
    const packed=placeUnits(candidates,{length:host.innerSpace.length,width:host.innerSpace.width,height:host.innerSpace.height,maxWeightKg:maxPayload},nestedSettings,host.uid)
    if(!packed.placements.length)continue
    packed.placements.forEach(p=>consumed.add(p.uid))
    assignments.push({
      hostUid:host.uid,hostCargoId:host.cargoId,hostCargoName:host.cargoName,access:host.innerSpace.access||'full',
      placements:packed.placements,usedVolumeM3:packed.placements.reduce((s,p)=>s+boxVolumeM3(p.length,p.width,p.height),0),
      availableVolumeM3:boxVolumeM3(host.innerSpace.length,host.innerSpace.width,host.innerSpace.height),usedWeightKg:packed.usedWeightKg,
      innerLength:host.innerSpace.length,innerWidth:host.innerSpace.width,innerHeight:host.innerSpace.height
    })
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

function containerAnalytics(container,settings){
  const ps=container.placements,totalWeight=ps.reduce((s,p)=>s+p.weightKg,0)
  const cg=ps.length&&totalWeight>0?{
    x:ps.reduce((s,p)=>s+(p.x+p.length/2)*p.weightKg,0)/totalWeight,
    y:ps.reduce((s,p)=>s+(p.y+p.width/2)*p.weightKg,0)/totalWeight,
    z:ps.reduce((s,p)=>s+(p.z+p.height/2)*p.weightKg,0)/totalWeight,
  }:{x:0,y:0,z:0}
  const floorAreaM2=(container.spec.length*container.spec.width)/1_000_000
  const avgFloorLoadKgM2=floorAreaM2?totalWeight/floorAreaM2:0
  const targetFloor=Number(settings.maxFloorLoadKgM2||0)
  const warnings=[]
  if(targetFloor>0&&avgFloorLoadKgM2>targetFloor)warnings.push(`평균 바닥하중 ${avgFloorLoadKgM2.toFixed(0)} kg/m²가 설정 한도 ${targetFloor.toFixed(0)} kg/m²를 초과합니다.`)
  if(totalWeight>0){
    const nx=cg.x/container.spec.length,ny=cg.y/container.spec.width
    if(nx<.25||nx>.75)warnings.push('길이 방향 무게중심이 중앙 50% 범위를 벗어났습니다.')
    if(ny<.30||ny>.70)warnings.push('좌우 무게중심이 중앙 40% 범위를 벗어났습니다.')
  }
  return {centerOfGravity:cg,avgFloorLoadKgM2,warnings}
}

export function optimizePacking(cargo,containerSpecs,settings){
  const start=performance.now(),allUnits=expandCargo(cargo)
  const totalCargoVolumeM3=allUnits.reduce((s,u)=>s+boxVolumeM3(u.length,u.width,u.height),0)
  const totalRawVolumeM3=cargo.reduce((s,u)=>s+boxVolumeM3(u.length,u.width,u.height)*Math.max(0,Math.floor(u.quantity)),0)
  const totalWeightKg=allUnits.reduce((s,u)=>s+u.weightKg,0),totalRawWeightKg=cargo.reduce((s,u)=>s+Number(u.weightKg||0)*Math.max(0,Math.floor(u.quantity)),0)
  const nesting=packNestedSpaces(allUnits,settings);let remaining=nesting.remaining
  const topLevelCargoVolumeM3=remaining.reduce((s,u)=>s+boxVolumeM3(u.length,u.width,u.height),0),nestedSavedVolumeM3=totalCargoVolumeM3-topLevelCargoVolumeM3
  const enabled=containerSpecs.filter(c=>c.enabled&&c.length>0&&c.width>0&&c.height>0&&c.maxPayloadKg>0),containers=[]
  const hardLimit=Math.max(1,Math.min(150,allUnits.length+5))
  for(let i=0;i<hardLimit&&remaining.length;i++){
    const best=selectBest(remaining,enabled,settings);if(!best)break
    const ids=new Set(best.packed.placements.map(p=>p.uid)),nestedFor=nesting.assignments.filter(a=>ids.has(a.hostUid))
    const usedVolumeM3=best.packed.placements.reduce((s,p)=>s+boxVolumeM3(p.length,p.width,p.height),0),usedWeightKg=best.packed.usedWeightKg
    const b=best.packed.bounds,usableVolume=boxVolumeM3(Math.max(0,b.maxX-b.minX),Math.max(0,b.maxY-b.minY),Math.max(0,b.maxZ-b.minZ))
    const container={index:containers.length+1,spec:best.spec,placements:best.packed.placements,nestedAssignments:nestedFor,usedVolumeM3,usedWeightKg,usableVolumeM3:usableVolume,volumeUtilization:usableVolume?usedVolumeM3/usableVolume:0,weightUtilization:usedWeightKg/best.spec.maxPayloadKg,remainingVolumeM3:Math.max(0,usableVolume-usedVolumeM3),bounds:b}
    Object.assign(container,containerAnalytics(container,settings));containers.push(container)
    remaining=remaining.filter(u=>!ids.has(u.uid))
  }
  const nestedAssignedIds=new Set(nesting.assignments.flatMap(a=>a.placements.map(p=>p.uid)))
  const trulyUnpacked=remaining.filter(u=>!nestedAssignedIds.has(u.uid))
  return {containers,unpacked:trulyUnpacked,nestedAssignments:nesting.assignments,totalCargoVolumeM3,totalRawVolumeM3,topLevelCargoVolumeM3,nestedSavedVolumeM3,totalWeightKg,totalRawWeightKg,packagingWeightKg:Math.max(0,totalWeightKg-totalRawWeightKg),elapsedMs:performance.now()-start}
}
