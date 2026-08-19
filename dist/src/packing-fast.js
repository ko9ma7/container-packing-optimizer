const EPS=1e-6
export const boxVolumeM3=(l,w,h)=>(Math.max(0,Number(l)||0)*Math.max(0,Number(w)||0)*Math.max(0,Number(h)||0))/1_000_000_000
export function packedDimensions(item){
  const p=item?.packaging||{}
  if(p.overrideOuter&&Number(p.outerLength)>0&&Number(p.outerWidth)>0&&Number(p.outerHeight)>0)return {length:Number(p.outerLength),width:Number(p.outerWidth),height:Number(p.outerHeight)}
  return {length:Number(item?.length||0)+Number(p.addLength||0),width:Number(item?.width||0)+Number(p.addWidth||0),height:Number(item?.height||0)+Number(p.addHeight||0)}
}
export const packedWeightKg=item=>Number(item?.weightKg||0)+Number(item?.packaging?.tareWeightKg||0)

function orientationRules(unit){
  if(unit.orientationRules)return {rotate90:unit.orientationRules.rotate90===true,layWidth:unit.orientationRules.layWidth===true,layLength:unit.orientationRules.layLength===true}
  const m=unit.rotation||'locked'
  if(m==='free')return {rotate90:true,layWidth:true,layLength:true}
  if(m==='upright')return {rotate90:true,layWidth:false,layLength:false}
  if(m==='layWidth')return {rotate90:true,layWidth:true,layLength:false}
  if(m==='layLength')return {rotate90:true,layWidth:false,layLength:true}
  return {rotate90:false,layWidth:false,layLength:false}
}
function orientations(unit){
  const L=Number(unit.length),W=Number(unit.width),H=Number(unit.height),r=orientationRules(unit)
  const raw=[[L,W,H,'L×W×H','기본 자세']]
  if(r.rotate90)raw.push([W,L,H,'W×L×H','수직 유지 · 평면 회전'])
  if(r.layWidth){raw.push([L,H,W,'L×H×W','3축 회전']);if(r.rotate90)raw.push([H,L,W,'H×L×W','3축 회전'])}
  if(r.layLength){raw.push([H,W,L,'H×W×L','3축 회전']);if(r.rotate90)raw.push([W,H,L,'W×H×L','3축 회전'])}
  const seen=new Set(),out=[]
  for(const [length,width,height,label,description] of raw){const k=`${length}|${width}|${height}`;if(!seen.has(k)){seen.add(k);out.push({length,width,height,label,description})}}
  return out
}
function expandCargo(cargo){
  const out=[]
  for(const item of cargo||[]){
    const d=packedDimensions(item),w=packedWeightKg(item),q=Math.max(0,Math.floor(Number(item.quantity)||0))
    for(let i=0;i<q;i++)out.push({
      uid:`${item.id}-${i+1}`,cargoId:item.id,cargoName:item.name,
      rawLength:Number(item.length||0),rawWidth:Number(item.width||0),rawHeight:Number(item.height||0),rawWeightKg:Number(item.weightKg||0),
      length:d.length,width:d.width,height:d.height,weightKg:w,packageTareWeightKg:Number(item.packaging?.tareWeightKg||0),
      packagingType:item.packaging?.type||'bare',packagingLabel:item.packaging?.label||'장비 직접 적재',
      rotation:item.rotation,orientationRules:item.orientationRules||null,
      canBeStacked:item.canBeStacked===true,canSupportCargo:(item.canSupportCargo??item.stackable)===true,
      maxStackLayers:Math.max(1,Math.floor(Number(item.maxStackLayers||1))),sameCargoStackOnly:item.sameCargoStackOnly!==false,
      canBeNested:item.canBeNested===true,color:item.color||'#2f80ed',innerSpace:item.innerSpace||{enabled:false},
    })
  }
  return out
}
function boundsFor(spec,settings){
  const minX=Math.max(0,Number(settings.doorClearance||0)),minY=Math.max(0,Number(settings.sideClearance||0)),minZ=Math.max(0,Number(settings.floorClearance||0))
  const maxX=Math.max(minX,Number(spec.length)-Math.max(0,Number(settings.rearClearance||0)))
  const maxY=Math.max(minY,Number(spec.width)-Math.max(0,Number(settings.sideClearance||0))-Math.max(0,Number(settings.aisleWidth||0)))
  const cap=Number(settings.maxLoadHeight||0)>0?Math.min(Number(spec.height),Number(settings.maxLoadHeight)):Number(spec.height)
  const maxZ=Math.max(minZ,cap-Math.max(0,Number(settings.ceilingClearance||0)))
  return {minX,minY,minZ,maxX,maxY,maxZ,length:maxX-minX,width:maxY-minY,height:maxZ-minZ}
}
function doorFits(o,spec,settings){
  if(!spec.doorWidth||!spec.doorHeight)return true
  const p=Math.max(0,Number(settings.doorPassClearance||0))
  return o.width<=Number(spec.doorWidth)-p*2+EPS&&o.height<=Number(spec.doorHeight)-p+EPS
}
function placementFrom(unit,o,x,y,z,extra={}){return {
  uid:unit.uid,cargoId:unit.cargoId,cargoName:unit.cargoName,x,y,z,length:o.length,width:o.width,height:o.height,
  rawLength:unit.rawLength,rawWidth:unit.rawWidth,rawHeight:unit.rawHeight,weightKg:unit.weightKg,rawWeightKg:unit.rawWeightKg,packageTareWeightKg:unit.packageTareWeightKg,
  packagingType:unit.packagingType,packagingLabel:unit.packagingLabel,color:unit.color,orientation:o.label,orientationDescription:o.description,
  stackLayer:extra.stackLayer||1,supportRatio:extra.supportRatio??1,maxStackLayers:unit.maxStackLayers||1,canBeStacked:unit.canBeStacked,canSupportCargo:unit.canSupportCargo,sameCargoStackOnly:unit.sameCargoStackOnly,
  nestedInsideUid:extra.nestedInsideUid||null,deckId:extra.deckId||null,onDeck:extra.onDeck===true,
}}

