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
        rotation:item.rotation,
        orientationRules:item.orientationRules||null,
        canBeStacked:item.canBeStacked===true,
        canSupportCargo:(item.canSupportCargo??item.stackable)===true,
        maxStackLayers:Math.max(1,Math.floor(Number(item.maxStackLayers||1))),
        sameCargoStackOnly:item.sameCargoStackOnly!==false,
        canBeNested:item.canBeNested===true,color:item.color,innerSpace:item.innerSpace,
      })
    }
  })
  return out
}

function resolvedOrientationRules(unit){
  if(unit.orientationRules){
    return {
      rotate90:unit.orientationRules.rotate90===true,
      layWidth:unit.orientationRules.layWidth===true,
      layLength:unit.orientationRules.layLength===true,
    }
  }
  // Backward compatibility with v1-v3 projects / CSVs.
  const mode=unit.rotation||'locked'
  if(mode==='free')return {rotate90:true,layWidth:true,layLength:true}
  if(mode==='upright')return {rotate90:true,layWidth:false,layLength:false}
  if(mode==='layWidth')return {rotate90:true,layWidth:true,layLength:false}
  if(mode==='layLength')return {rotate90:true,layWidth:false,layLength:true}
  return {rotate90:false,layWidth:false,layLength:false}
}

function orientations(unit){
  const d=[unit.length,unit.width,unit.height],r=resolvedOrientationRules(unit)
  const raw=[[d[0],d[1],d[2],'L×W×H','입력 방향']]
  if(r.rotate90)raw.push([d[1],d[0],d[2],'W×L×H','방향 변경 · 높이 유지'])
  if(r.layWidth){
    raw.push([d[0],d[2],d[1],'L×H×W','방향 변경 · 자동'])
    if(r.rotate90)raw.push([d[2],d[0],d[1],'H×L×W','방향 변경 · 자동'])
  }
  if(r.layLength){
    raw.push([d[2],d[1],d[0],'H×W×L','방향 변경 · 자동'])
    if(r.rotate90)raw.push([d[1],d[2],d[0],'W×H×L','방향 변경 · 자동'])
  }
  const seen=new Set()
  return raw.filter(([l,w,h])=>{const k=`${l}|${w}|${h}`;if(seen.has(k))return false;seen.add(k);return true})
    .map(([length,width,height,label,description])=>({length,width,height,label,description}))
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
function supportInfoAt(placements,lookup,unit,x,y,z,l,w,bounds,verticalGap){
  if(z<=bounds.minZ+EPS)return {ratio:1,layer:1,ok:true}
  // A cargo may only leave the floor when the user explicitly allows it.
  if(!unit.canBeStacked)return {ratio:0,layer:2,ok:false}
  const touching=placements.filter(p=>Math.abs(p.z+p.height+verticalGap-z)<=1&&overlapArea(p,x,y,l,w)>0)
  const supporters=touching.filter(p=>{const below=lookup.get(p.uid);return below?.canSupportCargo&&(below.sameCargoStackOnly===false||p.cargoId===unit.cargoId)})
  const supported=supporters.reduce((sum,p)=>sum+overlapArea(p,x,y,l,w),0)
  const ratio=Math.min(1,supported/Math.max(1,l*w))
  if(!supporters.length)return {ratio,layer:2,ok:false}
  let layer=1
  for(const p of supporters){
    const below=lookup.get(p.uid)
    layer=Math.max(layer,Number(p.stackLayer||1)+1)
    if(layer>Math.max(1,Number(below.maxStackLayers||1)))return {ratio,layer,ok:false}
  }
  return {ratio,layer,ok:true}
}
function layerGapFor(z,bounds,settings,unit=null){
  // In CAD/block mode the user may explicitly allow stack-capable packages to
  // touch each other. This is useful for wooden crates/skids that are fixed as
  // one block. It never removes wall/door/ceiling clearances.
  const blockCapable=unit&&(unit.canBeStacked||unit.canSupportCargo)
  if(settings.blockContact===true&&blockCapable)return 0
  return z>bounds.minZ+EPS?Math.max(0,Number(settings.stackItemGap??0)):Math.max(0,Number(settings.itemGap||0))
}

function candidatePointsForOrientation(placements,bounds,settings,verticalGap,o,unit=null){
  const zs=new Set([bounds.minZ])
  placements.forEach(p=>zs.add(p.z+p.height+verticalGap))
  const pts=[], push=(x,y,z)=>{
    if(x<bounds.minX-EPS||y<bounds.minY-EPS||z<bounds.minZ-EPS)return
    if(x+o.length>bounds.maxX+EPS||y+o.width>bounds.maxY+EPS||z+o.height>bounds.maxZ+EPS)return
    pts.push({x,y,z})
  }
  for(const z of zs){
    if(z>bounds.maxZ+EPS)continue
    const gap=layerGapFor(z,bounds,settings,unit)
    const xs=new Set([bounds.minX]),ys=new Set([bounds.minY])
    // Existing item/support edges are useful anchors.
    placements.forEach(p=>{
      xs.add(p.x); xs.add(p.x+p.length+gap); xs.add(p.x+p.length-o.length)
      ys.add(p.y); ys.add(p.y+p.width+gap); ys.add(p.y+p.width-o.width)
    })
    // Orientation-aware grids are the key to CAD-like block/layer filling. They
    // allow a top layer to continue across adjacent support-capable products,
    // instead of being trapped by the first base item's edge points.
    const xAnchors=[bounds.minX,...placements.filter(p=>Math.abs(p.z+p.height+verticalGap-z)<=1).map(p=>p.x)]
    const yAnchors=[bounds.minY,...placements.filter(p=>Math.abs(p.z+p.height+verticalGap-z)<=1).map(p=>p.y)]
    for(const a of xAnchors){
      for(let x=a,k=0;x+o.length<=bounds.maxX+EPS&&k<80;x+=o.length+gap,k++)xs.add(x)
    }
    for(const a of yAnchors){
      for(let y=a,k=0;y+o.width<=bounds.maxY+EPS&&k<30;y+=o.width+gap,k++)ys.add(y)
    }
    for(const x of xs)for(const y of ys)push(x,y,z)
  }
  const uniq=new Map()
  pts.forEach(pt=>uniq.set(`${Math.round(pt.x)}|${Math.round(pt.y)}|${Math.round(pt.z)}`,pt))
  const cap=placements.length>60?220:placements.length>30?340:520
  return [...uniq.values()].sort((a,b)=>a.z-b.z||a.y-b.y||a.x-b.x).slice(0,cap)
}

function orientationFlex(unit){
  const r=resolvedOrientationRules(unit)
  return Number(r.rotate90)+Number(r.layWidth)*2+Number(r.layLength)*2
}
function sortingVariants(units){
  const volume=u=>u.length*u.width*u.height,area=u=>u.length*u.width
  const supportersFirst=[...units].sort((a,b)=>{
    const ar=(a.canSupportCargo?0:a.canBeStacked?2:1),br=(b.canSupportCargo?0:b.canBeStacked?2:1)
    return ar-br||area(b)-area(a)||volume(b)-volume(a)||orientationFlex(a)-orientationFlex(b)
  })
  const inflexibleFirst=[...units].sort((a,b)=>orientationFlex(a)-orientationFlex(b)||area(b)-area(a)||volume(b)-volume(a))
  const variants=[
    {ordered:supportersFirst,mode:'cadStack'},
    {ordered:[...units].sort((a,b)=>volume(b)-volume(a)||b.weightKg-a.weightKg),mode:'balanced'},
    {ordered:[...units].sort((a,b)=>area(b)-area(a)||Math.max(b.length,b.width)-Math.max(a.length,a.width)),mode:'balanced'},
    {ordered:[...units].sort((a,b)=>Math.max(b.length,b.width)-Math.max(a.length,a.width)||area(b)-area(a)),mode:'compact'},
    {ordered:[...units].sort((a,b)=>b.height-a.height||area(b)-area(a)),mode:'compact'},
    {ordered:inflexibleFirst,mode:'cadStack'},
  ]
  const groups=new Map()
  units.forEach(u=>{if(!groups.has(u.cargoId))groups.set(u.cargoId,[]);groups.get(u.cargoId).push(u)})
  const keys=[...groups.keys()].sort((a,b)=>{
    const aa=groups.get(a)[0],bb=groups.get(b)[0]
    return (bb.canSupportCargo?1:0)-(aa.canSupportCargo?1:0)||area(bb)-area(aa)||groups.get(a).length-groups.get(b).length
  })
  const rr=[];let more=true
  while(more){more=false;for(const k of keys){const arr=groups.get(k);if(arr.length){rr.push(arr.shift());more=true}}}
  if(rr.length)variants.push({ordered:rr,mode:'cadStack'})
  return variants
}

function validCandidate(placements,lookup,unit,point,o,dims,bounds,settings,verticalGap){
  if(dims.doorWidth&&dims.doorHeight){
    const pass=Math.max(0,Number(settings.doorPassClearance||0))
    const clearDoorW=Math.max(0,Number(dims.doorWidth)-pass*2),clearDoorH=Math.max(0,Number(dims.doorHeight)-pass)
    if(o.width>clearDoorW+EPS||o.height>clearDoorH+EPS)return null
  }
  if(point.x<bounds.minX-EPS||point.y<bounds.minY-EPS||point.z<bounds.minZ-EPS)return null
  if(point.x+o.length>bounds.maxX+EPS||point.y+o.width>bounds.maxY+EPS||point.z+o.height>bounds.maxZ+EPS)return null
  const gap=layerGapFor(point.z,bounds,settings,unit)
  if(placements.some(p=>intersects(p,point.x,point.y,point.z,o.length,o.width,o.height,gap,verticalGap)))return null
  const support=supportInfoAt(placements,lookup,unit,point.x,point.y,point.z,o.length,o.width,bounds,verticalGap)
  if(support.ratio+EPS<Number(settings.supportRatio||0)||!support.ok)return null
  return support
}

function candidateScore(unit,point,o,support,bounds,gap,mode){
  const onStack=point.z>bounds.minZ+EPS
  const xEnd=point.x+o.length,yEnd=point.y+o.width,zEnd=point.z+o.height
  const compact=(point.z-bounds.minZ)*1_000_000+(point.y-bounds.minY)*1_000+(point.x-bounds.minX)
  const residual=(bounds.maxX-xEnd)+(bounds.maxY-yEnd)+(bounds.maxZ-zEnd)*.12
  const edgeBonus=(Math.abs(point.x-bounds.minX)<1||Math.abs(point.y-bounds.minY)<1)?-20:0
  const availX=bounds.maxX-point.x,availY=bounds.maxY-point.y
  const repeatX=Math.max(0,Math.floor((availX+gap)/(o.length+gap)))
  const repeatY=Math.max(0,Math.floor((availY+gap)/(o.width+gap)))
  const tilePotential=repeatX*repeatY
  let stackBias=0
  if(mode==='cadStack'&&unit.canBeStacked){
    stackBias=onStack?-2_000_000_000:600_000_000
  }else if(mode==='balanced'&&unit.canBeStacked&&onStack){
    stackBias=-250_000_000
  }
  if(unit.canSupportCargo&&onStack&&!unit.canBeStacked)stackBias+=3_000_000_000
  const heightPenalty=zEnd*50
  const futureStackHeightPenalty=(mode==='cadStack'&&unit.canBeStacked&&unit.canSupportCargo&&!onStack)?o.height*500_000:0
  const minOrientationWidth=Math.min(...orientations(unit).map(x=>x.width))
  const remainingStripY=bounds.maxY-(point.y+o.width+gap)
  const mixedStripBonus=(mode==='cadStack'&&unit.canBeStacked&&unit.canSupportCargo&&!onStack&&remainingStripY+EPS>=minOrientationWidth)?-700_000_000:0
  const supportBonus=onStack?-(Math.min(1,support.ratio||0)*100_000):0
  return stackBias+compact+residual+heightPenalty+futureStackHeightPenalty+mixedStripBonus+edgeBonus+supportBonus-tilePotential*100_000
}

function placeUnitsOrdered(units,dims,settings,nestedInsideUid,mode='balanced'){
  const placements=[],unpacked=[];let usedWeightKg=0
  const lookup=new Map(units.map(u=>[u.uid,u])), bounds=boundsFor(dims,settings)
  const gap=Math.max(0,Number(settings.itemGap||0)), verticalGap=Math.max(0,Number(settings.verticalGap||0))
  for(const unit of units){
    if(usedWeightKg+unit.weightKg>Number(dims.maxWeightKg||Number.MAX_SAFE_INTEGER)+EPS){unpacked.push({...unit,unpackedReason:'weight'});continue}
    let best=null
    const os=orientations(unit)
    for(const o of os){
      const pts=candidatePointsForOrientation(placements,bounds,settings,verticalGap,o,unit)
      const valid=[]
      for(const point of pts){
        const support=validCandidate(placements,lookup,unit,point,o,dims,bounds,settings,verticalGap)
        if(support)valid.push({point,support})
      }
      // Prefer an orientation that creates many repeatable valid slots. This
      // prevents a locally-low-height orientation from destroying the rest of
      // an otherwise clean CAD-like row/block.
      const potential=valid.length
      for(const {point,support} of valid){
        const pointGap=layerGapFor(point.z,bounds,settings,unit)
        let score=candidateScore(unit,point,o,support,bounds,pointGap,mode)-potential*350_000
        if(mode==='cadStack'&&unit.canBeStacked&&point.z>bounds.minZ+EPS)score-=750_000_000
        if(!best||score<best.score)best={point,o,score,stackLayer:support.layer,supportRatio:support.ratio}
      }
    }
    if(!best){unpacked.push({...unit,unpackedReason:'space-or-constraints'});continue}
    placements.push({
      uid:unit.uid,cargoId:unit.cargoId,cargoName:unit.cargoName,
      x:best.point.x,y:best.point.y,z:best.point.z,length:best.o.length,width:best.o.width,height:best.o.height,
      rawLength:unit.rawLength,rawWidth:unit.rawWidth,rawHeight:unit.rawHeight,
      weightKg:unit.weightKg,rawWeightKg:unit.rawWeightKg,packageTareWeightKg:unit.packageTareWeightKg,
      packagingType:unit.packagingType,packagingLabel:unit.packagingLabel,
      color:unit.color,orientation:best.o.label,orientationDescription:best.o.description,nestedInsideUid,
      stackLayer:best.stackLayer||1,supportRatio:best.supportRatio||1,maxStackLayers:unit.maxStackLayers||1,
      canBeStacked:unit.canBeStacked,canSupportCargo:unit.canSupportCargo,sameCargoStackOnly:unit.sameCargoStackOnly,
    })
    usedWeightKg+=unit.weightKg
  }
  return {placements,unpacked,usedWeightKg,bounds,mode}
}

function findBestPlacement(unit,placements,lookup,dims,bounds,settings,verticalGap,{onlyFloor=false,onlyStack=false,mode='block'}={}){
  let best=null
  for(const o of orientations(unit)){
    const pts=candidatePointsForOrientation(placements,bounds,settings,verticalGap,o,unit)
    const valid=[]
    for(const point of pts){
      const onStack=point.z>bounds.minZ+EPS
      if(onlyFloor&&onStack)continue
      if(onlyStack&&!onStack)continue
      const support=validCandidate(placements,lookup,unit,point,o,dims,bounds,settings,verticalGap)
      if(support)valid.push({point,support})
    }
    if(!valid.length)continue
    // Count repeatable slots for this exact orientation and layer type. This
    // turns the placement into a layer/block packing decision rather than a
    // single-box local decision.
    const potential=valid.length
    for(const {point,support} of valid){
      const gap=layerGapFor(point.z,bounds,settings,unit)
      let score=candidateScore(unit,point,o,support,bounds,gap,mode)-potential*100_000
      if(point.z>bounds.minZ+EPS){score-=1_500_000_000;score+=o.length*750_000}
      // Prefer lower x/y once orientation density is equivalent, producing
      // CAD-like contiguous rows instead of scattered islands.
      score+=point.x*10+point.y*100+point.z*1000
      if(!best||score<best.score)best={point,o,score,stackLayer:support.layer,supportRatio:support.ratio}
    }
  }
  return best
}

function pushPlacement(placements,unit,best,nestedInsideUid){
  const p={
    uid:unit.uid,cargoId:unit.cargoId,cargoName:unit.cargoName,
    x:best.point.x,y:best.point.y,z:best.point.z,length:best.o.length,width:best.o.width,height:best.o.height,
    rawLength:unit.rawLength,rawWidth:unit.rawWidth,rawHeight:unit.rawHeight,
    weightKg:unit.weightKg,rawWeightKg:unit.rawWeightKg,packageTareWeightKg:unit.packageTareWeightKg,
    packagingType:unit.packagingType,packagingLabel:unit.packagingLabel,
    color:unit.color,orientation:best.o.label,orientationDescription:best.o.description,nestedInsideUid,
    stackLayer:best.stackLayer||1,supportRatio:best.supportRatio||1,maxStackLayers:unit.maxStackLayers||1,
    canBeStacked:unit.canBeStacked,canSupportCargo:unit.canSupportCargo,sameCargoStackOnly:unit.sameCargoStackOnly,
  }
  placements.push(p);return p
}

function groupByCargo(units){
  const map=new Map()
  for(const u of units){if(!map.has(u.cargoId))map.set(u.cargoId,[]);map.get(u.cargoId).push(u)}
  return map
}
function permutations(values,limit=48){
  const out=[]
  function walk(prefix,rest){
    if(out.length>=limit)return
    if(!rest.length){out.push(prefix);return}
    for(let i=0;i<rest.length;i++)walk([...prefix,rest[i]],[...rest.slice(0,i),...rest.slice(i+1)])
  }
  walk([],values)
  return out
}
function supporterOrderVariants(units){
  const grouped=groupByCargo(units),ids=[...grouped.keys()]
  if(!ids.length)return [[]]
  const rep=id=>grouped.get(id)[0], area=u=>u.length*u.width, volume=u=>u.length*u.width*u.height
  const orders=[]
  const add=idsOrder=>{const key=idsOrder.join('|');if(!orders.some(x=>x.key===key))orders.push({key,ids:idsOrder})}
  add([...ids].sort((a,b)=>area(rep(b))-area(rep(a))||volume(rep(b))-volume(rep(a))))
  add([...ids].sort((a,b)=>Math.max(rep(b).length,rep(b).width)-Math.max(rep(a).length,rep(a).width)||area(rep(b))-area(rep(a))))
  add([...ids].sort((a,b)=>grouped.get(b).length-grouped.get(a).length||area(rep(b))-area(rep(a))))
  if(ids.length<=5)for(const order of permutations(ids,36))add(order)
  return orders.map(({ids:order})=>order.flatMap(id=>grouped.get(id)))
}
function stackableOrderVariants(units){
  if(!units.length)return [[]]
  const grouped=groupByCargo(units),ids=[...grouped.keys()], rep=id=>grouped.get(id)[0]
  const footprint=u=>Math.min(...orientations(u).map(o=>o.length*o.width)), volume=u=>u.length*u.width*u.height
  const orders=[]
  const add=order=>{const key=order.join('|');if(!orders.some(x=>x.key===key))orders.push({key,ids:order})}
  add([...ids].sort((a,b)=>footprint(rep(a))-footprint(rep(b))||volume(rep(b))-volume(rep(a))))
  add([...ids].sort((a,b)=>grouped.get(b).length-grouped.get(a).length||footprint(rep(a))-footprint(rep(b))))
  add([...ids].sort((a,b)=>volume(rep(b))-volume(rep(a))))
  return orders.map(({ids:order})=>order.flatMap(id=>grouped.get(id)))
}
function placeUnitsBlockVariant(units,dims,settings,nestedInsideUid,supportersOrder,stackablesOrder){
  const placements=[],unpacked=[];let usedWeightKg=0
  const lookup=new Map(units.map(u=>[u.uid,u])),bounds=boundsFor(dims,settings)
  const verticalGap=Math.max(0,Number(settings.verticalGap||0))
  const placedIds=new Set()
  const canTakeWeight=u=>usedWeightKg+u.weightKg<=Number(dims.maxWeightKg||Number.MAX_SAFE_INTEGER)+EPS
  const placePhase=(ordered,opts)=>{
    for(const unit of ordered){
      if(placedIds.has(unit.uid))continue
      if(!canTakeWeight(unit))continue
      const best=findBestPlacement(unit,placements,lookup,dims,bounds,settings,verticalGap,opts)
      if(!best)continue
      pushPlacement(placements,unit,best,nestedInsideUid);placedIds.add(unit.uid);usedWeightKg+=unit.weightKg
    }
  }
  const floorOnly=[...units].filter(u=>!u.canBeStacked&&!u.canSupportCargo).sort((a,b)=>(b.length*b.width)-(a.length*a.width)||(b.length*b.width*b.height)-(a.length*a.width*a.height))
  // 1) Build a stable lower deck. Different cargo-group orders are tried by
  // the multi-start wrapper so the result is not trapped by one greedy order.
  placePhase(supportersOrder,{onlyFloor:true,mode:'block'})
  placePhase(floorOnly,{onlyFloor:true,mode:'compact'})
  // 2) Reuse the union of all coplanar support-capable top faces. A top item may
  // bridge more than one lower item as long as the configured support ratio is met.
  placePhase(stackablesOrder,{onlyStack:true,mode:'block'})
  // 3) Fill remaining floor/upper slots with the same block-oriented order.
  placePhase(stackablesOrder,{mode:'block'})
  for(const unit of units){
    if(placedIds.has(unit.uid))continue
    unpacked.push({...unit,unpackedReason:canTakeWeight(unit)?'space-or-constraints':'weight'})
  }
  return {placements,unpacked,usedWeightKg,bounds,mode:'block'}
}
function placeUnitsBlock(units,dims,settings,nestedInsideUid){
  const supporters=[...units].filter(u=>u.canSupportCargo)
  const stackables=[...units].filter(u=>u.canBeStacked)
  const supporterVariants=supporterOrderVariants(supporters)
  const stackVariants=stackableOrderVariants(stackables)
  let best=null,runs=0
  const runLimit=units.length>100?4:units.length>60?8:units.length>30?20:24
  for(const so of supporterVariants){
    for(const to of stackVariants){
      const packed=placeUnitsBlockVariant(units,dims,settings,nestedInsideUid,so,to)
      packed.blockVariant=runs++
      if(betterPacked(packed,best))best=packed
      // Keep browser latency bounded. The first variants are deliberate and
      // remaining variants are permutations for escaping local minima.
      if(runs>=runLimit)break
    }
    if(runs>=runLimit)break
  }
  return best||placeUnitsBlockVariant(units,dims,settings,nestedInsideUid,supporters,stackables)
}

function packedScore(packed){
  const vol=packed.placements.reduce((s,p)=>s+boxVolumeM3(p.length,p.width,p.height),0)
  const distinct=new Set(packed.placements.map(p=>p.cargoId)).size
  const stacked=packed.placements.filter(p=>p.z>packed.bounds.minZ+EPS).length
  const floorFootprint=packed.placements.filter(p=>p.z<=packed.bounds.minZ+EPS).reduce((s,p)=>s+p.length*p.width,0)
  const supporters=packed.placements.filter(p=>p.canSupportCargo).length
  return [vol,supporters,stacked,packed.placements.length,distinct,-floorFootprint,-packed.unpacked.length]
}
function betterPacked(a,b){
  if(!b)return true
  const aa=packedScore(a),bb=packedScore(b)
  for(let i=0;i<aa.length;i++){if(Math.abs(aa[i]-bb[i])>EPS)return aa[i]>bb[i]}
  return false
}
function placeUnits(units,dims,settings,nestedInsideUid){
  let best=placeUnitsBlock(units,dims,settings,nestedInsideUid)
  // v9: keep every objective responsive. The block solver already explores
  // multiple cargo-group orders; only small jobs get one additional legacy
  // ordering to escape a local minimum.
  if(units.length<=24&&settings.optimizationGoal!=='auto'&&settings.optimizationGoal!=='block'){
    const variant=sortingVariants(units)[1]
    if(variant){const packed=placeUnitsOrdered(variant.ordered,dims,settings,nestedInsideUid,variant.mode);if(betterPacked(packed,best))best=packed}
  }
  return best||{placements:[],unpacked:[...units],usedWeightKg:0,bounds:boundsFor(dims,settings),mode:'none'}
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
function specFamily(spec){const id=String(spec.id||'').toLowerCase(),name=String(spec.name||'').toLowerCase();if(id.includes('20')||name.includes('20ft'))return '20';if(id.includes('40')||name.includes('40ft'))return '40';return 'other'}
function usableVolumeFor(spec,settings){const b=boundsFor(spec,settings);return boxVolumeM3(Math.max(0,b.maxX-b.minX),Math.max(0,b.maxY-b.minY),Math.max(0,b.maxZ-b.minZ))}
function selectBest(units,specs,settings,goal='fewest'){
  const candidates=specs.map(spec=>{const packed=packOne(units,spec,settings),packedVol=packed.placements.reduce((sum,p)=>sum+boxVolumeM3(p.length,p.width,p.height),0),usable=usableVolumeFor(spec,settings);return{spec,packed,packedVol,utilization:usable?packedVol/usable:0,family:specFamily(spec)}}).filter(c=>c.packed.placements.length)
  if(!candidates.length)return null
  const full=candidates.filter(c=>!c.packed.unpacked.length)
  // If the complete remainder fits, always take the smallest adequate container.
  // This is the important "40ft main + 20ft residual" behavior.
  if(full.length)return [...full].sort((a,b)=>a.spec.nominalVolumeM3-b.spec.nominalVolumeM3||b.utilization-a.utilization)[0]
  const preference=(c)=>goal==='prefer20'?(c.family==='20'?0:c.family==='40'?1:2):goal==='prefer40'?(c.family==='40'?0:c.family==='20'?1:2):0
  return [...candidates].sort((a,b)=>{
    if(goal==='prefer20'||goal==='prefer40'){
      const countDiff=b.packed.placements.length-a.packed.placements.length
      // Never sacrifice a meaningful amount of packed cargo merely to satisfy a family preference.
      if(Math.abs(countDiff)>=2)return countDiff
      const pd=preference(a)-preference(b);if(pd)return pd
      const vd=b.packedVol-a.packedVol;if(Math.abs(vd)>EPS)return vd
      return b.packed.placements.length-a.packed.placements.length
    }
    if(goal==='utilization'){
      const ud=b.utilization-a.utilization;if(Math.abs(ud)>EPS)return ud
      const vd=b.packedVol-a.packedVol;if(Math.abs(vd)>EPS)return vd
      return a.spec.nominalVolumeM3-b.spec.nominalVolumeM3
    }
    const nd=b.packed.placements.length-a.packed.placements.length;if(nd)return nd
    const vd=b.packedVol-a.packedVol;if(Math.abs(vd)>EPS)return vd
    return b.spec.nominalVolumeM3-a.spec.nominalVolumeM3
  })[0]
}

function validateLayout(container,settings){
  const ps=container.placements,b=container.bounds,issues=[]
  for(const p of ps){
    if(p.x<b.minX-EPS||p.y<b.minY-EPS||p.z<b.minZ-EPS||p.x+p.length>b.maxX+EPS||p.y+p.width>b.maxY+EPS||p.z+p.height>b.maxZ+EPS)issues.push(`${p.uid}: 컨테이너 사용 가능 경계 초과`)
  }
  for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
    const a=ps[i],q=ps[j]
    const overlap=!(a.x+a.length<=q.x+EPS||q.x+q.length<=a.x+EPS||a.y+a.width<=q.y+EPS||q.y+q.width<=a.y+EPS||a.z+a.height<=q.z+EPS||q.z+q.height<=a.z+EPS)
    if(overlap)issues.push(`${a.uid} ↔ ${q.uid}: 공간 겹침`)
  }
  const verticalGap=Math.max(0,Number(settings.verticalGap||0)),required=Math.max(0,Math.min(1,Number(settings.supportRatio||0)))
  for(const p of ps){
    if(p.z<=b.minZ+EPS)continue
    const touching=ps.filter(q=>q.uid!==p.uid&&Math.abs(q.z+q.height+verticalGap-p.z)<=1&&overlapArea(q,p.x,p.y,p.length,p.width)>0)
    const supporters=touching.filter(q=>q.canSupportCargo&&(q.sameCargoStackOnly===false||q.cargoId===p.cargoId))
    const supported=supporters.reduce((sum,q)=>sum+overlapArea(q,p.x,p.y,p.length,p.width),0),ratio=Math.min(1,supported/Math.max(1,p.length*p.width))
    if(!supporters.length||ratio+EPS<required)issues.push(`${p.uid}: 상부 지지율 ${(ratio*100).toFixed(1)}%`)
  }
  return {valid:issues.length===0,issues}
}

function containerAnalytics(container,settings){
  const ps=container.placements,totalWeight=ps.reduce((sum,p)=>sum+p.weightKg,0)
  const cg=ps.length&&totalWeight>0?{
    x:ps.reduce((sum,p)=>sum+(p.x+p.length/2)*p.weightKg,0)/totalWeight,
    y:ps.reduce((sum,p)=>sum+(p.y+p.width/2)*p.weightKg,0)/totalWeight,
    z:ps.reduce((sum,p)=>sum+(p.z+p.height/2)*p.weightKg,0)/totalWeight,
  }:{x:0,y:0,z:0}
  const floorAreaM2=(container.spec.length*container.spec.width)/1_000_000
  const avgFloorLoadKgM2=floorAreaM2?totalWeight/floorAreaM2:0
  const usedCargoVolumeM3=ps.reduce((sum,p)=>sum+boxVolumeM3(p.length,p.width,p.height),0)
  const envelope=ps.length?{
    minX:Math.min(...ps.map(p=>p.x)),minY:Math.min(...ps.map(p=>p.y)),minZ:Math.min(...ps.map(p=>p.z)),
    maxX:Math.max(...ps.map(p=>p.x+p.length)),maxY:Math.max(...ps.map(p=>p.y+p.width)),maxZ:Math.max(...ps.map(p=>p.z+p.height)),
  }:null
  const blockEnvelopeVolumeM3=envelope?boxVolumeM3(envelope.maxX-envelope.minX,envelope.maxY-envelope.minY,envelope.maxZ-envelope.minZ):0
  const blockDensity=blockEnvelopeVolumeM3?Math.min(1,usedCargoVolumeM3/blockEnvelopeVolumeM3):0
  const blockVoidM3=Math.max(0,blockEnvelopeVolumeM3-usedCargoVolumeM3)
  const targetFloor=Number(settings.maxFloorLoadKgM2||0)
  const layoutValidation=validateLayout(container,settings),warnings=[]
  if(!layoutValidation.valid)warnings.push(`배치 검증: ${layoutValidation.issues.length}건의 기하/지지 조건을 확인하세요.`)
  if(targetFloor>0&&avgFloorLoadKgM2>targetFloor)warnings.push(`평균 바닥하중 ${avgFloorLoadKgM2.toFixed(0)} kg/m²가 설정 한도 ${targetFloor.toFixed(0)} kg/m²를 초과합니다.`)
  if(totalWeight>0){
    const nx=cg.x/container.spec.length,ny=cg.y/container.spec.width
    if(nx<.25||nx>.75)warnings.push('길이 방향 무게중심이 중앙 50% 범위를 벗어났습니다.')
    if(ny<.30||ny>.70)warnings.push('좌우 무게중심이 중앙 40% 범위를 벗어났습니다.')
  }
  return {centerOfGravity:cg,avgFloorLoadKgM2,blockEnvelopeVolumeM3,blockDensity,blockVoidM3,envelope,layoutValidation,warnings}
}

function optimizeSinglePlan(cargo,containerSpecs,settings,goal){
  const start=performance.now(),allUnits=expandCargo(cargo)
  const totalCargoVolumeM3=allUnits.reduce((sum,u)=>sum+boxVolumeM3(u.length,u.width,u.height),0)
  const totalRawVolumeM3=cargo.reduce((sum,u)=>sum+boxVolumeM3(u.length,u.width,u.height)*Math.max(0,Math.floor(u.quantity)),0)
  const totalWeightKg=allUnits.reduce((sum,u)=>sum+u.weightKg,0),totalRawWeightKg=cargo.reduce((sum,u)=>sum+Number(u.weightKg||0)*Math.max(0,Math.floor(u.quantity)),0)
  const nesting=packNestedSpaces(allUnits,settings);let remaining=nesting.remaining
  const topLevelCargoVolumeM3=remaining.reduce((sum,u)=>sum+boxVolumeM3(u.length,u.width,u.height),0),nestedSavedVolumeM3=totalCargoVolumeM3-topLevelCargoVolumeM3
  const enabled=containerSpecs.filter(c=>c.enabled&&c.length>0&&c.width>0&&c.height>0&&c.maxPayloadKg>0),containers=[]
  const hardLimit=Math.max(1,Math.min(150,allUnits.length+5))
  for(let i=0;i<hardLimit&&remaining.length;i++){
    const best=selectBest(remaining,enabled,settings,goal);if(!best)break
    const ids=new Set(best.packed.placements.map(p=>p.uid)),nestedFor=nesting.assignments.filter(a=>ids.has(a.hostUid))
    const usedVolumeM3=best.packed.placements.reduce((sum,p)=>sum+boxVolumeM3(p.length,p.width,p.height),0),usedWeightKg=best.packed.usedWeightKg
    const b=best.packed.bounds,usableVolume=boxVolumeM3(Math.max(0,b.maxX-b.minX),Math.max(0,b.maxY-b.minY),Math.max(0,b.maxZ-b.minZ))
    const container={index:containers.length+1,spec:best.spec,placements:best.packed.placements,nestedAssignments:nestedFor,usedVolumeM3,usedWeightKg,usableVolumeM3:usableVolume,volumeUtilization:usableVolume?usedVolumeM3/usableVolume:0,weightUtilization:usedWeightKg/best.spec.maxPayloadKg,remainingVolumeM3:Math.max(0,usableVolume-usedVolumeM3),bounds:b}
    Object.assign(container,containerAnalytics(container,settings));containers.push(container)
    remaining=remaining.filter(u=>!ids.has(u.uid))
  }
  const nestedAssignedIds=new Set(nesting.assignments.flatMap(a=>a.placements.map(p=>p.uid)))
  const trulyUnpacked=remaining.filter(u=>!nestedAssignedIds.has(u.uid))
  containers.sort((a,b)=>Number(b.spec.nominalVolumeM3||0)-Number(a.spec.nominalVolumeM3||0)||String(a.spec.shortName||a.spec.name).localeCompare(String(b.spec.shortName||b.spec.name)))
  containers.forEach((c,i)=>{c.index=i+1})
  const totalNominalVolumeM3=containers.reduce((sum,c)=>sum+Number(c.spec.nominalVolumeM3||boxVolumeM3(c.spec.length,c.spec.width,c.spec.height)),0)
  const totalUsableVolumeM3=containers.reduce((sum,c)=>sum+c.usableVolumeM3,0),totalUsedVolumeM3=containers.reduce((sum,c)=>sum+c.usedVolumeM3,0)
  const stackedCount=containers.reduce((sum,c)=>sum+c.placements.filter(p=>p.z>c.bounds.minZ+EPS).length,0)
  const residualUnits=containers.length?Math.min(...containers.map(c=>c.placements.length)):0
  return {containers,unpacked:trulyUnpacked,nestedAssignments:nesting.assignments,totalCargoVolumeM3,totalRawVolumeM3,topLevelCargoVolumeM3,nestedSavedVolumeM3,totalWeightKg,totalRawWeightKg,packagingWeightKg:Math.max(0,totalWeightKg-totalRawWeightKg),goal,totalNominalVolumeM3,overallUtilization:totalUsableVolumeM3?totalUsedVolumeM3/totalUsableVolumeM3:0,stackedCount,residualUnits,elapsedMs:performance.now()-start}
}
function planSummary(plan){const counts={};plan.containers.forEach(c=>counts[c.spec.shortName||c.spec.name]=(counts[c.spec.shortName||c.spec.name]||0)+1);return{goal:plan.goal,containerCount:plan.containers.length,unpackedCount:plan.unpacked.length,totalNominalVolumeM3:plan.totalNominalVolumeM3,overallUtilization:plan.overallUtilization,stackedCount:plan.stackedCount||0,residualUnits:plan.residualUnits||0,types:counts}}
function familyCount(plan,family){return plan.containers.filter(c=>specFamily(c.spec)===family).length}
function comparePlanForGoal(a,b,goal){
  if(a.unpacked.length!==b.unpacked.length)return a.unpacked.length-b.unpacked.length
  if(a.containers.length!==b.containers.length)return a.containers.length-b.containers.length
  // CAD/block mode concentrates cargo in the main containers: maximize real
  // upper-layer use, then minimize the smallest residual load.
  if(goal==='block'||goal==='fewest'){
    if((a.stackedCount||0)!==(b.stackedCount||0))return (b.stackedCount||0)-(a.stackedCount||0)
    if((a.residualUnits||0)!==(b.residualUnits||0))return (a.residualUnits||0)-(b.residualUnits||0)
  }
  // Same number of containers: do not waste a 40ft when a 20ft residual works.
  if(Math.abs(a.totalNominalVolumeM3-b.totalNominalVolumeM3)>EPS)return a.totalNominalVolumeM3-b.totalNominalVolumeM3
  if(goal==='prefer40'){const d=familyCount(b,'40')-familyCount(a,'40');if(d)return d}
  if(goal==='prefer20'){const d=familyCount(b,'20')-familyCount(a,'20');if(d)return d}
  return b.overallUtilization-a.overallUtilization
}
function containerPoolVariants(containerSpecs){
  const enabled=containerSpecs.filter(c=>c.enabled)
  const pools=[]
  const add=(name,pred)=>{const ids=enabled.filter(pred).map(c=>c.id).sort();if(!ids.length)return;const key=ids.join('|');if(pools.some(p=>p.key===key))return;pools.push({name,key,specs:containerSpecs.map(c=>({...c,enabled:c.enabled&&ids.includes(c.id)}))})}
  add('all',()=>true)
  // Compare one practical standard-only pool against all enabled candidates.
  // Extra HC-specific pools were largely redundant and multiplied runtime.
  add('standard',c=>!String(c.id||'').toLowerCase().includes('hc')&&!String(c.name||'').toLowerCase().includes('high cube'))
  return pools
}

export function optimizePacking(cargo,containerSpecs,settings){
  const goal=settings.optimizationGoal||'auto'
  if(goal==='only40'||goal==='only20'){
    const fam=goal==='only40'?'40':'20',filtered=containerSpecs.map(c=>({...c,enabled:c.enabled&&specFamily(c)===fam}))
    const p=optimizeSinglePlan(cargo,filtered,settings,'fewest')
    return {...p,goal,requestedGoal:goal,selectedStrategy:goal,selectedPool:fam,alternatives:[planSummary(p)]}
  }
  const effectiveGoal=goal==='auto'?'block':goal
  const pools=containerPoolVariants(containerSpecs)
  const poolPlans=pools.map(pool=>({...optimizeSinglePlan(cargo,pool.specs,{...settings,optimizationGoal:effectiveGoal},effectiveGoal),poolName:pool.name}))
  const best=[...poolPlans].sort((a,b)=>comparePlanForGoal(a,b,effectiveGoal))[0]||optimizeSinglePlan(cargo,containerSpecs,{...settings,optimizationGoal:effectiveGoal},effectiveGoal)
  // Strategy alternatives are intentionally not precomputed anymore. In v8
  // five additional full 3D searches ran after the selected plan and made a
  // second calculation appear frozen. Users can switch the objective and run
  // it explicitly instead.
  const alternatives=[{...planSummary(best),goal:effectiveGoal,sourceStrategy:best.goal,pool:best.poolName||'all'}]
  return {...best,goal,requestedGoal:goal,selectedStrategy:best.goal,selectedPool:best.poolName||'all',alternatives,elapsedMs:poolPlans.reduce((sum,p)=>sum+(p.elapsedMs||0),0)}
}
