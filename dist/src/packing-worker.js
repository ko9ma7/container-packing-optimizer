import { optimizePacking } from './packing-fast.js'
self.onmessage=(event)=>{
  try{
    const {cargo,containers,settings}=event.data||{}
    const result=optimizePacking(cargo||[],containers||[],settings||{})
    self.postMessage({ok:true,result})
  }catch(error){
    self.postMessage({ok:false,error:error?.message||String(error)})
  }
}