// ---------- Fast 3D guillotine packer for tank/frame interiors ----------
function splitSpace3D(space,o,gap){
  const occL=Math.min(space.length,o.length+gap),occW=Math.min(space.width,o.width+gap),occH=Math.min(space.height,o.height+gap)
  const out=[]
  const push=(x,y,z,l,w,h)=>{if(l>EPS&&w>EPS&&h>EPS)out.push({x,y,z,length:l,width:w,height:h})}
  push(space.x+occL,space.y,space.z,space.length-occL,space.width,space.height)
  push(space.x,space.y+occW,space.z,o.length,space.width-occW,space.height)
  push(space.x,space.y,space.z+occH,o.length,o.width,space.height-occH)
  return out
}
function pack3DVariant(units,dims,{gap=0,maxWeight=Number.MAX_SAFE_INTEGER,order='volumeDesc',nestedInsideUid=null}={}){
  const spaces=[{x:0,y:0,z:0,length:dims.length,width:dims.width,height:dims.height}],placements=[],unpacked=[];let weight=0
  const scoreUnit=u=>u.length*u.width*u.height
  let ordered=[...units]
  if(order==='volumeAsc')ordered.sort((a,b)=>scoreUnit(a)-scoreUnit(b)||Math.min(a.length,a.width,a.height)-Math.min(b.length,b.width,b.height))
  else if(order==='smallFootprint')ordered.sort((a,b)=>Math.min(a.length*a.width,a.length*a.height,a.width*a.height)-Math.min(b.length*b.width,b.length*b.height,b.width*b.height)||scoreUnit(b)-scoreUnit(a))
  else if(order==='heightDesc')ordered.sort((a,b)=>Math.max(b.length,b.width,b.height)-Math.max(a.length,a.width,a.height)||scoreUnit(b)-scoreUnit(a))
  else if(order==='groupSmall')ordered.sort((a,b)=>String(a.cargoId).localeCompare(String(b.cargoId))||scoreUnit(a)-scoreUnit(b))
  else ordered.sort((a,b)=>scoreUnit(b)-scoreUnit(a)||Math.max(b.length,b.width,b.height)-Math.max(a.length,a.width,a.height))
  for(const unit of ordered){
    if(weight+unit.weightKg>maxWeight+EPS){unpacked.push(unit);continue}
    let best=null
    for(let si=0;si<spaces.length;si++){
      const s=spaces[si]
      for(const o of orientations(unit)){
        if(o.length>s.length+EPS||o.width>s.width+EPS||o.height>s.height+EPS)continue
        const waste=s.length*s.width*s.height-o.length*o.width*o.height
        const short=Math.min(s.length-o.length,s.width-o.width,s.height-o.height)
        const repeats=Math.max(1,Math.floor((s.length+gap)/(o.length+gap)))*Math.max(1,Math.floor((s.width+gap)/(o.width+gap)))*Math.max(1,Math.floor((s.height+gap)/(o.height+gap)))
        const score=-repeats*1e15+waste+short*1e6+s.z*1e10+s.y*1e5+s.x
        if(!best||score<best.score)best={si,s,o,score}
      }
    }
    if(!best){unpacked.push(unit);continue}
    const p=placementFrom(unit,best.o,best.s.x,best.s.y,best.s.z,{nestedInsideUid});placements.push(p);weight+=unit.weightKg
    spaces.splice(best.si,1,...splitSpace3D(best.s,best.o,gap))
    spaces.sort((a,b)=>a.z-b.z||a.y-b.y||a.x-b.x)
  }
  return {placements,unpacked,usedWeightKg:weight}
}
function pack3DBest(units,dims,opts={}){
  const orders=['volumeDesc','volumeAsc','smallFootprint','heightDesc','groupSmall'];let best=null
  for(const order of orders){const r=pack3DVariant(units,dims,{...opts,order});const vol=r.placements.reduce((s,p)=>s+p.length*p.width*p.height,0);const score=[vol,r.placements.length,-r.unpacked.length];if(!best||score[0]>best.score[0]+EPS||(Math.abs(score[0]-best.score[0])<EPS&&(score[1]>best.score[1])))best={...r,score}}
  return best||{placements:[],unpacked:[...units],usedWeightKg:0,score:[0,0,-units.length]}
}
function packNestedSpaces(units,settings){
  if(!settings.useInnerSpaces)return {remaining:units,assignments:[]}
  const hosts=units.filter(u=>u.innerSpace?.enabled&&Number(u.innerSpace.length)>0&&Number(u.innerSpace.width)>0&&Number(u.innerSpace.height)>0).sort((a,b)=>(b.innerSpace.length*b.innerSpace.width*b.innerSpace.height)-(a.innerSpace.length*a.innerSpace.width*a.innerSpace.height))
  const consumed=new Set(),assignments=[]
  for(const host of hosts){
    if(consumed.has(host.uid))continue
    const candidates=units.filter(u=>!consumed.has(u.uid)&&u.uid!==host.uid&&u.canBeNested&&!u.innerSpace?.enabled)
    if(!candidates.length)continue
    const dims={length:Number(host.innerSpace.length),width:Number(host.innerSpace.width),height:Number(host.innerSpace.height)}
    const maxPayload=Number(host.innerSpace.maxPayloadKg)>0?Number(host.innerSpace.maxPayloadKg):Number.MAX_SAFE_INTEGER
    const gap=Math.max(0,Number(settings.innerItemGap??0))
    const packed=pack3DBest(candidates,dims,{gap,maxWeight:maxPayload,nestedInsideUid:host.uid})
    if(!packed.placements.length)continue
    packed.placements.forEach(p=>consumed.add(p.uid))
    assignments.push({hostUid:host.uid,hostCargoId:host.cargoId,hostCargoName:host.cargoName,access:host.innerSpace.access||'top',placements:packed.placements,usedVolumeM3:packed.placements.reduce((s,p)=>s+boxVolumeM3(p.length,p.width,p.height),0),availableVolumeM3:boxVolumeM3(dims.length,dims.width,dims.height),usedWeightKg:packed.usedWeightKg,innerLength:dims.length,innerWidth:dims.width,innerHeight:dims.height})
  }
  const nestedWeightByHost=new Map(assignments.map(a=>[a.hostUid,a.usedWeightKg]))
  return {remaining:units.filter(u=>!consumed.has(u.uid)).map(u=>({...u,weightKg:u.weightKg+(nestedWeightByHost.get(u.uid)||0)})),assignments}
}

