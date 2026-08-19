import fs from 'node:fs'
import { optimizePacking } from '../src/packing.js'
const project=JSON.parse(fs.readFileSync(new URL('../examples/user-cad-block-v7.json', import.meta.url),'utf8'))
const result=optimizePacking(project.cargo,project.containers,project.settings)
const types=result.containers.map(c=>c.spec.shortName)
const last=result.containers.at(-1)
const lastOneStage=last?.placements.filter(p=>p.cargoName==='1단 수세').length||0
const valid=result.containers.every(c=>c.layoutValidation?.valid!==false)
if(JSON.stringify(types)!==JSON.stringify(['40STD','40STD','20STD'])||lastOneStage!==2||result.unpacked.length!==0||!valid){
  console.error({types,lastOneStage,unpacked:result.unpacked.length,valid,issues:result.containers.map(c=>c.layoutValidation?.issues)})
  process.exit(1)
}
console.log('CAD regression OK:',types.join(' + '),'20STD 1단 수세',lastOneStage,'개','layout validation OK')
