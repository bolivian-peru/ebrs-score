# EBRS — European Business Reputation Standard

Open-source company reputation scoring algorithm. 15 signals across 5 axes. Zero dependencies.

**Used in production** at [topimones.lt](http://topimones.lt) to score 27,650+ Lithuanian companies.

## Install

```bash
npm install ebrs-score
```

## Usage

```typescript
import { computeReputation } from 'ebrs-score'

const score = computeReputation({
  companyId: 1,
  companyName: 'Example UAB',
  yearlyRows: [
    { year: 2022, revenue: 3200000, profit: 280000, netProfit: 240000, employees: 35, salary: 1500, sodraDebt: 0 },
    { year: 2023, revenue: 5000000, profit: 400000, netProfit: 350000, employees: 45, salary: 1800, sodraDebt: 0 },
    { year: 2024, revenue: 6200000, profit: 550000, netProfit: 480000, employees: 52, salary: 2100, sodraDebt: 0 },
  ],
  mentions: [],
  ratingAverage: null,
  ratingCount: 0,
  topYearsListed: 2,
  foundedYear: 2015,
  activationStatus: 'inactive',
  procurementData: null,
  taxData: null,
  legalData: null,
  reportingData: null,
  governanceData: null,
  ownershipData: null,
})

console.log(score.overall)      // 6.8
console.log(score.confidence)   // 42 (%)
console.log(score.riskLevel)    // "Low" | "Medium" | "High" | "Critical"
console.log(score.ebrsAxes)     // 5-axis breakdown
console.log(score.signals)      // 15 individual signal scores
```

## The Algorithm

### 5 Axes

| Axis | Weight | Signals | What it measures |
|------|--------|---------|-----------------|
| **Continuity** | 15% | continuity_capital, legal_standing | How long the company has existed and operated continuously |
| **Financial** | 21% | financial_strength, growth_trajectory, profitability_trend, tax_discipline | Revenue, margins, growth consistency, tax compliance |
| **Market** | 14% | market_presence, community_trust | Public mentions, sentiment, user ratings |
| **Resilience** | 14% | resilience, workforce_health | Revenue stability, employee growth, salary trends |
| **Transparency** | 32% | transparency, procurement_integrity, reporting_compliance, governance_quality, ownership_transparency | Filing compliance, governance structure, ownership clarity, procurement behavior |

### Key Design Principles

1. **Null-exclusion**: Signals without data return `null` and are excluded entirely. No fake defaults. Weights re-normalize across active signals only.

2. **Confidence scoring**: `confidence = avg_signal_confidence × signal_coverage`. A company with 5/15 signals can never exceed 33% confidence, regardless of how good those 5 scores are.

3. **Direction over volatility**: Growth consistency is measured by the fraction of years with positive growth, not by coefficient of variation (which penalizes fast-growing companies).

4. **Government data priority**: The Transparency axis (32%) is the heaviest, backed by official registry data (tax filings, legal status, reporting compliance, ownership records).

5. **No platform bias**: Scores don't depend on subscribing to any platform. TOP list presence is capped and weighted low. Data completeness signal has only 2% weight.

### Data Sources

The algorithm accepts data from any source. The interfaces are designed around common European business data:

| Interface | Typical Source | Required? |
|-----------|---------------|-----------|
| `yearlyRows` | Financial statements (revenue, profit, employees) | Yes (at least 1 year) |
| `mentions` | SERP/news scraping | No |
| `taxData` | Tax authority (VMI in Lithuania) | No |
| `legalData` | Business registry (RC JAR in Lithuania) | No |
| `reportingData` | Filing compliance blacklists | No |
| `governanceData` | Corporate governance registry | No |
| `ownershipData` | Shareholder registry (JADIS in Lithuania) | No |
| `procurementData` | Public procurement records | No |

## Signal Reference

| # | Signal | Axis | Weight | Minimum Data |
|---|--------|------|--------|-------------|
| 1 | `financial_strength` | Financial | 8% | 1 year revenue |
| 2 | `growth_trajectory` | Financial | 4% | 2 years revenue |
| 3 | `profitability_trend` | Financial | 4% | 1 year profit |
| 4 | `workforce_health` | Resilience | 7% | 1 year salary or employees |
| 5 | `market_presence` | Market | 7% | 1+ SERP mentions |
| 6 | `community_trust` | Market | 7% | TOP list or 1+ rating |
| 7 | `continuity_capital` | Continuity | 8% | Founded year or 1 year data |
| 8 | `resilience` | Resilience | 7% | 3 years revenue |
| 9 | `transparency` | Transparency | 2% | 1 year data |
| 10 | `procurement_integrity` | Transparency | 9% | 1+ procurement bid |
| 11 | `tax_discipline` | Transparency | 5% | Tax authority record |
| 12 | `legal_standing` | Continuity | 7% | Legal registry record |
| 13 | `reporting_compliance` | Transparency | 10% | Filing compliance record |
| 14 | `governance_quality` | Transparency | 6% | Governance registry record |
| 15 | `ownership_transparency` | Transparency | 5% | Ownership registry record |

## Math Audit

The algorithm has been mathematically audited (v5.1.1). Key fixes:
- Revenue CV replaced with direction-ratio for growth consistency (CV penalized fast-growing companies)
- Tax discipline ceiling raised (clean companies max was 9.0, now 10.0)
- Governance normalized by legal form (UABs not penalized for lacking a board)
- Historical non-filing recovery curve fixed (was harsher than current late filing)
- Procurement bid frequency: continuous log scale replaces step function

See [METHODOLOGY.md](./METHODOLOGY.md) for the full mathematical specification.

## API

### `computeReputation(data: CompanyData): ReputationScore | null`

Main scoring function. Returns `null` if no signals have sufficient data.

### `SIGNAL_REGISTRY: SignalDefinition[]`

Array of all 15 signal definitions. Each has:
- `id`, `name`, `category`, `ebrsAxis`, `defaultWeight`
- `compute(data) => SignalResult | null`

### `EBRS_AXES: Record<EbrsAxis, { name, description }>`

Axis metadata for all 5 axes.

## License

MIT
