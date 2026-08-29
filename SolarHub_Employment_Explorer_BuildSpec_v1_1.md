# SolarHub Employment Explorer — Build Specification v1.1

*v1.1 — sampling and exclusion rules resolved against the raw data. Changes in §3.1, §3.1a, §3.2, §3.5, §6.13, §13, and Items to Confirm 1, 1a and 8.*

**For:** Claude Code
**Deliverable:** Interactive single-page data explorer, portable into a Lovable-hosted React SPA
**Source material:** SolarHub Employment Report (WP1, v1.0, 31.07.2026) + two survey workbooks
**Owner:** Odysseas Spyroglou, International Development Ireland Ltd
**Project:** SolarHub, Horizon Europe WIDERA Excellence Hub, GA 101086110

---

## Actions at a Glance

| # | Task | Priority |
|---|---|---|
| 1 | Build the ETL script that converts both .xlsx workbooks into a single typed `survey-data.json` | **Critical** |
| 2 | Implement the global filter + cross-filter state layer | **Critical** |
| 3 | Build the 12 visual modules in the order given in §6 | **Critical** |
| 4 | Enforce the small-sample integrity rules in §7 on every chart | **Critical** |
| 5 | Implement URL state serialisation so any filtered view is shareable | High |
| 6 | Implement PNG + CSV export per module | Medium |
| 7 | Package for Lovable transfer per §11 | High |

---

## 1. Purpose and Audience

The report presents 44 employee responses and 20 employer responses on workforce conditions in the Turkish solar sector. In print, that data is locked into 35 static pie and bar charts. Around half the employer questionnaire never made it into the report at all.

The explorer exists to do three things the PDF cannot:

1. **Let a reader interrogate the data.** Filter to field technicians in micro-firms, or to manufacturing employees with 10+ years' experience, and see how the picture changes.
2. **Surface the expectation asymmetry.** The report's central argument is that employees and employers want structurally different things. That argument is far better made by a side-by-side interactive than by two charts fifteen pages apart.
3. **Publish the unreported employer data** — turnover by staff group, recruitment barriers, resignation reasons, retention methods, training investment, academia collaboration models, 2035 technology drivers.

**Primary audiences:** policymakers and regulators (MENR, EMRA, VQA), sector associations (GÜNDER and peers), universities designing curricula, employers benchmarking their own practice, and EU project reviewers assessing WP1 impact.

**Secondary audience:** journalists and the general public, who need the headline story in under thirty seconds without touching a control.

**Tone:** analytical instrument, not marketing microsite. Restrained, dense, credible. This is a research output.

---

## 2. Technical Constraints

Build in the stack Lovable uses natively, so transfer is a copy rather than a port.

| Layer | Choice | Note |
|---|---|---|
| Framework | React 18 + TypeScript | Function components, hooks only |
| Build | Vite | |
| Styling | Tailwind CSS | Utility classes only; no CSS modules, no styled-components |
| Components | shadcn/ui | Slider, Select, Checkbox, Tabs, Popover, Tooltip, Toggle, Badge, Sheet |
| Charts | Recharts | Primary. See §5 for the three custom-SVG exceptions |
| Icons | lucide-react | |
| State | React Context + `useReducer` | No Redux, no Zustand, no external state library |
| Data | Static JSON imported at build time | **No backend, no API, no fetch, no database** |

**Hard rules:**

- No `localStorage`, `sessionStorage`, or any browser storage API.
- No external font CDN. Use system font stack or a font already present in the Lovable theme.
- No `<form>` elements. Use `onClick` / `onChange` handlers.
- All data ships in one JSON file under 500 KB. It is small; do not paginate or lazy-load it.
- Total bundle target under 600 KB gzipped.
- Must render correctly at 360 px width.

---

## 3. Data Pipeline

### 3.1 Inputs

| File | Sheet | Rows | Use |
|---|---|---|---|
| `C_alıs_an_Anketi__Responses_.xlsx` | `Analize dahil edilenler` | 44 | Employee analysed set — **use this, not `ham veriler`** |
| `C_alıs_an_Anketi__Responses_.xlsx` | `İşveren dahil edilenler` | 20 | Employer analysed set — **use this, not `İşveren ham veriler`** |

Ignore `pivot`, `grafikler`, `işveren pivot`, `işveren grafikler`. Those are the legacy Excel charts being replaced.

**Use the Turkish workbook only.** `C_alıs_an_Anketi__Responses__EN_Charts.xlsx` is byte-identical on all six data sheets; the only differences are 175 translated chart labels, with zero numeric variance. Its translation is also incomplete (four chart titles remain Turkish, one chart is duplicated), so it is not a reliable label source. Take English labels from the dictionary in §4.

### 3.1a Why the analysed sheets differ from the raw sheets

Raw sheets hold 48 employee and 23 employer rows; the analysed sheets hold 44 and 20. The exclusion rule is **not** completeness — it is a pilot cut-off.

Both analysed datasets begin at **4 March 2026**. Every excluded record predates it:

| Dataset | Excluded timestamps | Completeness of excluded rows |
|---|---|---|
| Employee | 18 Feb, 24 Feb, 28 Feb, 1 Mar | 0/24, 24/24, 24/24, 23/24 |
| Employer | 24 Feb, 28 Feb, 1 Mar | 43/45, 44/45, 44/45 |

