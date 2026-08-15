import { describe, expect, it } from 'vitest'
import {
  CENTER_MIN, clampWidth, computeColumns,
  DETAILS_DEFAULT, DETAILS_MIN, PREVIEW_DEFAULT, PREVIEW_MIN,
  SIDEBAR_COLLAPSED, SIDEBAR_DEFAULT, SIDEBAR_MIN,
} from '@deepseek-ai/dsh-client-ui-layout/src/client/columns.ts'

// Numeric preference form (0 = closed); helpers keep the scenario names readable.
const open = (width: number) => width
const closed = (_width: number) => 0

describe('clampWidth', () => {
  it('clamps into the range and rounds', () => {
    expect(clampWidth(250.4, 240, 420)).toBe(250)
    expect(clampWidth(100, 240, 420)).toBe(240)
    expect(clampWidth(9999, 240, 420)).toBe(420)
  })
})

describe('computeColumns', () => {
  it('step 1: everything fits at preferred widths', () => {
    const cols = computeColumns(1920, open(SIDEBAR_DEFAULT), open(DETAILS_DEFAULT), open(PREVIEW_DEFAULT))
    expect(cols).toEqual({ sidebar: 280, center: 1920 - 280 - 360 - 360, details: 360, preview: 360 })
  })

  it('closed sidebar keeps its compact rail while closed details/preview contribute zero width', () => {
    expect(computeColumns(1920, closed(300), closed(360), closed(360)))
      .toEqual({ sidebar: SIDEBAR_COLLAPSED, center: 1920 - SIDEBAR_COLLAPSED, details: 0, preview: 0 })
  })

  it('preferences beyond the clamp range are clamped before solving', () => {
    // A wide viewport keeps the clamped preview; a narrow one concedes it
    // (covered by the step-2 scenario below).
    const cols = computeColumns(2600, open(9999), open(1), open(9999))
    expect(cols.sidebar).toBe(420)
    expect(cols.details).toBe(300)
    expect(cols.preview).toBe(1200)
    expect(computeColumns(1920, open(1), open(DETAILS_DEFAULT), closed(PREVIEW_DEFAULT)).sidebar).toBe(SIDEBAR_MIN)
  })

  it('step 2: preview shrinks first, center pinned at min', () => {
    // 280 + 360 + 360 + 400 = 1400 > 1350; preview concedes to 1350-280-360-400 = 310.
    const cols = computeColumns(1350, open(SIDEBAR_DEFAULT), open(DETAILS_DEFAULT), open(PREVIEW_DEFAULT))
    expect(cols).toEqual({ sidebar: 280, center: CENTER_MIN, details: 360, preview: 310 })
  })

  it('boundary: exactly at the step-1/step-2 seam', () => {
    const seam = 300 + 360 + 360 + CENTER_MIN
    const cols = computeColumns(seam, open(300), open(360), open(360))
    expect(cols).toEqual({ sidebar: 300, center: CENTER_MIN, details: 360, preview: 360 })
    const one = computeColumns(seam - 1, open(300), open(360), open(360))
    expect(one).toEqual({ sidebar: 300, center: CENTER_MIN, details: 360, preview: 359 })
  })

  it('step 3: preview auto-closes and details absorbs the freed space', () => {
    // Faithful port of the preview-column patch: once preview cannot fit at its
    // minimum, it closes and details takes viewport - s - CENTER_MIN (which can
    // exceed the drag preference in the narrow band where preview+details
    // together starve center).
    const cols = computeColumns(1250, open(SIDEBAR_DEFAULT), open(DETAILS_DEFAULT), open(PREVIEW_DEFAULT))
    expect(cols).toEqual({ sidebar: 280, center: CENTER_MIN, details: 570, preview: 0 })
  })

  it('preview closed: details holds at preference and center absorbs', () => {
    const cols = computeColumns(1250, open(SIDEBAR_DEFAULT), open(DETAILS_DEFAULT), closed(PREVIEW_DEFAULT))
    expect(cols).toEqual({ sidebar: 280, center: 610, details: 360, preview: 0 })
  })

  it('step 4: details + preview auto-close when even their minima starve center — sidebar holds its preference', () => {
    // 280 + 300 + 280 + 400 = 1260 > 900 → both close; center = 900-280 = 620.
    const cols = computeColumns(900, open(SIDEBAR_DEFAULT), open(DETAILS_DEFAULT), open(PREVIEW_DEFAULT))
    expect(cols).toEqual({ sidebar: 280, center: 620, details: 0, preview: 0 })
  })

  it('the sidebar never concedes: center absorbs the deficit below CENTER_MIN', () => {
    // 500 < 280+400: sidebar keeps 280, center takes 220 < CENTER_MIN.
    const cols = computeColumns(500, open(SIDEBAR_DEFAULT), closed(DETAILS_DEFAULT), closed(PREVIEW_DEFAULT))
    expect(cols).toEqual({ sidebar: SIDEBAR_DEFAULT, center: 220, details: 0, preview: 0 })
  })

  it('sidebar-closed narrow window: details/preview concede then auto-close', () => {
    const fits = computeColumns(SIDEBAR_COLLAPSED + DETAILS_MIN + CENTER_MIN, closed(300), open(DETAILS_DEFAULT), closed(PREVIEW_DEFAULT))
    expect(fits).toEqual({ sidebar: SIDEBAR_COLLAPSED, center: CENTER_MIN, details: DETAILS_MIN, preview: 0 })
    const starved = computeColumns(
      SIDEBAR_COLLAPSED + DETAILS_MIN + CENTER_MIN - 1,
      closed(300), open(DETAILS_DEFAULT), closed(PREVIEW_DEFAULT),
    )
    expect(starved).toEqual({
      sidebar: SIDEBAR_COLLAPSED,
      center: DETAILS_MIN + CENTER_MIN - 1,
      details: 0,
      preview: 0,
    })
  })

  it('tiny viewport: details + preview close, sidebar holds, center takes the remainder', () => {
    const cols = computeColumns(400, open(SIDEBAR_DEFAULT), open(DETAILS_DEFAULT), open(PREVIEW_DEFAULT))
    expect(cols.details).toBe(0)
    expect(cols.preview).toBe(0)
    expect(cols.sidebar).toBe(SIDEBAR_DEFAULT)
    expect(cols.center).toBe(Math.max(0, 400 - SIDEBAR_DEFAULT))
  })

  it('recovery is pure: re-widening restores preferred widths untouched', () => {
    const squeezed = computeColumns(900, open(SIDEBAR_DEFAULT), open(DETAILS_DEFAULT), open(PREVIEW_DEFAULT))
    expect(squeezed.details).toBe(0)
    expect(squeezed.preview).toBe(0)
    const restored = computeColumns(1920, open(SIDEBAR_DEFAULT), open(DETAILS_DEFAULT), open(PREVIEW_DEFAULT))
    expect(restored.details).toBe(DETAILS_DEFAULT)
    expect(restored.preview).toBe(PREVIEW_DEFAULT)
    expect(restored.sidebar).toBe(SIDEBAR_DEFAULT)
  })
})

describe('computeColumns — degenerate viewports', () => {
  it('sidebar closed and viewport below CENTER_MIN: details + preview auto-close, center takes the rest', () => {
    // Reaches step 4's auto-close with the compact rail sidebar.
    expect(computeColumns(500, closed(300), open(DETAILS_DEFAULT), open(PREVIEW_DEFAULT)))
      .toEqual({ sidebar: SIDEBAR_COLLAPSED, center: 500 - SIDEBAR_COLLAPSED, details: 0, preview: 0 })
  })

  it('preview preference below its minimum clamps before solving', () => {
    const cols = computeColumns(1920, open(SIDEBAR_DEFAULT), open(DETAILS_DEFAULT), open(PREVIEW_MIN - 100))
    expect(cols.preview).toBe(PREVIEW_MIN)
  })
})
