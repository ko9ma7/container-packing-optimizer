export const defaultContainers = [
  { id:'20std', name:'20ft Standard', shortName:'20STD', length:5895, width:2350, height:2392, doorWidth:2340, doorHeight:2292, maxPayloadKg:28230, nominalVolumeM3:33.2, enabled:true },
  { id:'40std', name:'40ft Standard', shortName:'40STD', length:12029, width:2350, height:2392, doorWidth:2340, doorHeight:2292, maxPayloadKg:26700, nominalVolumeM3:67.7, enabled:true },
  { id:'40hc', name:'40ft High Cube', shortName:'40HC', length:12024, width:2350, height:2697, doorWidth:2338, doorHeight:2585, maxPayloadKg:26460, nominalVolumeM3:76.3, enabled:true },
]

export const packagingPresets = {
  bare: { label:'장비 직접 적재', short:'직접 적재', addLength:0, addWidth:0, addHeight:0, tareWeightKg:0, description:'제품/장비 외형 그대로 계산합니다.' },
  woodBlocking: { label:'우드 고정 · 블로킹', short:'우드 고정', addLength:120, addWidth:120, addHeight:80, tareWeightKg:25, description:'목재 받침·스토퍼·블로킹이 차지하는 외형과 중량을 반영합니다.' },
  woodSkid: { label:'우드 스키드', short:'우드 스키드', addLength:100, addWidth:100, addHeight:120, tareWeightKg:35, description:'장비 하부 스키드/받침 구조를 포함한 출하 외형입니다.' },
  woodCrate: { label:'우드 크레이트 · 박스', short:'우드 크레이트', addLength:160, addWidth:160, addHeight:180, tareWeightKg:65, description:'사방 목재 크레이트를 포함한 포장 외형입니다.' },
  pallet: { label:'팔레트 적재', short:'팔레트', addLength:100, addWidth:100, addHeight:140, tareWeightKg:25, description:'팔레트와 고정 밴딩/랩핑 여유를 포함합니다.' },
  steelFrame: { label:'철제 프레임', short:'철제 프레임', addLength:120, addWidth:120, addHeight:100, tareWeightKg:55, description:'철제 베이스/프레임을 포함한 외형과 자중을 반영합니다.' },
  vacuum: { label:'방수·진공 포장', short:'방수/진공', addLength:20, addWidth:20, addHeight:20, tareWeightKg:3, description:'필름·방습 포장 등 얇은 포장층을 반영합니다.' },
  custom: { label:'사용자 지정 포장', short:'사용자 지정', addLength:0, addWidth:0, addHeight:0, tareWeightKg:0, description:'실제 제작 도면 또는 포장업체 확정 치수로 직접 입력합니다.' },
}

const pkg=(type, overrides={})=>({ type, ...packagingPresets[type], ...overrides })

export const sampleCargo = [
  { id:'machine', name:'산업용 장비', length:1800, width:1200, height:1500, weightKg:420, quantity:2, rotation:'locked', orientationRules:{rotate90:false,layWidth:false,layLength:false}, canBeStacked:false, canSupportCargo:false, stackable:false, canBeNested:false, color:'#1f8ef1', packaging:pkg('woodBlocking',{addLength:140,addWidth:140,addHeight:100,tareWeightKg:32}), innerSpace:{ enabled:false, length:0, width:0, height:0, access:'full', maxPayloadKg:0 } },
  { id:'tank-open', name:'상부 개방 탱크', length:1800, width:1200, height:1200, weightKg:180, quantity:2, rotation:'locked', orientationRules:{rotate90:false,layWidth:false,layLength:false}, canBeStacked:false, canSupportCargo:false, stackable:false, canBeNested:false, color:'#11a29b', packaging:pkg('woodSkid',{addLength:80,addWidth:80,addHeight:100,tareWeightKg:28}), innerSpace:{ enabled:true, length:1500, width:900, height:820, access:'top', maxPayloadKg:700 } },
  { id:'box-a', name:'부품 박스 A', length:600, width:400, height:350, weightKg:12, quantity:18, rotation:'locked', orientationRules:{rotate90:false,layWidth:false,layLength:false}, canBeStacked:false, canSupportCargo:false, stackable:false, canBeNested:true, color:'#4f7cff', packaging:pkg('bare'), innerSpace:{ enabled:false, length:0, width:0, height:0, access:'full' } },
  { id:'box-b', name:'부품 박스 B', length:450, width:300, height:250, weightKg:6, quantity:40, rotation:'locked', orientationRules:{rotate90:false,layWidth:false,layLength:false}, canBeStacked:false, canSupportCargo:false, stackable:false, canBeNested:true, color:'#f2b84b', packaging:pkg('bare'), innerSpace:{ enabled:false, length:0, width:0, height:0, access:'full' } },
  { id:'pallet-crate', name:'팔레트 크레이트', length:1100, width:900, height:1000, weightKg:250, quantity:4, rotation:'locked', orientationRules:{rotate90:false,layWidth:false,layLength:false}, canBeStacked:false, canSupportCargo:false, stackable:false, canBeNested:false, color:'#7b61ff', packaging:pkg('woodCrate',{addLength:0,addWidth:0,addHeight:0,tareWeightKg:0}), innerSpace:{ enabled:false, length:0, width:0, height:0, access:'full' } },
]

export const presetSettings = {
  dense:{ itemGap:0, doorClearance:0, rearClearance:0, sideClearance:0, ceilingClearance:0, floorClearance:0, aisleWidth:0, doorPassClearance:0, supportRatio:0.6, useInnerSpaces:true, preferFewerContainers:true, maxLoadHeight:0, maxFloorLoadKgM2:0 },
  practical:{ itemGap:20, doorClearance:50, rearClearance:30, sideClearance:30, ceilingClearance:30, floorClearance:0, aisleWidth:0, doorPassClearance:15, supportRatio:0.75, useInnerSpaces:true, preferFewerContainers:true, maxLoadHeight:0, maxFloorLoadKgM2:0 },
  safe:{ itemGap:40, doorClearance:100, rearClearance:60, sideClearance:50, ceilingClearance:50, floorClearance:0, aisleWidth:0, doorPassClearance:25, supportRatio:0.9, useInnerSpaces:true, preferFewerContainers:true, maxLoadHeight:0, maxFloorLoadKgM2:0 },
}
export const defaultSettings = { preset:'practical', ...presetSettings.practical, optimizationGoal:'auto' }