Two excluded employee records are fully complete, so completeness cannot be the criterion. Decisively, the excluded employee and employer timestamps pair within minutes of each other — 24 Feb 22:15 / 22:16, 28 Feb 14:30 / 14:37, 1 Mar 11:30 / 11:44. The same individuals were testing both instruments before launch. These are **pre-launch pilot responses from the research team**, correctly removed from the analysed set.

▶ The ETL must implement this as a **date cut-off at 2026-03-04**, not as a completeness filter. Filtering on completeness would wrongly retain two pilot records on the employee side.

Use the analysed sheets so the explorer reconciles exactly with the published report.

### 3.2 ETL script

Write `scripts/build-data.ts` (Node, using `xlsx` or `exceljs`). It runs once at build time and emits `src/data/survey-data.json`. It must be re-runnable and idempotent, so refreshed survey exports can be dropped in later.

**Transformation steps:**

1. **Read** both analysed sheets, dropping trailing null rows.
2. **Drop** the `Timestamp` column and the final consent/GDPR column from both datasets. Neither is displayed.
3. **Map** every Turkish column header to a stable snake_case question ID and an English label, using the dictionaries in §4.
4. **Map** every Turkish response value to its English label, using the option dictionaries in §4.
5. **Split multi-select fields** on comma into string arrays. Affected: employee `certificates`; employer `other_activity_fields`, `recruitment_barriers`, `retention_methods`, `growth_tech_areas`, `employment_change_drivers`.
6. **Normalise Likert fields** to integers 1–5. Preserve nulls; do not impute.
7. **Quarantine free-text.** Several closed questions were answered with free text (see §3.3). Route any value not matching a known option into a `_other` array on the record and expose it in the module's "Other responses" drawer. Never silently discard it and never let it create a spurious category.
8. **Derive** the fields listed in §3.4.
9. **Emit** the JSON structure in §3.5.
10. **Assert** on exit, failing the build on any breach:
    - employee count is exactly 44, employer count is exactly 20
    - no record carries a timestamp earlier than 2026-03-04
    - if the raw sheets are used as input instead of the analysed sheets, the same date cut-off reproduces 44 and 20 exactly — build this as a unit test, since it is what makes the pipeline safe to re-run against a fresh export

### 3.3 Known data-quality issues the ETL must handle

▶ **Employee Q23 (long-term career factor)** — a single-select with six intended options returned 15 distinct values. Free-text entries include a philosophical remark about extraterrestrial energy conversion and one respondent writing "questions and answers do not match." Route all non-matching values to `_other`. The chart shows only the six defined options plus an "Other / unclassified" bar with a click-through to the verbatim list.

▶ **Employee Q24 (5-year career plan)** — includes `"1 ve 3"` (respondent selected two options) and a free-text geothermal answer. Treat `"1 ve 3"` as a multi-select of options 1 and 3, flag it in the record, and note it in the module footnote.

▶ **Employee Q9 (certificates improve work quality)** — only 35 of 44 answered. Denominator for this item is 35, not 44. The chart must display `n = 35` and a note explaining that non-certificate-holders skipped it.

▶ **Employee Q7 (certificates held)** — multi-select. Contains `"na"`, a bare `"Mühendislik diploması"` (an engineering degree is not a professional certificate), and trailing-comma artefacts. Trim, drop empties, and keep "Engineering diploma" as a distinct low-count category rather than folding it into another.

▶ **Employer Q4 (total employees)** — free numeric text, 18 distinct values ranging from 12 to several hundred. Parse to integer, then derive a banded field matching the employee-side company-size bands so the two datasets can be compared.

▶ **Employer Q5 (annual business volume)** — free text with mixed units (`MWp/yıl`, `panel/Yıl`, `2GW`, bare numbers, one typo `1500 MWp/yık`). **Do not attempt to normalise or chart this.** Expose as a raw verbatim list in the methodology drawer only.

▶ **Employer Q12 (doctorate-level workforce share)** — every one of the 20 respondents answered `%0-20`. Zero variance. Render it as a single labelled statement, not a chart. This is a finding in itself: PhD-level staff are near-absent sector-wide.

### 3.4 Derived fields

**Employee records:**

| Field | Derivation |
|---|---|
| `has_certificate` | `false` if certificates array is empty or contains only "No certificate"; else `true` |
| `education_match_band` | Likert Q8: 1–2 → `misaligned`, 3 → `neutral`, 4–5 → `aligned` |
| `confidence_self` / `confidence_employer` / `confidence_sector` | Likert Q14 / Q15 / Q18, retained raw for the Confidence Ladder |
| `seniority` | Experience band collapsed: `1–3 yr` → `early`, `3–5`+`5–10` → `mid`, `10+ yr` → `senior` |
| `firm_scale` | Company size collapsed: `1–9` → `micro`, `10–149` → `small_mid`, `150–499` → `large`, `500+` → `corporate` |

**Employer records:**

| Field | Derivation |
|---|---|
| `employee_count_band` | Parsed headcount banded to match `firm_scale` above |
| `turnover_mean_band` | Modal turnover band across the 8 staff-group columns |
| `is_manufacturer` | `true` if main or other activity fields include cell/panel or component manufacturing |