// ---------- Fast 2D guillotine floor/deck packer ----------
function splitRect(rect,occL,occW,gap){
  const L=Math.min(rect.length,occL+gap),W=Math.min(rect.width,occW+gap),rx=rect.length-L,ry=rect.width-W,out=[]
  const push=(x,y,l,w)=>{if(l>EPS&&w>EPS)out.push({x,y,length:l,width:w})}
  if(rx>ry){push(rect.x+L,rect.y,rx,rect.width);push(rect.x,rect.y+W,L,rect.width-W)}
  else{push(rect.x,rect.y+W,rect.length,rect.width-W);push(rect.x+L,rect.y,rect.length-L,W)}
  return out
}
function rectIntersects(a,b){return !(a.x+a.length<=b.x+EPS||b.x+b.length<=a.x+EPS||a.y+a.width<=b.y+EPS||b.y+b.width<=a.y+EPS)}
function overlap2D(a,b){const x=Math.max(0,Math.min(a.x+a.length,b.x+b.length)-Math.max(a.x,b.x)),y=Math.max(0,Math.min(a.y+a.width,b.y+b.width)-Math.max(a.y,b.y));return x*y}
function pruneRects(rects){
  const out=[]
  for(let i=0;i<rects.length;i++){let contained=false;for(let j=0;j<rects.length;j++){if(i===j)continue;const a=rects[i],b=rects[j];if(a.x>=b.x-EPS&&a.y>=b.y-EPS&&a.x+a.length<=b.x+b.length+EPS&&a.y+a.width<=b.y+b.width+EPS){contained=true;break}}if(!contained)out.push(rects[i])}
  return out.slice(0,250)
}
function floorOrder(units,mode='supportArea'){
  const vol=u=>u.length*u.width*u.height,area=u=>u.length*u.width
  const arr=[...units]
  if(mode==='length')arr.sort((a,b)=>Math.max(b.length,b.width)-Math.max(a.length,a.width)||area(b)-area(a)||vol(b)-vol(a))
  else if(mode==='volume')arr.sort((a,b)=>vol(b)-vol(a)||area(b)-area(a))
  else if(mode==='inflexible')arr.sort((a,b)=>orientations(a).length-orientations(b).length||area(b)-area(a)||vol(b)-vol(a))
  else arr.sort((a,b)=>(b.canSupportCargo?1:0)-(a.canSupportCargo?1:0)||area(b)-area(a)||vol(b)-vol(a))
  return arr
}
function fitOnFloor(unit,freeRects,spec,bounds,settings){
  let best=null;const gap=Math.max(0,Number(settings.itemGap||0))
  for(let ri=0;ri<freeRects.length;ri++){
    const r=freeRects[ri]
    for(const o of orientations(unit)){
      if(!doorFits(o,spec,settings)||o.height>bounds.height+EPS||o.length>r.length+EPS||o.width>r.width+EPS)continue
      const endX=r.x+o.length,endY=r.y+o.width
      const waste=r.length*r.width-o.length*o.width
      const score=endX*1e8+endY*1e4+waste+o.height*10
      if(!best||score<best.score)best={ri,rect:r,o,score,gap}
    }
  }
  return best
}
function mergeDeckRegions(basePlacements,settings,bounds){
  const supports=basePlacements.filter(p=>p.canSupportCargo&&p.stackLayer<Math.max(2,p.maxStackLayers||2))
  const regions=[];let id=0
  const covered=new Set()
  // Optional board/deck spanning: connect coplanar supports that touch or are within bridge gap.
  // When a valid merged deck exists, use that continuous deck INSTEAD of overlapping individual surfaces.
  if(settings.useDeckBoards===true){
    const bridge=Math.max(0,Number(settings.deckBridgeGap??Math.max(50,Number(settings.itemGap||0)*2)))
    const groups=new Map()
    for(const p of supports){const key=Math.round((p.z+p.height)/5)*5;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p)}
    for(const [z,arr] of groups){
      const unseen=new Set(arr.map((_,i)=>i))
      while(unseen.size){const seed=[...unseen][0],queue=[seed],component=[];unseen.delete(seed)
        while(queue.length){const i=queue.shift(),a=arr[i];component.push(a);for(const j of [...unseen]){const b=arr[j];const near=!(a.x+a.length+bridge<b.x||b.x+b.length+bridge<a.x||a.y+a.width+bridge<b.y||b.y+b.width+bridge<a.y);if(near){unseen.delete(j);queue.push(j)}}}
        if(component.length<2)continue
        const x=Math.min(...component.map(p=>p.x)),y=Math.min(...component.map(p=>p.y)),maxX=Math.max(...component.map(p=>p.x+p.length)),maxY=Math.max(...component.map(p=>p.y+p.width))
        const length=maxX-x,width=maxY-y,area=length*width,supportArea=component.reduce((sum,p)=>sum+p.length*p.width,0),coverage=Math.min(1,supportArea/Math.max(1,area))
        const minCoverage=Math.max(.45,Math.min(1,Number(settings.deckSupportRatio??settings.supportRatio??.75)))
        if(coverage+EPS<minCoverage)continue
        regions.push({id:`deck-${++id}`,x,y,z:Number(z),length,width,supporters:component,freeRects:[{x,y,length,width}],board:true,coverage})
        component.forEach(p=>covered.add(p.uid))
      }
    }
  }
  for(const p of supports){if(covered.has(p.uid))continue;regions.push({id:`deck-${++id}`,x:p.x,y:p.y,z:p.z+p.height,length:p.length,width:p.width,supporters:[p],freeRects:[{x:p.x,y:p.y,length:p.length,width:p.width}],board:false})}
  return regions.filter(r=>r.z<bounds.maxZ-EPS)
}
function overlapsPlacement3D(x,y,z,l,w,h,p){
  return !(x+l<=p.x+EPS||p.x+p.length<=x+EPS||y+w<=p.y+EPS||p.y+p.width<=y+EPS||z+h<=p.z+EPS||p.z+p.height<=z+EPS)
}
function fitOnDeck(unit,regions,spec,bounds,settings,existingPlacements=[]){
  let best=null;const gap=Math.max(0,Number(settings.stackItemGap||0)),required=Math.max(0,Math.min(1,Number(settings.supportRatio||0)))
  for(let gi=0;gi<regions.length;gi++){
    const g=regions[gi];const deckLift=Math.max(0,Number(settings.deckThickness||0))+Math.max(0,Number(settings.verticalGap||0));const availableH=bounds.maxZ-g.z-deckLift;if(availableH<=0)continue
    for(let ri=0;ri<g.freeRects.length;ri++){
      const r=g.freeRects[ri]
      for(const o of orientations(unit)){
        if(!doorFits(o,spec,settings)||o.height>availableH+EPS||o.length>r.length+EPS||o.width>r.width+EPS)continue
        const candidate={x:r.x,y:r.y,length:o.length,width:o.width}
        let supportRatio=1
        if(!g.board){const supported=g.supporters.reduce((s,p)=>s+overlap2D(candidate,p),0);supportRatio=Math.min(1,supported/Math.max(1,o.length*o.width));if(supportRatio+EPS<required)continue}
        // Deck regions may geometrically overlap (e.g. an individual support surface and a merged board).
        // Reject a candidate if another already-placed upper cargo occupies the same 3D volume.
        const z=g.z+deckLift
        if(existingPlacements.some(p=>p.onDeck&&overlapsPlacement3D(candidate.x,candidate.y,z,o.length,o.width,o.height,p)))continue
        const waste=r.length*r.width-o.length*o.width
        const score=g.z*1e10+(r.x+o.length)*1e6+(r.y+o.width)*1e3+waste-supportRatio*100
        if(!best||score<best.score)best={gi,ri,region:g,rect:r,o,score,gap,supportRatio}
      }
    }
  }
  return best
}
function packContainerVariant(units,spec,settings,mode='supportArea'){
  const bounds=boundsFor(spec,settings),floorRects=[{x:bounds.minX,y:bounds.minY,length:bounds.length,width:bounds.width}],placements=[],unpacked=[];let usedWeightKg=0
  const maxWeight=Number(spec.maxPayloadKg||Number.MAX_SAFE_INTEGER),placed=new Set()
  const baseCandidates=floorOrder(units.filter(u=>u.canSupportCargo||!u.canBeStacked),mode)
  function placeFloorList(list){for(const unit of list){if(placed.has(unit.uid))continue;if(usedWeightKg+unit.weightKg>maxWeight+EPS)continue;const fit=fitOnFloor(unit,floorRects,spec,bounds,settings);if(!fit)continue;const p=placementFrom(unit,fit.o,fit.rect.x,fit.rect.y,bounds.minZ,{stackLayer:1});placements.push(p);placed.add(unit.uid);usedWeightKg+=unit.weightKg;floorRects.splice(fit.ri,1,...splitRect(fit.rect,fit.o.length,fit.o.width,fit.gap));const pr=pruneRects(floorRects);floorRects.splice(0,floorRects.length,...pr)}}
  placeFloorList(baseCandidates)
  let deckRegions=mergeDeckRegions(placements,settings,bounds)
  const upperCandidates=floorOrder(units.filter(u=>u.canBeStacked&&!placed.has(u.uid)),mode==='volume'?'volume':'inflexible')
  for(const unit of upperCandidates){
    if(placed.has(unit.uid)||usedWeightKg+unit.weightKg>maxWeight+EPS)continue
    const fit=fitOnDeck(unit,deckRegions,spec,bounds,settings,placements)
    if(!fit)continue
    const z=fit.region.z+Math.max(0,Number(settings.deckThickness||0))+Math.max(0,Number(settings.verticalGap||0));const p=placementFrom(unit,fit.o,fit.rect.x,fit.rect.y,z,{stackLayer:2,supportRatio:fit.supportRatio,deckId:fit.region.id,onDeck:true});placements.push(p);placed.add(unit.uid);usedWeightKg+=unit.weightKg
    const fr=fit.region.freeRects;fr.splice(fit.ri,1,...splitRect(fit.rect,fit.o.length,fit.o.width,fit.gap));fit.region.freeRects=pruneRects(fr)
  }
  // Fill remaining floor space after preferred deck usage.
  placeFloorList(floorOrder(units.filter(u=>!placed.has(u.uid)),mode==='supportArea'?'volume':mode))
  for(const u of units)if(!placed.has(u.uid))unpacked.push({...u,unpackedReason:usedWeightKg+u.weightKg>maxWeight+EPS?'weight':'space-or-constraints'})
  return {placements,unpacked,usedWeightKg,bounds,deckRegions}
}
function resultScore(r){const vol=r.placements.reduce((s,p)=>s+p.length*p.width*p.height,0),stacked=r.placements.filter(p=>p.onDeck||p.z>r.bounds.minZ+EPS).length,decked=r.placements.filter(p=>p.onDeck).length;return [r.placements.length,vol,decked,stacked,-r.unpacked.length]}
function betterResult(a,b){if(!b)return true;const A=resultScore(a),B=resultScore(b);for(let i=0;i<A.length;i++){if(Math.abs(A[i]-B[i])>EPS)return A[i]>B[i]}return false}
function packOne(units,spec,settings){let best=null;for(const mode of ['supportArea','length','volume','inflexible']){const r=packContainerVariant(units,spec,settings,mode);if(betterResult(r,best))best=r}return best}
function usableVolumeFor(spec,settings){const b=boundsFor(spec,settings);return boxVolumeM3(b.length,b.width,b.height)}
function specFamily(spec){const s=`${spec.id||''} ${spec.name||''}`.toLowerCase();return s.includes('20')?'20':s.includes('40')?'40':'other'}
function selectBest(units,specs,settings,goal){
  const candidates=[]
  for(const spec of specs.filter(s=>s.enabled)){const packed=packOne(units,spec,settings);if(!packed.placements.length)continue;const packedVol=packed.placements.reduce((s,p)=>s+boxVolumeM3(p.length,p.width,p.height),0),usable=usableVolumeFor(spec,settings);candidates.push({spec,packed,packedVol,utilization:usable?packedVol/usable:0,family:specFamily(spec)})}
  if(!candidates.length)return null
  const full=candidates.filter(c=>!c.packed.unpacked.length);if(full.length)return full.sort((a,b)=>Number(a.spec.nominalVolumeM3||usableVolumeFor(a.spec,settings))-Number(b.spec.nominalVolumeM3||usableVolumeFor(b.spec,settings))||b.utilization-a.utilization)[0]
  return candidates.sort((a,b)=>{
    const count=b.packed.placements.length-a.packed.placements.length;if(count)return count
    const vol=b.packedVol-a.packedVol;if(Math.abs(vol)>EPS)return vol
    if(goal==='prefer40'){const d=(b.family==='40')-(a.family==='40');if(d)return d}
    if(goal==='prefer20'){const d=(b.family==='20')-(a.family==='20');if(d)return d}
    return Number(b.spec.nominalVolumeM3||0)-Number(a.spec.nominalVolumeM3||0)
  })[0]
}
function validateLayout(container,settings){
  const ps=container.placements,b=container.bounds,issues=[]
  for(const p of ps)if(p.x<b.minX-EPS||p.y<b.minY-EPS||p.z<b.minZ-EPS||p.x+p.length>b.maxX+EPS||p.y+p.width>b.maxY+EPS||p.z+p.height>b.maxZ+EPS)issues.push(`${p.uid}: 컨테이너 사용 가능 경계 초과`)
  for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const a=ps[i],q=ps[j];const overlap=!(a.x+a.length<=q.x+EPS||q.x+q.length<=a.x+EPS||a.y+a.width<=q.y+EPS||q.y+q.width<=a.y+EPS||a.z+a.height<=q.z+EPS||q.z+q.height<=a.z+EPS);if(overlap)issues.push(`${a.uid} ↔ ${q.uid}: 공간 겹침`)}
  // Deck placements are validated by the deck solver. Non-deck upper placements are not produced by the fast solver.
  return {valid:issues.length===0,issues}
}
function containerAnalytics(container,settings){
  const ps=container.placements,totalWeight=ps.reduce((s,p)=>s+p.weightKg,0),cg=ps.length&&totalWeight>0?{x:ps.reduce((s,p)=>s+(p.x+p.length/2)*p.weightKg,0)/totalWeight,y:ps.reduce((s,p)=>s+(p.y+p.width/2)*p.weightKg,0)/totalWeight,z:ps.reduce((s,p)=>s+(p.z+p.height/2)*p.weightKg,0)/totalWeight}:{x:0,y:0,z:0}
  const floorArea=(container.spec.length*container.spec.width)/1e6,avgFloorLoadKgM2=floorArea?totalWeight/floorArea:0,usedCargoVolumeM3=ps.reduce((s,p)=>s+boxVolumeM3(p.length,p.width,p.height),0)
  const envelope=ps.length?{minX:Math.min(...ps.map(p=>p.x)),minY:Math.min(...ps.map(p=>p.y)),minZ:Math.min(...ps.map(p=>p.z)),maxX:Math.max(...ps.map(p=>p.x+p.length)),maxY:Math.max(...ps.map(p=>p.y+p.width)),maxZ:Math.max(...ps.map(p=>p.z+p.height))}:null
  const blockEnvelopeVolumeM3=envelope?boxVolumeM3(envelope.maxX-envelope.minX,envelope.maxY-envelope.minY,envelope.maxZ-envelope.minZ):0,blockDensity=blockEnvelopeVolumeM3?Math.min(1,usedCargoVolumeM3/blockEnvelopeVolumeM3):0,blockVoidM3=Math.max(0,blockEnvelopeVolumeM3-usedCargoVolumeM3)
  const layoutValidation=validateLayout(container,settings),warnings=[];if(!layoutValidation.valid)warnings.push(`배치 검증: ${layoutValidation.issues.length}건의 기하 조건을 확인하세요.`)
  const limit=Number(settings.maxFloorLoadKgM2||0);if(limit>0&&avgFloorLoadKgM2>limit)warnings.push(`평균 바닥하중 ${avgFloorLoadKgM2.toFixed(0)} kg/m²가 설정 한도 ${limit.toFixed(0)} kg/m²를 초과합니다.`)
  if(totalWeight>0){const nx=cg.x/container.spec.length,ny=cg.y/container.spec.width;if(nx<.25||nx>.75)warnings.push('길이 방향 무게중심이 중앙 50% 범위를 벗어났습니다.');if(ny<.30||ny>.70)warnings.push('좌우 무게중심이 중앙 40% 범위를 벗어났습니다.')}
  return {centerOfGravity:cg,avgFloorLoadKgM2,blockEnvelopeVolumeM3,blockDensity,blockVoidM3,envelope,layoutValidation,warnings}
}
function optimizeSinglePlan(cargo,containerSpecs,settings,goal){
  const start=performance.now(),allUnits=expandCargo(cargo),totalCargoVolumeM3=allUnits.reduce((s,u)=>s+boxVolumeM3(u.length,u.width,u.height),0),totalRawVolumeM3=(cargo||[]).reduce((s,u)=>s+boxVolumeM3(u.length,u.width,u.height)*Math.max(0,Math.floor(Number(u.quantity)||0)),0),totalWeightKg=allUnits.reduce((s,u)=>s+u.weightKg,0),totalRawWeightKg=(cargo||[]).reduce((s,u)=>s+Number(u.weightKg||0)*Math.max(0,Math.floor(Number(u.quantity)||0)),0)
  const nesting=packNestedSpaces(allUnits,settings);let remaining=nesting.remaining
  const topLevelCargoVolumeM3=remaining.reduce((s,u)=>s+boxVolumeM3(u.length,u.width,u.height),0),nestedSavedVolumeM3=totalCargoVolumeM3-topLevelCargoVolumeM3,enabled=containerSpecs.filter(c=>c.enabled&&c.length>0&&c.width>0&&c.height>0&&c.maxPayloadKg>0),containers=[]
  const hardLimit=Math.min(150,Math.max(1,remaining.length+3))
  for(let i=0;i<hardLimit&&remaining.length;i++){
    const best=selectBest(remaining,enabled,settings,goal);if(!best)break
    const ids=new Set(best.packed.placements.map(p=>p.uid));if(!ids.size)break
    const nestedFor=nesting.assignments.filter(a=>ids.has(a.hostUid)),usedVolumeM3=best.packed.placements.reduce((s,p)=>s+boxVolumeM3(p.length,p.width,p.height),0),usedWeightKg=best.packed.usedWeightKg,b=best.packed.bounds,usableVolume=boxVolumeM3(b.length,b.width,b.height)
    const container={index:containers.length+1,spec:best.spec,placements:best.packed.placements,nestedAssignments:nestedFor,deckRegions:best.packed.deckRegions||[],usedVolumeM3,usedWeightKg,usableVolumeM3:usableVolume,volumeUtilization:usableVolume?usedVolumeM3/usableVolume:0,weightUtilization:usedWeightKg/best.spec.maxPayloadKg,remainingVolumeM3:Math.max(0,usableVolume-usedVolumeM3),bounds:b}
    Object.assign(container,containerAnalytics(container,settings));containers.push(container);remaining=remaining.filter(u=>!ids.has(u.uid))
  }
  const nestedAssignedIds=new Set(nesting.assignments.flatMap(a=>a.placements.map(p=>p.uid))),trulyUnpacked=remaining.filter(u=>!nestedAssignedIds.has(u.uid))
  containers.sort((a,b)=>Number(b.spec.nominalVolumeM3||0)-Number(a.spec.nominalVolumeM3||0)||String(a.spec.shortName||a.spec.name).localeCompare(String(b.spec.shortName||b.spec.name)));containers.forEach((c,i)=>c.index=i+1)
  const totalNominalVolumeM3=containers.reduce((s,c)=>s+Number(c.spec.nominalVolumeM3||boxVolumeM3(c.spec.length,c.spec.width,c.spec.height)),0),totalUsableVolumeM3=containers.reduce((s,c)=>s+c.usableVolumeM3,0),totalUsedVolumeM3=containers.reduce((s,c)=>s+c.usedVolumeM3,0),stackedCount=containers.reduce((s,c)=>s+c.placements.filter(p=>p.onDeck||p.z>c.bounds.minZ+EPS).length,0),residualUnits=containers.length?Math.min(...containers.map(c=>c.placements.length)):0
  return {containers,unpacked:trulyUnpacked,nestedAssignments:nesting.assignments,totalCargoVolumeM3,totalRawVolumeM3,topLevelCargoVolumeM3,nestedSavedVolumeM3,totalWeightKg,totalRawWeightKg,packagingWeightKg:Math.max(0,totalWeightKg-totalRawWeightKg),goal,totalNominalVolumeM3,overallUtilization:totalUsableVolumeM3?totalUsedVolumeM3/totalUsableVolumeM3:0,stackedCount,residualUnits,elapsedMs:performance.now()-start}
}
function familyCount(plan,f){return plan.containers.filter(c=>specFamily(c.spec)===f).length}
function comparePlans(a,b,goal){if(a.unpacked.length!==b.unpacked.length)return a.unpacked.length-b.unpacked.length;if(a.containers.length!==b.containers.length)return a.containers.length-b.containers.length;if(goal==='block'||goal==='fewest'){if((a.stackedCount||0)!==(b.stackedCount||0))return (b.stackedCount||0)-(a.stackedCount||0);if((a.residualUnits||0)!==(b.residualUnits||0))return (a.residualUnits||0)-(b.residualUnits||0)}if(Math.abs(a.totalNominalVolumeM3-b.totalNominalVolumeM3)>EPS)return a.totalNominalVolumeM3-b.totalNominalVolumeM3;if(goal==='prefer40'){const d=familyCount(b,'40')-familyCount(a,'40');if(d)return d}if(goal==='prefer20'){const d=familyCount(b,'20')-familyCount(a,'20');if(d)return d}return b.overallUtilization-a.overallUtilization}
function summary(plan){const types={};for(const c of plan.containers)types[c.spec.shortName||c.spec.name]=(types[c.spec.shortName||c.spec.name]||0)+1;return {goal:plan.goal,containerCount:plan.containers.length,unpackedCount:plan.unpacked.length,totalNominalVolumeM3:plan.totalNominalVolumeM3,overallUtilization:plan.overallUtilization,stackedCount:plan.stackedCount||0,residualUnits:plan.residualUnits||0,types}}
function poolVariants(specs){const enabled=specs.filter(c=>c.enabled),out=[];const add=(name,pred)=>{const ids=enabled.filter(pred).map(c=>c.id);if(!ids.length)return;const key=ids.sort().join('|');if(out.some(x=>x.key===key))return;out.push({name,key,specs:specs.map(c=>({...c,enabled:c.enabled&&ids.includes(c.id)}))})};add('all',()=>true);add('standard',c=>!`${c.id||''} ${c.name||''}`.toLowerCase().includes('hc')&&!`${c.name||''}`.toLowerCase().includes('high cube'));return out}
export function optimizePacking(cargo,containerSpecs,settings={}){
  const goal=settings.optimizationGoal||'auto'
  if(goal==='only40'||goal==='only20'){const fam=goal==='only40'?'40':'20',filtered=containerSpecs.map(c=>({...c,enabled:c.enabled&&specFamily(c)===fam})),p=optimizeSinglePlan(cargo,filtered,settings,'fewest');return {...p,goal,requestedGoal:goal,selectedStrategy:goal,selectedPool:fam,alternatives:[summary(p)]}}
  const effective=goal==='auto'?'block':goal,pools=poolVariants(containerSpecs),plans=pools.map(pool=>({...optimizeSinglePlan(cargo,pool.specs,{...settings,optimizationGoal:effective},effective),poolName:pool.name})),best=[...plans].sort((a,b)=>comparePlans(a,b,effective))[0]||optimizeSinglePlan(cargo,containerSpecs,settings,effective)
  return {...best,goal,requestedGoal:goal,selectedStrategy:best.goal,selectedPool:best.poolName||'all',alternatives:[{...summary(best),sourceStrategy:best.goal,pool:best.poolName||'all'}],elapsedMs:plans.reduce((s,p)=>s+(p.elapsedMs||0),0)}
}
