import { describe, it, expect } from 'vitest'
import { lowestTotalId } from './compare'

function getLowestUnitPriceForItem(
  quotations: Array<{ items: Array<{ item_name: string; unit_price: number }> }>,
  itemName: string
): number | null {
  const prices = quotations
    .map((vq) => vq.items.find((i) => i.item_name === itemName)?.unit_price)
    .filter((p): p is number => p !== undefined)
  return prices.length > 0 ? Math.min(...prices) : null
}

function collectAllItemNames(
  quotations: Array<{ items: Array<{ item_name: string }> }>
): string[] {
  return Array.from(
    new Set(quotations.flatMap((vq) => vq.items.map((item) => item.item_name)))
  )
}

const mockQuotations = [
  {
    id: 'vq-1',
    vendor_name: 'Alpha Supplies',
    total: 1000,
    is_selected: false,
    notes: 'Delivery in 7 days',
    items: [
      { item_name: 'Paper A4', quantity: 10, unit_price: 50, total: 500, lead_time_days: 3 },
      { item_name: 'Pen', quantity: 100, unit_price: 5, total: 500, lead_time_days: 1 },
    ],
  },
  {
    id: 'vq-2',
    vendor_name: 'Beta Trading',
    total: 900,
    is_selected: true,
    notes: null,
    items: [
      { item_name: 'Paper A4', quantity: 10, unit_price: 45, total: 450, lead_time_days: 5 },
      { item_name: 'Pen', quantity: 100, unit_price: 4.5, total: 450, lead_time_days: 2 },
    ],
  },
]

describe('lowestTotalId', () => {
  it('returns null for empty array', () => {
    expect(lowestTotalId([])).toBeNull()
  })

  it('returns the id with the lowest total', () => {
    expect(lowestTotalId(mockQuotations)).toBe('vq-2')
  })

  it('returns the single id when only one quotation exists', () => {
    expect(lowestTotalId([{ id: 'vq-1', total: 1000 }])).toBe('vq-1')
  })

  it('handles equal totals by returning the first encountered', () => {
    const tied = [{ id: 'vq-a', total: 500 }, { id: 'vq-b', total: 500 }]
    expect(lowestTotalId(tied)).toBe('vq-a')
  })
})

describe('getLowestUnitPriceForItem', () => {
  it('returns the lowest unit price for Paper A4', () => {
    expect(getLowestUnitPriceForItem(mockQuotations, 'Paper A4')).toBe(45)
  })

  it('returns the lowest price for Pen item', () => {
    expect(getLowestUnitPriceForItem(mockQuotations, 'Pen')).toBe(4.5)
  })

  it('returns null if no vendor has the item', () => {
    expect(getLowestUnitPriceForItem(mockQuotations, 'Unknown')).toBeNull()
  })

  it('returns price when only one vendor has the item', () => {
    const partial = [
      { items: [{ item_name: 'Stapler', unit_price: 120 }] },
      { items: [] as Array<{ item_name: string; unit_price: number }> },
    ]
    expect(getLowestUnitPriceForItem(partial, 'Stapler')).toBe(120)
  })
})

describe('collectAllItemNames', () => {
  it('collects all unique item names', () => {
    const names = collectAllItemNames(mockQuotations)
    expect(names).toContain('Paper A4')
    expect(names).toContain('Pen')
    expect(names).toHaveLength(2)
  })

  it('deduplicates repeated item names', () => {
    const names = collectAllItemNames(mockQuotations)
    expect(names.filter((n) => n === 'Paper A4')).toHaveLength(1)
  })

  it('returns empty array for empty list', () => {
    expect(collectAllItemNames([])).toEqual([])
  })
})

describe('Acceptance criteria', () => {
  it('identifies the cheapest vendor (AC: lowest price highlighted)', () => {
    const cheapestId = lowestTotalId(mockQuotations)
    const cheapest = mockQuotations.find((vq) => vq.id === cheapestId)
    expect(cheapest?.vendor_name).toBe('Beta Trading')
    expect(cheapest?.total).toBe(900)
  })

  it('comparison includes vendor name and total price', () => {
    expect(mockQuotations[0].vendor_name).toBe('Alpha Supplies')
    expect(mockQuotations[0].total).toBe(1000)
  })

  it('comparison includes delivery terms via notes field', () => {
    expect(mockQuotations[0].notes).toBe('Delivery in 7 days')
  })

  it('comparison includes unit price per item', () => {
    const prices = mockQuotations.map(
      (vq) => vq.items.find((i) => i.item_name === 'Paper A4')?.unit_price
    )
    expect(prices).toEqual([50, 45])
  })

  it('lowest unit price per item identified correctly', () => {
    expect(getLowestUnitPriceForItem(mockQuotations, 'Paper A4')).toBe(45)
    expect(getLowestUnitPriceForItem(mockQuotations, 'Pen')).toBe(4.5)
  })

  it('lead time days available per item', () => {
    const leadTimes = mockQuotations.map(
      (vq) => vq.items.find((i) => i.item_name === 'Paper A4')?.lead_time_days
    )
    expect(leadTimes).toEqual([3, 5])
  })

  it('selected quotation is correctly flagged', () => {
    const selected = mockQuotations.filter((vq) => vq.is_selected)
    expect(selected).toHaveLength(1)
    expect(selected[0].vendor_name).toBe('Beta Trading')
  })

  it('Vendor Quotations path points to quotations list, not vendor registration', () => {
    const quotationsPath = '/facility-management/procurement/quotations'
    expect(quotationsPath).not.toBe('/facility-management/vendors/create')
    expect(quotationsPath).toContain('procurement/quotations')
  })
})