### 3.5 Output schema

```ts
interface SurveyData {
  meta: {
    reportTitle: string;
    reportVersion: string;      // "1.0"
    submissionDate: string;     // "2026-07-31"
    workPackage: string;        // "WP1"
    grantNumber: string;        // "101086110"
    employeeFieldwork: [string, string];  // ["2026-03-04", "2026-06-02"]
    employerFieldwork: [string, string];  // ["2026-03-04", "2026-07-13"]
    employeeN: number;          // 44 analysed
    employerN: number;          // 20 analysed
    employeeCollected: number;  // 48 raw
    employerCollected: number;  // 23 raw
    employeePilotExcluded: number;  // 4
    employerPilotExcluded: number;  // 3
    employerSelfCompleted: number;  // 16
    employerInterviewed: number;    // 7
  };
  questions: Question[];        // full dictionary, see §4
  employees: EmployeeRecord[];  // 44
  employers: EmployerRecord[];  // 20
  strategyMatrix: Recommendation[]; // 15, see §6.12
}

interface Question {
  id: string;
  dataset: 'employee' | 'employer';
  labelEn: string;
  labelTr: string;             // retain for the TR locale
  shortLabel: string;          // ≤40 chars, for axes and chips
  type: 'single' | 'multi' | 'likert5' | 'band' | 'numeric' | 'freetext';
  options?: { value: string; labelEn: string; labelTr: string; order: number }[];
  dimension: string;           // one of the six research dimensions
  reportFigure?: string;       // e.g. "Fig. 4.9" — links back to the PDF
  n: number;                   // answered count; may be < dataset N
  notes?: string;              // data-quality caveat surfaced in the UI
}
```

Store one record per respondent with question IDs as keys. All aggregation happens client-side at render, so filters recompute live.

---

## 4. Data Dictionary

Every Turkish string must be mapped. The English labels below are authoritative — they follow the report's own translations so the explorer and the PDF use identical wording.

### 4.1 Employee questions (24 substantive)

| ID | Dimension | English label | Type |
|---|---|---|---|
| `age` | Profile | Age group | single |
| `gender` | Profile | Gender | single |
| `experience` | Profile | Total experience in the solar sector | single |
| `activity_field` | Profile | Main field of activity | single |
| `company_size` | Profile | Company headcount | single |
| `education_level` | Profile | Highest level of education completed | single |
| `certificates` | Competence | Professional certificates held | multi |
| `education_role_match` | Competence | My education relates directly to my current role | likert5 |
| `certificate_value` | Competence | My certificates improve my work quality and OHS awareness | likert5 |
| `training_support` | Conditions | My company gives sufficient training support for new technologies | likert5 |
| `pay_fairness` | Pay | My pay and bonuses match the difficulty and responsibility of my job | likert5 |
| `rights_compliance` | Pay | My employer complies with overtime, holiday pay and leave rights | likert5 |
| `field_allowances` | Pay | I am satisfied with accommodation, travel and per-diem on assignments | likert5 |
| `confidence_self` | Security | My technical knowledge means I have no unemployment concern | likert5 |
| `confidence_employer` | Security | My company's market position means I have no unemployment concern | likert5 |
| `clean_energy_satisfaction` | Satisfaction | Working for a clean future adds significantly to my job satisfaction | likert5 |
| `work_life_balance` | Satisfaction | Seasonal peaks and field work harm my work–life balance | likert5 |
| `confidence_sector` | Security | The Turkish solar sector will grow steadily and is a secure long-term career | likert5 |
| `mobility_willingness` | Satisfaction | I have no reservations about assignments in other locations | likert5 |
| `development_intent` | Future | I plan training or certification in the next 2 years | likert5 |
| `subcontractor_status` | Security | Effect of subcontractor employment on job continuity | single |
| `wage_comparison` | Pay | Solar sector pay compared with other sectors | single |
| `loyalty_factor` | Future | Most decisive factor for a long-term career in solar | single + `_other` |
| `career_plan_5y` | Future | Where I plan to continue my career over the next 5 years | single + `_other` |

**Option sets requiring translation:**

- `age`: 18–24 / 25–34 / 35–44 / 45–54 / 55+
- `gender`: Male / Female / Prefer not to say
- `experience`: 1–3 yr / 3–5 yr / 5–10 yr / 10+ yr
- `activity_field` (9): Cell and panel manufacturing / Installation, contracting, construction, O&M / R&D activities / Engineering and technical consultancy / Project development and consulting / Solar plant service provision / Inspection, testing and certification / System component manufacturing / Solar thermal system services
- `company_size` (6): 1–9 / 10–49 / 50–149 / 150–299 / 300–499 / 500+
- `education_level` (5): Secondary / Technical or vocational high school / Bachelor's / Master's / Doctorate
- `certificates` (multi): OHS certificates / No certificate / Manufacturer-focused technical training / Master craftsman certificate / VQA photovoltaic power systems personnel / VQA solar thermal system personnel / High voltage (EKAT) certificate / Soft-skill training / Engineering diploma
- `subcontractor_status` (4): Not a subcontractor employee, permanent staff / Being a subcontractor makes no difference, work is always available / I accept it as normal since I work only during project periods / I find continuity risky due to dependence on the main contractor
- `wage_comparison` (4): Lower than other sectors / Similar to other sectors / Higher than other sectors / Not informed
- `loyalty_factor` (6 defined): Pay and benefits lagging other sectors / Limited professional development opportunities / Diversity of fringe benefits / Concern about keeping pace with technological change / Uncertainty from the subcontracting system / No confidence in sector sustainability due to policy
- `career_plan_5y` (4 defined): Stay in solar and take on managerial responsibility / Stay in solar and move toward new technologies and specialisations / Stay in solar and continue specialising in my current role / Move to a different field or sector

