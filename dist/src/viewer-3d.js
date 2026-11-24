// Container Fit - Interactive 3D Canvas Engine
// Pure vanilla JS 3D wireframe & shaded polyhedral renderer with orbit control

export class Container3DViewer {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.container = null
    this.settings = {}
    this.options = options

    // Camera Orbit State
    this.yaw = options.yaw ?? -40 // deg
    this.pitch = options.pitch ?? 28 // deg
    this.zoom = options.zoom ?? 1.0
    this.panX = 0
    this.panY = 0

    // Layers & Display State
    this.showCg = options.showCg ?? true
    this.showHeatmap = options.showHeatmap ?? false
    this.showClearances = options.showClearances ?? false
    this.showSupport = options.showSupport ?? true
    this.stepIndex = options.stepIndex ?? -1 // -1 means all
    this.selectedUid = options.selectedUid ?? null

    // Interaction State
    this.isDragging = false
    this.dragButton = 0
    this.lastMouseX = 0
    this.lastMouseY = 0
    this.onSelect = options.onSelect || null

    this._bindEvents()
    this.resize()
  }

  setContainer(container, settings = {}) {
    this.container = container
    this.settings = settings
    this.render()
  }

  setLayers({ cg, heatmap, clearances, support }) {
    if (cg !== undefined) this.showCg = cg
    if (heatmap !== undefined) this.showHeatmap = heatmap
    if (clearances !== undefined) this.showClearances = clearances
    if (support !== undefined) this.showSupport = support
    this.render()
  }

  setStep(index) {
    this.stepIndex = index
    this.render()
  }

  setSelected(uid) {
    this.selectedUid = uid
    this.render()
  }

  resetView(preset = 'iso') {
    if (preset === 'top') {
      this.yaw = 0
      this.pitch = 89.9
      this.panX = 0
      this.panY = 0
      this.zoom = 1.0
    } else if (preset === 'side') {
      this.yaw = -90
      this.pitch = 0
      this.panX = 0
      this.panY = 0
      this.zoom = 1.0
    } else if (preset === 'front') {
      this.yaw = 0
      this.pitch = 0
      this.panX = 0
      this.panY = 0
      this.zoom = 1.0
    } else {
      // iso
      this.yaw = -40
      this.pitch = 28
      this.panX = 0
      this.panY = 0
      this.zoom = 1.0
    }
    this.render()
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = Math.max(300, Math.floor(rect.width * dpr))
    this.canvas.height = Math.max(200, Math.floor(rect.height * dpr))
    this.ctx.scale(dpr, dpr)
    this.render()
  }

  _bindEvents() {
    const c = this.canvas
    c.addEventListener('contextmenu', e => e.preventDefault())

    c.addEventListener('mousedown', e => {
      this.isDragging = true
      this.dragButton = e.button
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
    })

    window.addEventListener('mousemove', e => {
      if (!this.isDragging) return
      const dx = e.clientX - this.lastMouseX
      const dy = e.clientY - this.lastMouseY
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY

      if (this.dragButton === 0 && !e.shiftKey) {
        // Orbit Rotate
        this.yaw += dx * 0.45
        this.pitch = Math.max(-85, Math.min(85, this.pitch + dy * 0.45))
      } else {
        // Pan
        this.panX += dx
        this.panY += dy
      }
      this.render()
    })

    window.addEventListener('mouseup', () => {
      this.isDragging = false
    })

    c.addEventListener('wheel', e => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.08 : 0.92
      this.zoom = Math.max(0.35, Math.min(4.0, this.zoom * factor))
      this.render()
    }, { passive: false })

    // Touch events for mobile
    let lastTouchDist = 0
    c.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        this.isDragging = true
        this.dragButton = 0
        this.lastMouseX = e.touches[0].clientX
        this.lastMouseY = e.touches[0].clientY
      } else if (e.touches.length === 2) {
        this.isDragging = false
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastTouchDist = Math.hypot(dx, dy)
      }
    })

    c.addEventListener('touchmove', e => {
      if (e.touches.length === 1 && this.isDragging) {
        const dx = e.touches[0].clientX - this.lastMouseX
        const dy = e.touches[0].clientY - this.lastMouseY
        this.lastMouseX = e.touches[0].clientX
        this.lastMouseY = e.touches[0].clientY
        this.yaw += dx * 0.45
        this.pitch = Math.max(-85, Math.min(85, this.pitch + dy * 0.45))
        this.render()
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        if (lastTouchDist > 0) {
          const factor = dist / lastTouchDist
          this.zoom = Math.max(0.35, Math.min(4.0, this.zoom * factor))
          this.render()
        }
        lastTouchDist = dist
      }
    }, { passive: true })

    c.addEventListener('touchend', () => {
      this.isDragging = false
      lastTouchDist = 0
    })

    // Click Hit-test
    c.addEventListener('click', e => {
      const rect = c.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const hit = this._hitTest(mx, my)
      if (hit && this.onSelect) {
        this.onSelect(hit)
      }
    })
  }

  _project(x, y, z, cx, cy, cz, scale, w, h) {
    // Center relative coordinates
    const rx = x - cx
    const ry = y - cy
    const rz = z - cz

    const radY = (this.yaw * Math.PI) / 180
    const radP = (this.pitch * Math.PI) / 180

    // Rotate around Z (yaw)
    const x1 = rx * Math.cos(radY) - ry * Math.sin(radY)
    const y1 = rx * Math.sin(radY) + ry * Math.cos(radY)
    const z1 = rz

    // Rotate around X (pitch)
    const x2 = x1
    const y2 = y1 * Math.cos(radP) - z1 * Math.sin(radP)
    const z2 = y1 * Math.sin(radP) + z1 * Math.cos(radP)

    // Perspective factor
    const cameraDist = 18000
    const fov = cameraDist / (cameraDist + y2)

    const screenX = w / 2 + (x2 * scale * fov * this.zoom) + this.panX
    const screenY = h / 2 - (z2 * scale * fov * this.zoom) + this.panY

    return { x: screenX, y: screenY, depth: y2 }
  }

  render() {
    const ctx = this.ctx
    const rect = this.canvas.getBoundingClientRect()
    const w = rect.width
    const h = rect.height
    ctx.clearRect(0, 0, w, h)

    if (!this.container) {
      ctx.fillStyle = '#6e8598'
      ctx.font = '13px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('컨테이너 데이터가 없습니다.', w / 2, h / 2)
      return
    }

    const spec = this.container.spec
    const cx = spec.length / 2
    const cy = spec.width / 2
    const cz = spec.height / 2

    // Auto fit scale
    const baseDimension = Math.hypot(spec.length, spec.width, spec.height)
    const scale = (Math.min(w, h) * 0.72) / baseDimension

    const pr = (x, y, z) => this._project(x, y, z, cx, cy, cz, scale, w, h)

    // 1. Draw floor grid & outline
    this._drawFloor(ctx, spec, pr)

    // 2. Draw Floor Heatmap if enabled
    if (this.showHeatmap && this.container.heatmap) {
      this._drawHeatmap(ctx, spec, this.container.heatmap, pr)
    }

    // 3. Draw ISO Safe CG Boundary on floor
    if (this.showCg) {
      this._drawCgSafetyZone(ctx, spec, pr)
    }

    // 4. Draw Clearances Guide if enabled
    if (this.showClearances && this.container.bounds) {
      this._drawClearances(ctx, spec, this.container.bounds, pr)
    }

    // 5. Gather and filter placements by stepIndex
    let visiblePlacements = this.container.placements || []
    if (this.stepIndex >= 0) {
      // Sort by loading sequence
      const seq = this.container.loadingSequence || []
      const allowedUids = new Set(seq.slice(0, this.stepIndex + 1).map(s => s.uid))
      visiblePlacements = visiblePlacements.filter(p => allowedUids.has(p.uid))
    }

    // 6. Build polyhedral faces for 3D box sorting (Painter's algorithm)
    const faces = []
    for (const p of visiblePlacements) {
      const isSelected = p.uid === this.selectedUid
      this._createBoxFaces(faces, p, pr, isSelected)
    }

    // Sort faces by average depth (farthest first)
    faces.sort((a, b) => b.depth - a.depth)

    // Render faces
    for (const f of faces) {
      ctx.beginPath()
      ctx.moveTo(f.points[0].x, f.points[0].y)
      for (let i = 1; i < f.points.length; i++) {
        ctx.lineTo(f.points[i].x, f.points[i].y)
      }
      ctx.closePath()

      ctx.fillStyle = f.fill
      ctx.fill()

      ctx.strokeStyle = f.stroke
      ctx.lineWidth = f.strokeWidth
      ctx.stroke()
    }

    // 7. Draw container wireframe bounding box
    this._drawContainerBox(ctx, spec, pr)

    // 8. Draw Center of Gravity (C.G.) sphere & markers
    if (this.showCg && this.container.centerOfGravity && this.container.placements.length > 0) {
      this._drawCgMarker(ctx, spec, this.container.centerOfGravity, pr)
    }

    // Store projected items for hit testing
    this._renderedItems = visiblePlacements.map(p => {
      const center = pr(p.x + p.length / 2, p.y + p.width / 2, p.z + p.height / 2)
      return { p, center }
    })
  }

  _drawFloor(ctx, spec, pr) {
    const c1 = pr(0, 0, 0)
    const c2 = pr(spec.length, 0, 0)
    const c3 = pr(spec.length, spec.width, 0)
    const c4 = pr(0, spec.width, 0)

    ctx.beginPath()
    ctx.moveTo(c1.x, c1.y)
    ctx.lineTo(c2.x, c2.y)
    ctx.lineTo(c3.x, c3.y)
    ctx.lineTo(c4.x, c4.y)
    ctx.closePath()

    ctx.fillStyle = '#e8f0f6'
    ctx.fill()
    ctx.strokeStyle = '#b0c7d8'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Sub-grids on floor (every 2m)
    ctx.strokeStyle = 'rgba(176, 199, 216, 0.45)'
    ctx.lineWidth = 1
    const gridStep = 2000
    for (let x = gridStep; x < spec.length; x += gridStep) {
      const p1 = pr(x, 0, 0)
      const p2 = pr(x, spec.width, 0)
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
    }
  }

  _drawCgSafetyZone(ctx, spec, pr) {
    // ISO 1496 C.G. Safe Zone: Length 25% ~ 75%, Width 30% ~ 70%
    const minX = spec.length * 0.25
    const maxX = spec.length * 0.75
    const minY = spec.width * 0.30
    const maxY = spec.width * 0.70

    const z1 = pr(minX, minY, 0)
    const z2 = pr(maxX, minY, 0)
    const z3 = pr(maxX, maxY, 0)
    const z4 = pr(minX, maxY, 0)

    ctx.beginPath()
    ctx.moveTo(z1.x, z1.y)
    ctx.lineTo(z2.x, z2.y)
    ctx.lineTo(z3.x, z3.y)
    ctx.lineTo(z4.x, z4.y)
    ctx.closePath()

    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 3])
    ctx.stroke()
    ctx.setLineDash([])
  }

  _drawHeatmap(ctx, spec, heatmap, pr) {
    const { gridX, gridY, cellL, cellW, matrix, maxCellLoad } = heatmap
    if (!maxCellLoad) return

    for (let y = 0; y < gridY; y++) {
      for (let x = 0; x < gridX; x++) {
        const val = matrix[y][x]
        if (val <= 0) continue

        const ratio = Math.min(1, val / maxCellLoad)
        // Green -> Yellow -> Red
        const r = Math.round(ratio > 0.5 ? 255 : ratio * 2 * 255)
        const g = Math.round(ratio < 0.5 ? 200 : (1 - (ratio - 0.5) * 2) * 200)
        const fill = `rgba(${r}, ${g}, 40, ${0.15 + ratio * 0.45})`

        const p1 = pr(x * cellL, y * cellW, 2)
        const p2 = pr((x + 1) * cellL, y * cellW, 2)
        const p3 = pr((x + 1) * cellL, (y + 1) * cellW, 2)
        const p4 = pr(x * cellL, (y + 1) * cellW, 2)

        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.lineTo(p3.x, p3.y)
        ctx.lineTo(p4.x, p4.y)
        ctx.closePath()
        ctx.fillStyle = fill
        ctx.fill()
      }
    }
  }

  _drawClearances(ctx, spec, b, pr) {
    // Usable bounds box
    const p1 = pr(b.minX, b.minY, b.minZ)
    const p2 = pr(b.maxX, b.minY, b.minZ)
    const p3 = pr(b.maxX, b.maxY, b.minZ)
    const p4 = pr(b.minX, b.maxY, b.minZ)
    const t1 = pr(b.minX, b.minY, b.maxZ)
    const t2 = pr(b.maxX, b.minY, b.maxZ)
    const t3 = pr(b.maxX, b.maxY, b.maxZ)
    const t4 = pr(b.minX, b.maxY, b.maxZ)

    ctx.strokeStyle = 'rgba(44, 131, 236, 0.6)'
    ctx.lineWidth = 1.2
    ctx.setLineDash([5, 4])

    const edges = [
      [p1, p2], [p2, p3], [p3, p4], [p4, p1],
      [t1, t2], [t2, t3], [t3, t4], [t4, t1],
      [p1, t1], [p2, t2], [p3, t3], [p4, t4]
    ]
    for (const [a, b] of edges) {
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
    ctx.setLineDash([])
  }

  _createBoxFaces(faces, p, pr, isSelected) {
    const x0 = p.x, x1 = p.x + p.length
    const y0 = p.y, y1 = p.y + p.width
    const z0 = p.z, z1 = p.z + p.height

    const c000 = pr(x0, y0, z0)
    const c100 = pr(x1, y0, z0)
    const c110 = pr(x1, y1, z0)
    const c010 = pr(x0, y1, z0)
    const c001 = pr(x0, y0, z1)
    const c101 = pr(x1, y0, z1)
    const c111 = pr(x1, y1, z1)
    const c011 = pr(x0, y1, z1)

    const baseColor = p.color || '#2f80ed'
    const stroke = isSelected ? '#f59e0b' : 'rgba(10, 30, 50, 0.45)'
    const strokeWidth = isSelected ? 2.5 : 1

    const addFace = (pts, shadeFactor) => {
      const avgDepth = (pts[0].depth + pts[1].depth + pts[2].depth + pts[3].depth) / 4
      faces.push({
        points: pts,
        depth: avgDepth,
        fill: isSelected ? this._hexShade('#eab308', shadeFactor) : this._hexShade(baseColor, shadeFactor),
        stroke,
        strokeWidth,
        uid: p.uid
      })
    }

    // 6 Faces with directional shading
    addFace([c001, c101, c111, c011], 20)  // Top (+Z)
    addFace([c100, c110, c111, c101], -22) // Right (+X)
    addFace([c010, c110, c111, c011], -35) // Front (+Y)
    addFace([c000, c100, c101, c001], -12) // Back (-Y)
    addFace([c000, c010, c011, c001], -28) // Left (-X)
    addFace([c000, c100, c110, c010], -45) // Bottom (-Z)
  }

  _drawContainerBox(ctx, spec, pr) {
    const c000 = pr(0, 0, 0)
    const c100 = pr(spec.length, 0, 0)
    const c110 = pr(spec.length, spec.width, 0)
    const c010 = pr(0, spec.width, 0)
    const c001 = pr(0, 0, spec.height)
    const c101 = pr(spec.length, 0, spec.height)
    const c111 = pr(spec.length, spec.width, spec.height)
    const c011 = pr(0, spec.width, spec.height)

    ctx.strokeStyle = '#476379'
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 5])

    const edges = [
      [c000, c100], [c100, c110], [c110, c010], [c010, c000],
      [c001, c101], [c101, c111], [c111, c011], [c011, c001],
      [c000, c001], [c100, c101], [c110, c111], [c010, c011]
    ]

    for (const [a, b] of edges) {
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
    ctx.setLineDash([])

    // Door indicator label
    const doorCenter = pr(0, spec.width / 2, 0)
    ctx.fillStyle = '#2c5270'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('▲ DOOR (출입문)', doorCenter.x, doorCenter.y + 16)
  }

  _drawCgMarker(ctx, spec, cg, pr) {
    const p3d = pr(cg.x, cg.y, cg.z)
    const pFloor = pr(cg.x, cg.y, 0)

    // Vertical line from floor to CG point
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 1.8
    ctx.setLineDash([4, 3])
    ctx.beginPath()
    ctx.moveTo(pFloor.x, pFloor.y)
    ctx.lineTo(p3d.x, p3d.y)
    ctx.stroke()
    ctx.setLineDash([])

    // Floor projected cross
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(pFloor.x - 7, pFloor.y)
    ctx.lineTo(pFloor.x + 7, pFloor.y)
    ctx.moveTo(pFloor.x, pFloor.y - 7)
    ctx.lineTo(pFloor.x, pFloor.y + 7)
    ctx.stroke()

    // 3D CG Sphere
    ctx.beginPath()
    ctx.arc(p3d.x, p3d.y, 6.5, 0, Math.PI * 2)
    ctx.fillStyle = '#ef4444'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    // CG Label
    ctx.fillStyle = '#b91c1c'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`C.G. (${Math.round(cg.x)}, ${Math.round(cg.y)}, ${Math.round(cg.z)})`, p3d.x + 9, p3d.y + 4)
  }

  _hitTest(mx, my) {
    if (!this._renderedItems) return null
    // Find closest item center within threshold
    let closest = null
    let minDist = 32
    for (const item of this._renderedItems) {
      const d = Math.hypot(item.center.x - mx, item.center.y - my)
      if (d < minDist) {
        minDist = d
        closest = item.p
      }
    }
    return closest
  }

  _hexShade(hex, amt) {
    let c = String(hex || '#2f80ed').replace('#', '')
    if (c.length === 3) c = c.split('').map(x => x + x).join('')
    const n = parseInt(c, 16) || 0
    const r = Math.min(255, Math.max(0, (n >> 16) + amt))
    const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt))
    const b = Math.min(255, Math.max(0, (n & 255) + amt))
    return `rgb(${r},${g},${b})`
  }
}
