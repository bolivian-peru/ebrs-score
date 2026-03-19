# EBRS — European Business Reputation Standard

Open-source company reputation scoring algorithm. 15 signals across 5 axes. Zero dependencies.

**Used in production** at [topimones.lt](http://topimones.lt) to score 27,650+ Lithuanian companies.

## Install

```bash
npm install ebrs-score
```

## Quick Start

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

if (score) {
  console.log(`Score: ${score.overall}/10 (${score.confidence}% confidence)`)
  console.log(`Risk: ${score.riskLevel}`)
  for (const axis of score.ebrsAxes) {
    console.log(`  ${axis.name}: ${axis.score}/10`)
  }
}
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

### Design Principles

1. **Null-exclusion** — Signals without data return `null` and are excluded entirely. No fake defaults. Weights re-normalize across active signals only.

2. **Confidence scoring** — `confidence = avg_signal_confidence x signal_coverage`. A company with 5/15 signals can never exceed 33% confidence, regardless of how good those 5 scores are.

3. **Direction over volatility** — Growth consistency is measured by the fraction of years with positive growth, not by coefficient of variation (which penalizes fast-growing companies).

4. **Government data priority** — The Transparency axis (32%) is the heaviest, backed by official registry data (tax filings, legal status, reporting compliance, ownership records).

5. **No platform bias** — Scores don't depend on subscribing to any platform. Data completeness signal has only 2% weight.

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

## 15 Signals

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

## Math Audit (v5.1.1)

The algorithm has been mathematically audited. Key fixes applied:
- Revenue CV replaced with direction-ratio for growth consistency
- Tax discipline ceiling raised (clean companies can now reach 10.0)
- Governance normalized by legal form (small companies not penalized for no board)
- Historical non-filing recovery curve corrected
- Procurement bid frequency: continuous log scale replaces step function

See [METHODOLOGY.md](./METHODOLOGY.md) for the full mathematical specification.

## API Reference

### `computeReputation(data: CompanyData): ReputationScore | null`

Main scoring function. Returns `null` if no signals have sufficient data.

### `SIGNAL_REGISTRY: SignalDefinition[]`

Array of all 15 signal definitions with `compute(data) => SignalResult | null`.

### `EBRS_AXES: Record<EbrsAxis, { name, description }>`

Axis metadata for all 5 axes.

## License

MIT

---

# EBRS — Europos verslo reputacijos standartas

Atvirojo kodo verslo reputacijos vertinimo algoritmas. 15 signalų, 5 ašys. Be priklausomybių.

**Naudojamas produkcijoje** [topimones.lt](http://topimones.lt) — vertina 27 650+ Lietuvos įmonių.

## Diegimas

```bash
npm install ebrs-score
```

## Naudojimas

```typescript
import { computeReputation } from 'ebrs-score'

const rezultatas = computeReputation({
  companyId: 1,
  companyName: 'Pavyzdys UAB',
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

if (rezultatas) {
  console.log(`Balas: ${rezultatas.overall}/10 (${rezultatas.confidence}% patikimumas)`)
  console.log(`Rizika: ${rezultatas.riskLevel}`)
  for (const asis of rezultatas.ebrsAxes) {
    console.log(`  ${asis.name}: ${asis.score}/10`)
  }
}
```

## Algoritmas

### 5 ašys

| Ašis | Svoris | Signalai | Ką vertina |
|------|--------|----------|------------|
| **Tęstinumas** | 15% | continuity_capital, legal_standing | Veiklos trukmė, teisinis statusas, duomenų istorija |
| **Finansinė drausmė** | 21% | financial_strength, growth_trajectory, profitability_trend, tax_discipline | Pajamos, pelningumas, augimo nuoseklumas, mokestinė drausmė |
| **Rinkos patikimumas** | 14% | market_presence, community_trust | Viešumo lygis, bendruomenės vertinimai |
| **Atsparumas** | 14% | resilience, workforce_health | Pajamų stabilumas, darbuotojų gerovė, atlyginimų augimas |
| **Skaidrumas** | 32% | transparency, procurement_integrity, reporting_compliance, governance_quality, ownership_transparency | Ataskaitų pateikimas, valdymo struktūra, nuosavybės aiškumas, viešieji pirkimai |

### Pagrindiniai principai

1. **Null-išskyrimas** — signalai, kuriems trūksta duomenų, grąžina `null` ir yra visiškai pašalinami iš skaičiavimo. Jokių dirbtinių numatytųjų reikšmių. Svoriai perskaičiuojami tarp aktyvių signalų.

2. **Patikimumo balas** — `patikimumas = vidutinis signalų patikimumas x signalų padengimas`. Įmonė su 5/15 signalų niekada neviršys 33% patikimumo, nepriklausomai nuo tų 5 signalų kokybės.

3. **Kryptis, ne svyravimai** — augimo nuoseklumas matuojamas pagal metų su teigiamu augimu dalį, o ne pagal variacijos koeficientą (kuris baudžia sparčiai augančias įmones).

4. **Valstybinių duomenų prioritetas** — Skaidrumo ašis (32%) turi didžiausią svorį, paremta oficialiais registrų duomenimis (mokesčių deklaracijos, teisinis statusas, atskaitomybės drausmė, nuosavybės struktūra).

5. **Jokio platformos šališkumo** — balai nepriklauso nuo prenumeratos ar narystės platformoje. Duomenų pilnumo signalas turi tik 2% svorį.

### Duomenų šaltiniai

Algoritmas priima duomenis iš bet kurio šaltinio. Sąsajos suprojektuotos pagal Europos verslo duomenų standartus:

| Sąsaja | Tipinis šaltinis | Privalomas? |
|--------|-----------------|-------------|
| `yearlyRows` | Finansinės ataskaitos (pajamos, pelnas, darbuotojai) | Taip (bent 1 metai) |
| `mentions` | SERP/naujienų analizė | Ne |
| `taxData` | Mokesčių inspekcija (VMI Lietuvoje) | Ne |
| `legalData` | Juridinių asmenų registras (RC JAR Lietuvoje) | Ne |
| `reportingData` | Ataskaitų nepateikusiųjų sąrašai | Ne |
| `governanceData` | Valdymo organų registras | Ne |
| `ownershipData` | Akcininkų registras (JADIS Lietuvoje) | Ne |
| `procurementData` | Viešųjų pirkimų duomenys | Ne |

### 15 signalų

| # | Signalas | Ašis | Svoris | Minimalūs duomenys |
|---|---------|------|--------|-------------------|
| 1 | `financial_strength` — Finansinis pajėgumas | Finansinė drausmė | 8% | 1 metų pajamos |
| 2 | `growth_trajectory` — Augimo trajektorija | Finansinė drausmė | 4% | 2 metų pajamos |
| 3 | `profitability_trend` — Pelningumo tendencija | Finansinė drausmė | 4% | 1 metų pelnas |
| 4 | `workforce_health` — Darbuotojų gerovė | Atsparumas | 7% | 1 metų atlyginimas arba darbuotojai |
| 5 | `market_presence` — Viešumas | Rinkos patikimumas | 7% | 1+ paminėjimas |
| 6 | `community_trust` — Bendruomenės pasitikėjimas | Rinkos patikimumas | 7% | TOP sąrašas arba 1+ vertinimas |
| 7 | `continuity_capital` — Tęstinumo kapitalas | Tęstinumas | 8% | Įkūrimo metai arba 1 metų duomenys |
| 8 | `resilience` — Verslo atsparumas | Atsparumas | 7% | 3 metų pajamos |
| 9 | `transparency` — Duomenų pilnumas | Skaidrumas | 2% | 1 metų duomenys |
| 10 | `procurement_integrity` — Viešieji pirkimai | Skaidrumas | 9% | 1+ dalyvavimas |
| 11 | `tax_discipline` — Mokestinė drausmė | Skaidrumas | 5% | Mokesčių inspekcijos įrašas |
| 12 | `legal_standing` — Teisinis statusas | Tęstinumas | 7% | Registrų centro įrašas |
| 13 | `reporting_compliance` — Atskaitomybės drausmė | Skaidrumas | 10% | Ataskaitų pateikimo įrašas |
| 14 | `governance_quality` — Valdymo kokybė | Skaidrumas | 6% | Valdymo organų įrašas |
| 15 | `ownership_transparency` — Nuosavybės skaidrumas | Skaidrumas | 5% | JADIS įrašas |

### Matematinis auditas (v5.1.1)

Algoritmas matematiškai audituotas. Pagrindiniai pataisymai:
- Pajamų variacijos koeficientas pakeistas krypties santykiu (CV baudė sparčiai augančias įmones)
- Mokestinės drausmės lubos pakeltos (švarios įmonės dabar gali pasiekti 10.0)
- Valdymo kokybė normalizuota pagal teisinę formą (UAB nebaudžiama už valdybos nebuvimą)
- Istorinio ataskaitų nepateikimo atsigavimo kreivė pataisyta
- Viešųjų pirkimų dalyvavimo dažnis: nuolatinė logaritminė skalė vietoj laiptinės funkcijos

## Licencija

MIT