**Likert scale labels:** 1 Strongly disagree · 2 Disagree · 3 Neutral · 4 Agree · 5 Strongly agree.

### 4.2 Employer questions (45 substantive)

| ID | Dimension | English label | Type |
|---|---|---|---|
| `main_activity_field` | Profile | Field employing the most personnel | single |
| `other_activity_fields` | Profile | Other fields of operation | multi |
| `years_operating` | Profile | Years operating in solar | single |
| `total_employees` | Profile | Total employees | numeric |
| `annual_volume` | Profile | Approximate annual business volume | freetext (not charted) |
| `international_share` | Profile | Share of operations carried out abroad | band |
| `staff_dist_project_dev` … `staff_dist_sales` (5) | Composition | Staff distribution by function | band |
| `edu_dist_doctorate` … `edu_dist_primary` (6) | Composition | Workforce distribution by education level | band |
| `turnover_*` (8) | Composition | Annual average turnover rate by staff group | band |
| `employment_type_permanent` / `employment_type_project` | Composition | Workforce by employment type | band |
| `female_technical` / `female_management` | Composition | Female employee share | band |
| `certified_performance` | Skills | Certified personnel meet our quality and application standards | likert5 |
| `poaching_frequency` | Retention | Our trained staff are frequently poached by competitors | likert5 |
| `graduate_readiness` | Skills | New graduates' job readiness and curriculum adequacy meet expectations | likert5 |
| `regulatory_complexity` | Challenges | Regulatory complexity harms our long-term HR strategy | likert5 |
| `outflow_other_sectors` | Retention | Our trained staff move out of solar to other sectors at a high rate | likert5 |
| `field_fatigue` | Challenges | Regional imbalance and seasonality create field fatigue we struggle to prevent | likert5 |
| `hardest_role` | Challenges | Position group hardest to fill with qualified candidates | single |
| `recruitment_barriers` | Challenges | Top 3 barriers in technical recruitment | multi |
| `volume_headcount_relation` | Composition | Relationship between business volume and headcount over 3 years | single |
| `training_hours` | Skills | Annual in-house training hours per employee | single |
| `academia_collaboration` | Skills | Most effective collaboration model with education institutions | single |
| `resignation_reason` | Retention | Dominant reason given by resigning staff | single |
| `retention_methods` | Retention | Most effective methods used to increase retention | multi |
| `growth_tech_areas` | Future | Areas expected to drive employment toward 2035 | multi |
| `employment_change_2y` | Future | Expected change in employment volume over 2 years | single |
| `employment_change_drivers` | Future | Top 3 factors behind that expectation | multi |

**Option sets requiring translation:**

- `years_operating`: 0–3 / 4–7 / 8–11 / 12–15 years
- `international_share`: Under 20% / 40–60% / Over 80%
- Percentage bands (staff, education, employment type, female share): 0–20% / 21–40% / 41–60% / Over 61%
- Turnover bands: 0–10% / 11–20% / 21–30% / 31–40% / Over 41%
- `hardest_role` (6): Senior/middle manager and strategic planning / Specialist technicians and operators / Project specialist or engineer / Project technical personnel / R&D engineer / Field worker (unskilled)
- `recruitment_barriers` (multi): Pay and benefit expectations / Insufficient technical competence / Geographic location difficulties / Reluctance to do field work / Communication and language barrier
- `volume_headcount_relation` (6): Volume and headcount rose together / Volume rose, headcount flat or fell / Volume flat, headcount flat or rose / Volume flat, headcount fell / Volume fell, headcount flat or rose / Volume and headcount fell together
- `training_hours` (5): 0–16 h / 17–40 h / 41–80 h / 81+ h / No in-house programme
- `academia_collaboration` (6): Long-term internship and candidate engineer programmes / MoNE apprenticeship, intern and İŞKUR programmes / KOSGEB and İŞKUR institutional programmes / Training with guaranteed post-graduation employment / Commercial courses / No collaboration
- `resignation_reason` (5): Higher pay and benefit offers from other firms / Dissatisfaction with conditions, culture or management / Work–life balance problems caused by field work / Uncertainty about internal career progression / Desire to move to a different sector
- `retention_methods` (multi): Competitive salary and bonus systems / Career development and continuous learning / Flexible working models / Private or supplementary health insurance, meal and transport support / Strong company culture and social bonds
- `employment_change_2y` (5): Increase over 25% / Increase 0–25% / Stable / Decrease 0–25% / Decrease over 25%
- `employment_change_drivers` (multi): Changes in investment speed and capacity / Storage and other new technologies / Regulatory changes / Domestic production focus / R&D focus / Operation and maintenance requirements
- `growth_tech_areas` (multi): Energy storage / Smart grid solutions / Panel end-of-life management / Panel, cell or equipment manufacturing / Data management and digitalisation / Project development and engineering design / Installation, contracting, construction and O&M / Sales services

