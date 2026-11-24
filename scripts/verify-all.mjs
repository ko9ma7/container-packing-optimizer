import fs from 'node:fs'
import { optimizePacking, boxVolumeM3, packedDimensions, packedWeightKg } from '../src/packing-fast.js'
import { defaultContainers, defaultSettings } from '../src/defaults.js'

let totalTests = 0
let passedTests = 0

function assert(condition, message) {
  totalTests++
  if (!condition) {
    console.error(`❌ FAIL: ${message}`)
    throw new Error(message)
  }
  passedTests++
  console.log(`  ✓ ${message}`)
}

console.log('=== Container Packing Optimizer 종합 정밀 검증 스위트 ===\n')

// 1. 기본 계산 공식 검증
console.log('[Test Group 1] 단위 및 치수 계산 기본 검증')
{
  const vol = boxVolumeM3(1000, 1000, 1000)
  assert(Math.abs(vol - 1.0) < 1e-6, '1,000mm x 1,000mm x 1,000mm = 정확히 1.0 m³ 체적')

  const item = {
    length: 1200, width: 800, height: 1000, weightKg: 200,
    packaging: { type: 'woodCrate', addLength: 160, addWidth: 160, addHeight: 180, tareWeightKg: 65 }
  }
  const dims = packedDimensions(item)
  const weight = packedWeightKg(item)
  assert(dims.length === 1360 && dims.width === 960 && dims.height === 1180, '포장 여유 치수 가산 검증 (1360 x 960 x 1180 mm)')
  assert(weight === 265, '포장 자중 가산 검증 (200 + 65 = 265 kg)')

  const itemOverride = {
    length: 1200, width: 800, height: 1000, weightKg: 200,
    packaging: { overrideOuter: true, outerLength: 1500, outerWidth: 1000, outerHeight: 1200, tareWeightKg: 50 }
  }
  const dimsO = packedDimensions(itemOverride)
  assert(dimsO.length === 1500 && dimsO.width === 1000 && dimsO.height === 1200, '포장 외형 직접 입력(override) 적용 검증')
}

// 2. 도어 개구부 치수 통과 검증
console.log('\n[Test Group 2] 컨테이너 도어 개구부 및 진입 제한 검증')
{
  // 20STD 도어: width 2340, height 2292
  const oversizedItem = [{
    id: 'too-tall',
    name: '도어 높이 초과 화물',
    length: 1500, width: 1500, height: 2350, weightKg: 500, quantity: 1,
    rotation: 'locked', orientationRules: { rotate90: false, layWidth: false, layLength: false },
    canBeStacked: false, canSupportCargo: false, stackable: false
  }]
  const containers = defaultContainers.filter(c => c.id === '20std')
  const res = optimizePacking(oversizedItem, containers, defaultSettings)
  assert(res.unpacked.length === 1, '도어 높이(2292mm)를 초과하는 화물(2350mm)은 미적재 처리됨')
}

// 3. 컨테이너 최대 적재중량(Payload) 한도 검증
console.log('\n[Test Group 3] 컨테이너 최대 적재중량(Payload) 한도 초과 검증')
{
  const heavyItem = [{
    id: 'heavy-machine',
    name: '초중량 장비',
    length: 2000, width: 2000, height: 1500, weightKg: 30000, quantity: 1,
    rotation: 'locked', canBeStacked: false, canSupportCargo: false
  }]
  // 20STD maxPayloadKg: 28230 kg
  const containers = defaultContainers.filter(c => c.id === '20std')
  const res = optimizePacking(heavyItem, containers, defaultSettings)
  assert(res.unpacked.length === 1, '최대 적재중량(28,230kg)을 초과하는 화물(30,000kg)은 안전하게 미적재 처리됨')
}

// 4. CAD 실도면 회귀 검증
console.log('\n[Test Group 4] CAD 실도면 회귀 데이터 배치 검증 (examples/user-cad-block-v7.json)')
{
  const project = JSON.parse(fs.readFileSync(new URL('../examples/user-cad-block-v7.json', import.meta.url), 'utf8'))
  project.settings = { ...project.settings, useDeckBoards: true, deckBridgeGap: 150 }
  const result = optimizePacking(project.cargo, project.containers, project.settings)
  const types = result.containers.map(c => c.spec.shortName)
  assert(JSON.stringify(types) === JSON.stringify(['40STD', '40STD', '20STD']), '40STD x 2 + 20STD x 1 컨테이너 조합 일치')
  assert(result.unpacked.length === 0, '모든 화물이 100% 누락 없이 적재됨 (unpacked = 0)')
  assert(result.containers.every(c => c.layoutValidation.valid), '모든 컨테이너의 3D 공간 기하 무결성 검증 통과 (충돌 0, 경계 이탈 0)')
}

// 5. Nested & Deck 회귀 검증
console.log('\n[Test Group 5] 내부 공간(Nested) 및 2단 적층(Deck) 동시 검증')
{
  const project = JSON.parse(fs.readFileSync(new URL('../examples/nested-deck-project.json', import.meta.url), 'utf8'))
  const result = optimizePacking(project.cargo, project.containers, project.settings)
  const nested = result.nestedAssignments.reduce((s, a) => s + a.placements.length, 0)
  const deck = result.containers.reduce((s, c) => s + c.placements.filter(p => p.onDeck).length, 0)
  assert(result.unpacked.length === 0, '모든 화물 적재 완료')
  assert(nested >= 30, `탱크 내부 공간 활용 30개 이상 충족 (실제: ${nested}개)`)
  assert(deck >= 10, `데크 상부 적층 10개 이상 충족 (실제: ${deck}개)`)
}

// 6. 무게중심(Center of Gravity) 안전성 판정 공식 검증
console.log('\n[Test Group 6] 무게중심(C.G.) 계산 및 ISO 1496 안전 기준 검증')
{
  const symmetricCargo = [
    { id: 'c1', name: '앞쪽 화물', length: 2000, width: 2000, height: 1500, weightKg: 5000, quantity: 1, rotation: 'locked', canBeStacked: false, canSupportCargo: false },
    { id: 'c2', name: '뒤쪽 화물', length: 2000, width: 2000, height: 1500, weightKg: 5000, quantity: 1, rotation: 'locked', canBeStacked: false, canSupportCargo: false },
  ]
  const containers = defaultContainers.filter(c => c.id === '20std')
  const res = optimizePacking(symmetricCargo, containers, defaultSettings)
  const c = res.containers[0]
  assert(c && c.centerOfGravity, '무게중심 계산값 도출 확인')
  assert(c.centerOfGravity.x > 0 && c.centerOfGravity.y > 0 && c.centerOfGravity.z > 0, `C.G. 좌표 유효성 확인: X=${c.centerOfGravity.x.toFixed(1)}, Y=${c.centerOfGravity.y.toFixed(1)}, Z=${c.centerOfGravity.z.toFixed(1)} mm`)
  const nx = c.centerOfGravity.x / c.spec.length
  const ny = c.centerOfGravity.y / c.spec.width
  assert(nx >= 0.25 && nx <= 0.75, `X축 무게중심이 중앙 50% 안전 영역 내부임 (현재: ${(nx*100).toFixed(1)}%)`)
  assert(ny >= 0.30 && ny <= 0.70, `Y축 무게중심이 중앙 40% 안전 영역 내부임 (현재: ${(ny*100).toFixed(1)}%)`)
}

console.log(`\n========================================`)
console.log(`🎉 모든 검증 테스트 통과! (${passedTests} / ${totalTests} Passed)`)
console.log(`========================================`)
