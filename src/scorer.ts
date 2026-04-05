/**
 * EBRS Reputation Scorer Engine
 *
 * Orchestrates the signal registry to compute a company's reputation score.
 *
 * Key principle: signals that return null (insufficient data) are EXCLUDED,
 * not defaulted to 5.0. Weights re-normalized across active signals only.
 */

import { SIGNAL_REGISTRY } from './signals.js'
import type { CompanySignalData, ReputationScore, StoredSignalScore, EbrsAxisScore, EbrsAxis } from './types.js'
import { EBRS_AXES } from './types.js'

export const ALGORITHM_VERSION = 'v5.2.0'

/**
 * Compute reputation score from company data.
 *
 * @param data - All available data for a single company
 * @returns ReputationScore or null if no signals have data
 *
 * @example
 * ```ts
 * import { computeReputation } from './dist/index.js'
 *
 * const score = computeReputation({
 *   companyId: 1,
 *   companyName: 'Example UAB',
 *   yearlyRows: [
 *     { year: 2023, revenue: 5000000, profit: 400000, netProfit: 350000, employees: 45, salary: 1800, sodraDebt: 0 },
 *     { year: 2024, revenue: 6200000, profit: 550000, netProfit: 480000, employees: 52, salary: 2100, sodraDebt: 0 },
 *   ],
 *   mentions: [],
 *   ratingAverage: null,
 *   ratingCount: 0,
 *   topYearsListed: 2,
 *   foundedYear: 2015,
 *   activationStatus: 'nominated',
 *   procurementData: null,
 *   taxData: null,
 *   legalData: null,
 *   reportingData: null,
 *   governanceData: null,
 *   ownershipData: null,
 * })
 *
 * console.log(score.overall)    // e.g. 6.8
 * console.log(score.confidence) // e.g. 42
 * console.log(score.ebrsAxes)   // 5-axis breakdown
 * ```
 */
export function computeReputation(data: CompanySignalData): ReputationScore | null {
  const activeSignals: StoredSignalScore[] = []

  for (const signal of SIGNAL_REGISTRY) {
    const result = signal.compute(data)
    if (result !== null) {
      activeSignals.push({
        id: signal.id,
        name: signal.name,
        score: Math.round(result.score * 100) / 100,
        confidence: Math.round(result.confidence * 100) / 100,
        weight: signal.defaultWeight,
        dataPoints: result.dataPoints,
        reasoning: result.reasoning,
        details: result.details,
        ebrsAxis: signal.ebrsAxis,
      })
    }
  }

  if (activeSignals.length === 0) return null

  // Re-normalize weights across active signals only
  const totalWeight = activeSignals.reduce((s, sig) => s + sig.weight, 0)
  for (const sig of activeSignals) {
    sig.weight = sig.weight / totalWeight
  }

  const overall = activeSignals.reduce((s, sig) => s + sig.score * sig.weight, 0)

  // Confidence = weighted avg of signal confidences x signal coverage
  const signalCoverage = activeSignals.length / SIGNAL_REGISTRY.length
  const avgConfidence = activeSignals.reduce((s, sig) => s + sig.confidence * sig.weight, 0)
  const confidence = Math.round(avgConfidence * signalCoverage * 100)

  const sortedRevRows = data.yearlyRows.filter(r => r.revenue && r.revenue > 0).sort((a, b) => a.year - b.year)
  const dataYears = sortedRevRows.length

  const roundedOverall = Math.round(overall * 10) / 10
  const riskLevel = roundedOverall >= 7 ? 'Low' : roundedOverall >= 5 ? 'Medium' : roundedOverall >= 3 ? 'High' : 'Critical'

  const growthSig = activeSignals.find(s => s.id === 'growth_trajectory')
  const cagr = growthSig?.details?.cagr as number | undefined
  const growthTrend = cagr !== undefined
    ? (cagr >= 15 ? 'Fast growth' : cagr >= 5 ? 'Growing' : cagr >= -2 ? 'Stable' : cagr >= -10 ? 'Declining' : 'Fast decline')
    : 'No data'

  const latestRev = sortedRevRows.length > 0 ? sortedRevRows[sortedRevRows.length - 1].revenue! : 0
  const marketPosition = latestRev > 86000000 ? 'Dominant' : latestRev > 9000000 ? 'Strong' : latestRev > 1000000 ? 'Established' : latestRev > 392000 ? 'Growing' : 'Emerging'

  const latestProfit = sortedRevRows.length > 0 ? (sortedRevRows[sortedRevRows.length - 1].profit ?? 0) : 0
  const margin = latestRev > 0 ? Math.round((latestProfit / latestRev) * 1000) / 10 : null

  const profSig = activeSignals.find(s => s.id === 'profitability_trend')
  const consecutiveProfitYears = (profSig?.details?.consecutiveYears as number) ?? 0

  // 5-axis aggregation
  const ebrsAxes: EbrsAxisScore[] = []
  const axisKeys: EbrsAxis[] = ['continuity', 'financial', 'market', 'resilience', 'transparency']
  for (const axis of axisKeys) {
    const axisSignals = activeSignals.filter(s => s.ebrsAxis === axis)
    if (axisSignals.length === 0) continue
    const axisTotalWeight = axisSignals.reduce((s, sig) => s + sig.weight, 0)
    const axisScore = axisTotalWeight > 0
      ? axisSignals.reduce((s, sig) => s + sig.score * (sig.weight / axisTotalWeight), 0)
      : 0
    const axisConfidence = axisSignals.reduce((s, sig) => s + sig.confidence, 0) / axisSignals.length
    ebrsAxes.push({
      axis,
      name: EBRS_AXES[axis].name,
      score: Math.round(axisScore * 10) / 10,
      confidence: Math.round(axisConfidence * 100) / 100,
      signalCount: axisSignals.length,
    })
  }

  // Coverage metadata — how many of the 15 possible signals were computable.
  // Companies with fewer signals may have inflated scores because problematic
  // dimensions (e.g., tax issues, procurement red flags) were simply absent.
  const signalCoverageRatio = Math.round(signalCoverage * 100)

  return {
    overall: roundedOverall,
    confidence,
    signals: activeSignals,
    ebrsAxes,
    algorithmVersion: ALGORITHM_VERSION,
    dataYears,
    riskLevel,
    growthTrend,
    marketPosition,
    margin,
    consecutiveProfitYears,
    signalCoverage: signalCoverageRatio,
  }
}