---

## 5. Design System

The page must look like it belongs to horizonsolarhub.eu. Do not invent a new brand.

### 5.1 Tokens

Define once in `src/styles/tokens.css` as CSS custom properties, consumed via Tailwind's `theme.extend`. This is the single file to swap during Lovable transfer.

```css
:root {
  --sh-solar:      #F2A900;  /* primary accent — solar amber */
  --sh-deep:       #0B2A4A;  /* headline navy */
  --sh-teal:       #1B7F79;  /* secondary — employer series */
  --sh-sand:       #F7F4EE;  /* page background */
  --sh-ink:        #14181D;  /* body text */
  --sh-muted:      #6B7280;  /* secondary text */
  --sh-rule:       #E2DED6;  /* borders and dividers */
  --sh-surface:    #FFFFFF;  /* card background */

  /* Diverging Likert scale — must remain legible in greyscale print */
  --sh-lik-1:      #B3402F;  /* strongly disagree */
  --sh-lik-2:      #DC8A6E;
  --sh-lik-3:      #D9D3C7;  /* neutral */
  --sh-lik-4:      #7FB2A6;
  --sh-lik-5:      #1B7F79;  /* strongly agree */

  --sh-employee:   #F2A900;  /* employee series throughout */
  --sh-employer:   #1B7F79;  /* employer series throughout */
}
```

▶ **Colour discipline:** employee data is always amber, employer data is always teal. This mapping never varies. It is what makes the asymmetry modules legible at a glance.

▶ Never encode meaning in colour alone. Every series carries a text label, a pattern, or a direct annotation.

### 5.2 Typography and layout

- Headings: tight tracking, `--sh-deep`, weights 600–700. Scale: 40 / 28 / 20 / 16 px.
- Body: 16 px, line-height 1.6, `--sh-ink`. Chart labels 13 px, axis ticks 12 px.
- Numerals: tabular figures for all statistics (`font-variant-numeric: tabular-nums`).
- Grid: 12-column, max content width 1200 px, 24 px gutters. Modules are cards on `--sh-sand` with `--sh-surface` fill, 1 px `--sh-rule` border, 12 px radius, no drop shadows.
- Whitespace is generous. Each module gets 64 px vertical separation. This is a research instrument, not a dashboard cockpit — do not tile six charts into one screen.

### 5.3 Motion

Transitions of 200 ms ease-out on filter changes so the reader can see bars move rather than snap. Chart entry animation on first scroll into view, once only. Respect `prefers-reduced-motion` and disable all motion when set.

---

## 6. Page Structure and Modules

Single scrolling page with a sticky filter bar. Twelve modules in this order.

### 6.0 Header and sticky filter bar

Fixed to the top after the hero scrolls past. Contains:

- **Lens toggle** — three states: `Employees` / `Employers` / `Compare`. Sets which dataset is active. In `Compare`, modules that have both sides render split; single-side modules dim with a short explanatory note.
- **Filter chips** — active filters shown as removable chips with a "Clear all" action.
- **Live base indicator** — `n = 44 of 44` in tabular figures, updating on every filter change. This element is never hidden.
- **Filter drawer trigger** — opens a shadcn `Sheet` from the right holding the full filter set.
- **Language toggle** — EN / TR. All labels come from the dictionary, so this is a lookup switch.

**Filter set — employee lens:** age group, gender, experience band, activity field, company size, education level, holds a certificate (yes/no).
**Filter set — employer lens:** main activity field, years operating, headcount band, international operations share, manufacturer (yes/no).

All filters are multi-select with AND logic across categories, OR within a category. Every module recomputes from the filtered set. Filter state serialises to the URL query string so a filtered view can be linked in an email or a policy brief.

### 6.1 Hero

Full-width, no chart. Report title, subtitle, one-line framing, and four large statistics with animated count-up:

- **44** employees surveyed
- **20** employer organisations
- **65%** of employers say graduates are not job-ready
- **84%** of employees say clean-energy purpose lifts their satisfaction

Below: a single sentence stating the sample is small and indicative, not statistically representative, with an inline link to the methodology module. Put this honesty at the top, not buried in a footer. It is what makes the rest credible.

Primary action button: **Explore the data** (smooth-scrolls to 6.2). Secondary: **Download the full report (PDF)**.

### 6.2 Who answered

Sample composition, employee and employer side by side.

- Employee side: age × gender grouped bar; education level donut; experience band bar; activity field horizontal bar; company size bar showing the bipolar 34% / 27% split at the extremes.
- Employer side: main activity field bar; years operating donut; headcount band bar; international share bar.
- **Interaction:** clicking any segment applies it as a global filter. This is the primary way users discover that filtering exists — make the affordance obvious with a cursor change and a hover outline.

### 6.3 The Confidence Ladder — signature module

The report's sharpest finding: trust declines as it moves outward from the individual.

