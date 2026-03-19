import { describe, it, expect } from 'vitest'
import { computeReputation, SIGNAL_REGISTRY, ALGORITHM_VERSION } from './index.js'
import type { CompanySignalData } from './types.js'

function makeCompany(overrides: Partial<CompanySignalData> = {}): CompanySignalData {
  return {
    companyId: 1,
    companyName: 'Test UAB',
    yearlyRows: [
      { year: 2020, revenue: 2000000, profit: 150000, netProfit: 120000, employees: 25, salary: 1200, sodraDebt: 0 },
      { year: 2021, revenue: 2500000, profit: 200000, netProfit: 170000, employees: 30, salary: 1350, sodraDebt: 0 },
      { year: 2022, revenue: 3000000, profit: 280000, netProfit: 240000, employees: 35, salary: 1500, sodraDebt: 0 },
      { year: 2023, revenue: 3800000, profit: 350000, netProfit: 300000, employees: 42, salary: 1700, sodraDebt: 0 },
      { year: 2024, revenue: 4500000, profit: 420000, netProfit: 360000, employees: 48, salary: 1900, sodraDebt: 0 },
    ],
    mentions: [],
    ratingAverage: null,
    ratingCount: 0,
    topYearsListed: 3,
    foundedYear: 2012,
    activationStatus: 'nominated',
    procurementData: null,
    taxData: null,
    legalData: null,
    reportingData: null,
    governanceData: null,
    ownershipData: null,
    ...overrides,
  }
}

describe('EBRS Scoring', () => {
  it('returns a score for a company with financial data', () => {
    const result = computeReputation(makeCompany())
    expect(result).not.toBeNull()
    expect(result!.overall).toBeGreaterThan(0)
    expect(result!.overall).toBeLessThanOrEqual(10)
    expect(result!.confidence).toBeGreaterThan(0)
    expect(result!.confidence).toBeLessThanOrEqual(100)
    expect(result!.algorithmVersion).toBe(ALGORITHM_VERSION)
  })

  it('returns null for truly empty data', () => {
    const result = computeReputation(makeCompany({ yearlyRows: [], topYearsListed: 0, foundedYear: null }))
    expect(result).toBeNull()
  })

  it('has 5 EBRS axes', () => {
    const result = computeReputation(makeCompany())!
    const axisNames = result.ebrsAxes.map(a => a.axis)
    expect(axisNames).toContain('continuity')
    expect(axisNames).toContain('financial')
    expect(axisNames).toContain('resilience')
  })

  it('excludes signals without data (null-exclusion)', () => {
    const result = computeReputation(makeCompany())!
    // No mentions → market_presence should be absent
    const hasMarketPresence = result.signals.some(s => s.id === 'market_presence')
    expect(hasMarketPresence).toBe(false)
    // No tax data → tax_discipline should be absent
    const hasTaxDiscipline = result.signals.some(s => s.id === 'tax_discipline')
    expect(hasTaxDiscipline).toBe(false)
  })

  it('re-normalizes weights to sum to 1.0', () => {
    const result = computeReputation(makeCompany())!
    const totalWeight = result.signals.reduce((s, sig) => s + sig.weight, 0)
    expect(totalWeight).toBeCloseTo(1.0, 2)
  })

  it('growing company scores higher on resilience than volatile one', () => {
    const growing = computeReputation(makeCompany())!
    const volatile = computeReputation(makeCompany({
      yearlyRows: [
        { year: 2020, revenue: 3000000, profit: 100000, netProfit: 80000, employees: 30, salary: 1300, sodraDebt: 0 },
        { year: 2021, revenue: 1500000, profit: -200000, netProfit: -250000, employees: 20, salary: 1200, sodraDebt: 0 },
        { year: 2022, revenue: 4000000, profit: 300000, netProfit: 250000, employees: 35, salary: 1400, sodraDebt: 0 },
        { year: 2023, revenue: 2000000, profit: -100000, netProfit: -150000, employees: 22, salary: 1250, sodraDebt: 0 },
        { year: 2024, revenue: 3500000, profit: 200000, netProfit: 170000, employees: 28, salary: 1350, sodraDebt: 0 },
      ],
    }))!

    const growingResilience = growing.signals.find(s => s.id === 'resilience')!.score
    const volatileResilience = volatile.signals.find(s => s.id === 'resilience')!.score
    expect(growingResilience).toBeGreaterThan(volatileResilience)
  })

  it('tax debt lowers financial score', () => {
    const clean = computeReputation(makeCompany({
      taxData: { hasDebt: false, debtTotal: 0, debtOverdue: 0, debtDeferred: 0, annualTaxCurrent: null, annualTaxPrevious: null, taxYear: null },
    }))!
    const indebted = computeReputation(makeCompany({
      taxData: { hasDebt: true, debtTotal: 50000, debtOverdue: 50000, debtDeferred: 0, annualTaxCurrent: null, annualTaxPrevious: null, taxYear: null },
    }))!

    const cleanTax = clean.signals.find(s => s.id === 'tax_discipline')!.score
    const debtTax = indebted.signals.find(s => s.id === 'tax_discipline')!.score
    expect(cleanTax).toBeGreaterThan(debtTax)
  })

  it('has 15 signals in the registry', () => {
    expect(SIGNAL_REGISTRY.length).toBe(15)
  })
})
