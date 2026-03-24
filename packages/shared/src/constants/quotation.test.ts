import { describe, it, expect } from 'vitest'
import {
  RATE_TYPES,
  RESPONSIBILITY_OPTIONS,
  DEPOSIT_DECORATION_OPTIONS,
  DURATION_UNITS,
  RENT_CALC_UNITS,
} from './quotation'

describe('RATE_TYPES', () => {
  it('contains Fixed and Actual', () => {
    expect(RATE_TYPES).toContain('Fixed')
    expect(RATE_TYPES).toContain('Actual')
  })

  it('has exactly 2 values', () => {
    expect(RATE_TYPES).toHaveLength(2)
  })
})

describe('RESPONSIBILITY_OPTIONS', () => {
  it('contains all required options', () => {
    expect(RESPONSIBILITY_OPTIONS).toContain('N/A')
    expect(RESPONSIBILITY_OPTIONS).toContain('Lessor')
    expect(RESPONSIBILITY_OPTIONS).toContain('Lessee')
    expect(RESPONSIBILITY_OPTIONS).toContain('Shared 50/50')
  })

  it('has exactly 4 values', () => {
    expect(RESPONSIBILITY_OPTIONS).toHaveLength(4)
  })
})

describe('DEPOSIT_DECORATION_OPTIONS', () => {
  it('contains None and Yes', () => {
    expect(DEPOSIT_DECORATION_OPTIONS).toContain('None')
    expect(DEPOSIT_DECORATION_OPTIONS).toContain('Yes')
  })

  it('has exactly 2 values', () => {
    expect(DEPOSIT_DECORATION_OPTIONS).toHaveLength(2)
  })
})

describe('DURATION_UNITS', () => {
  it('contains เดือน and ปี', () => {
    expect(DURATION_UNITS).toContain('เดือน')
    expect(DURATION_UNITS).toContain('ปี')
  })
})

describe('RENT_CALC_UNITS', () => {
  it('contains บาท/ตร.ม. and บาท/เดือน', () => {
    expect(RENT_CALC_UNITS).toContain('บาท/ตร.ม.')
    expect(RENT_CALC_UNITS).toContain('บาท/เดือน')
  })
})