- **Self** 78% · **Employer** 64% · **Sector** 53%
- Custom SVG. Three horizontal rungs, descending, each a stacked agreement bar with the percentage set large at the right. Connecting lines between rungs show the drop.
- Toggle: `% agreeing (4–5)` ↔ `Mean score (1–5)` ↔ `Full 5-point distribution`.
- Responds to filters. Watching the ladder reshape when filtered to micro-firms versus 500+ firms is the single most compelling interaction on the page — make sure it animates smoothly.
- Annotation: one sentence explaining that portable individual competence, not corporate or sectoral security, is what the workforce treats as its guarantee.

### 6.4 Likert Explorer

All 13 employee Likert items and all 6 employer Likert items as diverging stacked bars, centred on neutral.

**Controls:**
- Sort by: net agreement / question order / dimension
- Scale view: full 5-point / collapsed 3-point (disagree · neutral · agree)
- Dimension filter: show only Pay, only Security, etc.
- Show mean score markers: on/off
- Hover: exact counts and percentages, plus the base for that item

▶ `certificate_value` has n = 35, not 44. Render it with a distinct base badge and a footnote. Do not let it silently share the 44 denominator.

### 6.5 Pay and conditions

- Wage comparison against other sectors (45.5% lower / 40.9% similar / 2.3% higher / rest not informed) as a horizontal stacked bar.
- Pay fairness, rights compliance, field allowances as small-multiple diverging bars.
- Callout: the 25% "undecided" on field allowances, with the report's interpretation that satisfaction varies by destination, duration, and subcontractor structure.
- Cross-filter: selecting a company-size band updates all three.

### 6.6 The Education–Certification Gap

Two linked visuals.

- **Left:** a 3 × 2 matrix — education-role alignment (aligned / neutral / misaligned) against certificate holding (yes / no). Cell size encodes count. This exposes something the report does not: whether the people whose education does not match their role are the same people lacking certification.
- **Right:** certificate types held, horizontal bar, with "No certificate" (32%) highlighted in the alert colour.

▶ **Framing rule:** the report's headline "47% work in unrelated roles" combines 30% neutral with 18% disagreeing. The explorer must **not** present this as a binary. Show the three-band split honestly and note in the module footnote how the 47% figure was constructed.

Paired employer statistic directly beneath: 65% say new graduates are not job-ready. Same gap, opposite side of the table.

### 6.7 Expectation Asymmetry — signature module

The intellectual centre of the page. Two ranked lists facing each other across a central axis, connected by ribbons where themes correspond.

- **Left (amber):** what employees say keeps them in the sector — pay and benefits competitiveness first, then job security, then development opportunities.
- **Right (teal):** what employers say they actually use to retain staff — retention methods, plus the dominant resignation reason they observe.
- Ribbons connect matching themes; thickness reflects rank. Where employee priority and employer practice diverge, the ribbon is drawn in the alert colour and labelled.

Toggle to a second pairing: employees' certification and development appetite (82% plan training in 2 years) against employers' actual training hours per employee per year and academia collaboration models. Very likely a visible mismatch, and it is new material.

Custom SVG or D3 — Recharts will not do this. Provide a stacked-bar fallback under 768 px.

### 6.8 Employer workforce composition

Heatmap matrix. Rows are staff functions and education levels; columns are the percentage bands 0–20 / 21–40 / 41–60 / 61+. Cell intensity is the count of firms.

Reveals what the report only states in prose: administrative functions run lean while installation and O&M carry the workforce mass, and postgraduate staff are effectively absent.

▶ `edu_dist_doctorate` has zero variance — all 20 firms answered 0–20%. Render as a single highlighted statement above the heatmap, not as a row.

Second panel: gender representation, technical versus management, as paired band bars.

▶ **Contradiction to surface, not hide.** The report's sector overview cites GÜNDER data at roughly 40% female participation. The employer survey shows technical roles mostly in the 21–40% band and management concentrated in 0–20%. Place both figures side by side with sources labelled, and state plainly that the two do not reconcile. Do not pick one.

### 6.9 Turnover and retention friction — previously unpublished

None of this appears in the report.

- Turnover heatmap: 8 staff groups × 5 turnover bands.
- Hardest roles to fill: horizontal bar across 6 position groups.
- Top 3 recruitment barriers: frequency bar from the multi-select.
- Dominant resignation reason: donut.
- Volume-to-headcount relationship over 3 years: horizontal stacked bar — this is the decoupling story, whether growth still produces jobs.

Label this module clearly as extending beyond the published report.

### 6.10 Growth outlook to 2035

- Expected 2-year employment change, 5 categories, diverging bar.
- Drivers behind the expectation, frequency bar. Investment speed dominates at 95%; O&M is near-absent.
- 2035 technology areas expected to drive employment, frequency bar.

▶ **Correct the executive summary error here.** The report states "70% of employers anticipate an increase of 25% or more." The data shows 45% expecting 0–25% growth and 25% expecting more than 25%. So 70% expect *some* increase; only 25% expect 25% or more. The explorer must present the accurate figures. Add a short, neutral note that the printed executive summary phrasing differs, so the two documents can be reconciled by anyone reading both.

### 6.11 Free-text drawer

A collapsible panel holding all quarantined `_other` responses, verbatim, translated, with the question they came from. Employee free text only. **No employer verbatim text, ever** — see §7.

### 6.12 Strategy Matrix

