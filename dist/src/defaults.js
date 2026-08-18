export const defaultContainers = [
  { id:'20std', name:'20ft Standard', shortName:'20STD', length:5895, width:2350, height:2392, doorWidth:2340, doorHeight:2292, maxPayloadKg:28230, nominalVolumeM3:33.2, enabled:true },
  { id:'40std', name:'40ft Standard', shortName:'40STD', length:12029, width:2350, height:2392, doorWidth:2340, doorHeight:2292, maxPayloadKg:26700, nominalVolumeM3:67.7, enabled:true },
  { id:'40hc', name:'40ft High Cube', shortName:'40HC', length:12024, width:2350, height:2697, doorWidth:2338, doorHeight:2585, maxPayloadKg:26460, nominalVolumeM3:76.3, enabled:true },
]

export const sampleCargo = [
  { id:'tank-open', name:'상부 개방 탱크', length:1800, width:1200, height:1200, weightKg:180, quantity:2, rotation:'upright', stackable:false, canBeNested:false, color:'#0f8b8d', innerSpace:{ enabled:true, length:1500, width:900, height:820, access:'top', maxPayloadKg:700 } },
  { id:'box-a', name:'박스 A', length:600, width:400, height:350, weightKg:12, quantity:18, rotation:'free', stackable:true, canBeNested:true, color:'#2f80ed', innerSpace:{ enabled:false, length:0, width:0, height:0, access:'full' } },
  { id:'box-b', name:'박스 B', length:450, width:300, height:250, weightKg:6, quantity:40, rotation:'free', stackable:true, canBeNested:true, color:'#f2b84b', innerSpace:{ enabled:false, length:0, width:0, height:0, access:'full' } },
  { id:'pallet-crate', name:'팔레트 크레이트', length:1100, width:900, height:1000, weightKg:250, quantity:4, rotation:'upright', stackable:true, canBeNested:false, color:'#7b61ff', innerSpace:{ enabled:false, length:0, width:0, height:0, access:'full' } },
]

export const presetSettings = {
  dense:{ itemGap:0, wallClearance:0, supportRatio:0.6, useInnerSpaces:true, preferFewerContainers:true },
  practical:{ itemGap:10, wallClearance:20, supportRatio:0.75, useInnerSpaces:true, preferFewerContainers:true },
  safe:{ itemGap:30, wallClearance:50, supportRatio:0.9, useInnerSpaces:true, preferFewerContainers:true },
}
export const defaultSettings = { preset:'practical', ...presetSettings.practical }