The report's 15 recommendations against 6 stakeholder groups (Employees, Employers, Public, NGO, Academia, Finance), with primary and secondary markers.

- Interactive grid. Filter by stakeholder to see only what applies to a given reader.
- Clicking a row expands the full recommendation text.
- "I am a…" selector at the top produces a filtered, printable action list for that stakeholder. This turns a static annex into something a ministry official or an association can actually use.

Encode primary versus secondary with distinct shapes as well as colour. The source document uses ◉ and 🞈, which are not accessible.

### 6.13 Methodology and limitations

Always expanded, never a hidden accordion. Contains:

- Instrument design, six dimensions per side, METU Human Subjects Ethics Committee approval.
- Recruitment through GÜNDER communication channels and LinkedIn; self-administered employee survey; hybrid employer approach combining self-completed forms with interviewer-administered sessions.
- Fieldwork: employees 4 March – 2 June 2026; employers 4 March – 13 July 2026. Pilot testing ran 18 February – 1 March 2026.
- **Sample account, stated in full:**
  - *Employees* — 48 responses received, of which 4 were pre-launch pilot tests. **44 analysed.**
  - *Employers* — 23 forms received: 16 self-completed online and 7 gathered through interviewer-administered sessions. 3 were pre-launch pilot tests. **20 analysed.**
- Note that the published report gives the employer figures as "16 participants" plus "7 face-to-face interviews", which describes the two collection routes rather than the analysed base. The explorer states the analysed base of 20, which is the denominator every percentage in the report is calculated on.
- Explicit limitations: self-selection bias, white-collar skew (93% hold a bachelor's degree or above), under-representation of subcontractor field personnel, and the fact that no result should be read as a population estimate.
- Full citation and DOI/Zenodo link.

---

## 7. Data Integrity and Ethics Rules

These are not optional. Apply to every module.

▶ **Always show the base.** Every chart displays `n = X` where X is the count for that specific item under the active filter. Never let a percentage float without its denominator.

▶ **Suppress small cells.** When a filtered subset falls below **n = 5**, replace the chart with: *"Base too small to display (n < 5). Widen your filters."* At n = 44, two filters can easily reach single digits. Without this rule the page will manufacture spurious findings such as "100% of women aged 45–54 disagree."

▶ **Warn between 5 and 15.** Render the chart with an amber base badge reading *"Small base — indicative only."*

▶ **Show counts alongside percentages** in every tooltip. "39% (n = 17)" not "39%".

▶ **No record-level display for employers.** The report states employer respondents are known to the researchers. With n = 20 and identifying attributes such as activity field, headcount, and years operating, a filtered employer table would be re-identifiable. **Do not build a record browser for the employer dataset, and do not expose employer free text.** Employer data is available only in aggregate, and filtering the employer lens is capped so that no view returns fewer than 5 records.

▶ **Do not impute or interpolate.** Missing means missing.

▶ **Never round percentages to imply precision the sample cannot support.** One decimal place maximum, and only where the report itself uses one (45.5%, 29.5%).

---

## 8. Accessibility

- WCAG 2.1 AA. Text contrast 4.5:1 minimum, chart elements 3:1 against background.
- Full keyboard operation: every filter, toggle, and interactive chart element is reachable by Tab and operable by Enter or Space. Visible focus rings throughout.
- Every chart has an accessible text alternative: an `aria-label` summarising the finding, plus a **"View as table"** toggle rendering the underlying figures as a real `<table>`. This also serves print and screen-reader users.
- Live regions announce filter changes and the new base count.
- Colour is never the only channel. Diverging Likert bars carry directional labels; the strategy matrix uses shapes.
- Respect `prefers-reduced-motion`.

---

## 9. Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| ≥1200 px | Full two-column module layouts, filter bar inline |
| 768–1199 px | Single column, charts full width, filter bar collapses to a drawer trigger |
| <768 px | Stacked, simplified charts. Asymmetry ribbons fall back to paired bars. Heatmaps become scrollable. Filter drawer becomes a bottom sheet |
| <360 px | Not supported; ensure no horizontal overflow |

Touch targets 44 × 44 px minimum. Charts must not trap page scroll on touch.

---

## 10. Export and Sharing

- **URL state:** all filter and toggle state serialises to the query string. Loading a URL restores the exact view.
- **PNG export per module:** render to canvas, download at 2× with the module title, active filters, base count, and the SolarHub attribution line burned in. A chart that escapes into a slide deck must carry its own provenance.
- **CSV export per module:** the aggregated table behind the current view, respecting active filters and the suppression rules.
- **Print stylesheet:** the whole page prints legibly in greyscale, one module per page, filters printed as a header line.

---

## 11. Lovable Transfer Notes

The site at horizonsolarhub.eu is a Lovable-hosted client-side React SPA. Structure the build so the transfer is a directory copy.

1. **Keep everything under `src/features/employment-explorer/`.** No files outside that directory except the token file and one route registration.
2. **Single entry component:** `<EmploymentExplorer />`, no required props, default export. It must render standalone inside any layout.
3. **No global CSS resets.** The Lovable site has its own. Scope all styling to the feature root.
4. **All tokens in one file.** `tokens.css` is the only file needing edits to match the live site palette.
5. **Data is imported, not fetched.** `import data from './data/survey-data.json'` — no network call at runtime, since the SPA is statically served.
6. **shadcn/ui components:** if the Lovable project already has them, use those imports rather than duplicating. Note any component the site does not yet have in the handoff README.
7. **Route:** expose at `/employment-explorer`, linked from the WP1 or Results section.
8. **SEO:** the SPA does not server-render, so `web_fetch` and crawlers see only the shell. Provide a static meta block and an `og:image` (a PNG of the Confidence Ladder), and flag to the site owner that a prerender or static snapshot is needed for the page to be indexed and to preview correctly on LinkedIn.
9. **Deliver a `HANDOFF.md`** listing every dependency added, every token consumed, the route registration snippet, and the command to re-run the ETL against updated survey exports.

---

## 12. Build Order

1. ETL script and `survey-data.json`, with the assertions in §3.2 passing.
2. Type definitions and the data-access layer with filter predicates.
3. Filter context, URL serialisation, and the base-count calculator including suppression rules.
4. Layout shell, tokens, sticky filter bar.
5. Modules 6.1, 6.2, 6.3 — enough to validate the whole interaction model before building the rest.
6. Modules 6.4 through 6.6.
7. Modules 6.7 and 6.8 (the custom-SVG work; budget the most time here).
8. Modules 6.9 through 6.13.
9. Accessibility pass, table fallbacks, print stylesheet.
10. Export functions.
11. Responsive pass.
12. Lovable packaging and `HANDOFF.md`.

---

## 13. Acceptance Criteria

- [ ] Every figure in the explorer reconciles with the published report, except the three documented corrections in §6.6, §6.8, and §6.10, each of which is visibly annotated.
- [ ] ETL asserts 44 employees and 20 employers, and fails the build otherwise.
- [ ] ETL applies the 2026-03-04 pilot cut-off, and a unit test confirms that applying it to the raw sheets reproduces 44 and 20 exactly.
- [ ] Filtering any dataset below n = 5 suppresses the chart rather than rendering it.
- [ ] No employer record-level view and no employer free text exists anywhere in the build.
- [ ] Every chart shows its base and offers a "View as table" alternative.
- [ ] The full page is keyboard-operable with visible focus.
- [ ] Any filtered view can be shared as a URL and restores exactly.
- [ ] The page renders without horizontal scroll at 360 px.
- [ ] The page prints legibly in greyscale.
- [ ] `<EmploymentExplorer />` mounts inside a bare React app with no configuration beyond importing `tokens.css`.
- [ ] Bundle under 600 KB gzipped.

---

## Items to Confirm

These need Odysseas's sign-off before or during the build. None of them block starting on §3.

1. **Employer sample size — resolved, needs a one-sentence report edit, not an erratum.** The "16 participants" and "7 face-to-face interviews" in the report are the two collection routes, and they sum to the 23 raw records. Three were pre-launch pilots, giving the analysed base of 20 that every published employer percentage reconciles to. An overlap reading (7 people doing both) is arithmetically impossible — it would yield 16 forms, not 23. Suggested replacement text for the methodology section:

   > *"A total of 23 employer responses were collected: 16 self-completed online forms and 7 gathered through interviewer-administered sessions. Three pre-launch pilot responses were excluded, giving an analysed base of 20."*

   Confirm with Tayfun Hız (GÜNAM) that this reading is correct before it goes into either document.

1a. **Repeat organisations.** Worth checking whether any of the 20 employer records represent the same company twice — for example a firm that submitted online and was later interviewed. This would not change the form count but would mean the base covers fewer than 20 distinct organisations, which affects how the explorer labels `n`. Only the research team can confirm this, since respondent identities are known to them and are not in the data.

2. **Executive summary correction.** The "70% anticipate an increase of 25% or more" statement is not supported by the data. Confirm the explorer should show the accurate figures with a reconciliation note, and whether the report will be reissued as v1.1.

3. **Female employment contradiction.** The ~40% GÜNDER sector figure and the employer survey bands do not reconcile. Confirm the explorer presents both with sources rather than choosing one.

4. **Publishing the unreported employer data.** Modules 6.9 and parts of 6.10 publish material absent from the report. Confirm this is cleared with ODTÜ-GÜNAM, METU, and GÜNDER as report authors, and that the ethics approval covers this form of publication.

5. **Employee free-text drawer.** Confirm the verbatim responses contain nothing identifying and can be published. One response references a specific employer's investment behaviour; it should be reviewed individually.

6. **Turkish language version.** The dictionary supports EN/TR from day one, but TR labels need a native review before launch. Confirm who does that.

7. **Zenodo DOI and canonical report URL** for the methodology module citation block.

8. **Excluded responses — resolved from the data, needs authorial confirmation.** All 7 exclusions (4 employee, 3 employer) predate 4 March 2026, and the excluded employee and employer timestamps pair within minutes of one another, indicating the same individuals pilot-testing both instruments. Two excluded employee records are fully complete, so completeness is not the rule; the rule is a pilot cut-off. Confirm with the research team that 4 March 2026 was the live launch date, then add the sample account to the report methodology alongside item 1.

9. **Route and placement** on horizonsolarhub.eu, and whether this should carry HelioHelix branding given the project ends December 2026 and the page is intended to outlive it.
