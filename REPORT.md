# ETL Report — SolarHub Employment Explorer (BuildSpec v1.1 §3)

**Scope of this session:** the data pipeline only (spec §3). No UI, components
or styling were built.

## What was produced

| Deliverable | Path |
|---|---|
| ETL script | `scripts/build-data.ts` (+ `scripts/lib/workbook.ts`, `scripts/lib/dictionary.ts`) |
| Type definitions (§3.5) | `src/types/survey.ts` |
| Output dataset | `src/data/survey-data.json` (180 KB — §2 caps it at 500 KB) |
| Test suite | `tests/etl.test.ts` (39 tests, all passing) |

Run with `npm run build:data`; test with `npm test`. The ETL is idempotent —
re-running reproduces the committed JSON byte-for-byte (covered by a test).

**Output:** 44 employee records, 20 employer records, 69 questions
(24 employee + 45 employer) with EN/TR labels, per-question `n`, and option
dictionaries; derived fields per §3.4; `meta` with the full sample account
(48/23 collected, 4/3 pilot-excluded, fieldwork 2026-03-04→06-02 and
→07-13, all derived from the workbook and asserted, not hard-coded).

## The exclusion rule, implemented and proven

The cut-off is a **date filter at 2026-03-04**, not a completeness filter
(§3.1a). The build fails unless:

- the analysed sheets hold exactly 44 and 20 rows, none pre-cut-off;
- the same cut-off applied to the **raw** sheets (`ham veriler`,
  `İşveren ham veriler`) independently reproduces 44 and 20, matching the
  analysed sheets timestamp-for-timestamp.

The test suite additionally proves the trap: exactly **2 of the 4 excluded
employee pilots are fully complete**, so a completeness filter would retain
them (44 + 2 = 46) — and 10 records *inside* the analysed set have skipped
answers, so completeness was never the criterion in either direction.

## Reconciliation with the published report (verified by tests)

- Wage comparison: 45.5% lower / 40.9% similar / 2.3% higher ✔
- Clean-energy satisfaction: 37/44 = 84.1% agree ✔ (hero stat 84%)
- Graduate readiness: 13/20 = 65% disagree ✔ (hero stat 65%)
- Education–role: 23 aligned / 13 neutral / 8 misaligned; neutral+misaligned
  = 47.7% ✔ (the "47%" §6.6 asks to decompose)
- 2-year employment change: 9/20 = 45% expect 0–25% growth, 5/20 = 25%
  expect >25% ✔ (the §6.10 executive-summary correction)
- Investment speed drives 19/20 = 95% of employment-change expectations ✔
- Employer Q12 doctorate share: all 20 answered 0–20% — zero variance ✔

**One rounding note:** the Confidence Ladder is 34/44 = **77.3%** (self),
28/44 = 63.6%, 23/44 = 52.3%. The spec's §6.3 quotes 78 / 64 / 53. The 78
appears to come from rounding the two agreement components separately
(47.7%→48 + 29.5%→30). The data layer ships exact counts; how to round is a
UI decision, but the ladder module should not hard-code "78".

## Anomalies the spec did not anticipate

1. **Leftover pivot fragment in `İşveren dahil edilenler`.** Rows 24–33,
   columns 28–30 hold a stray female-share mini pivot table below the 20
   data rows. The ETL accepts only rows whose Timestamp column holds a
   numeric Excel serial, which drops it (and any trailing blanks) safely.

2. **"Split on comma" (§3.2 step 5) is impossible as written.** Several
   option labels themselves contain commas ("Kurulum, Taahhüt, İnşaat,
   İşletme, Bakım ve Onarım"; "Özel/tamamlayıcı sağlık sigortası,
   yemek/ulaşım desteği vb."). The ETL instead tokenises multi-select cells
   by greedy longest-first matching against the known option strings
   (Turkish-case-insensitive); only unmatched remainders go to `_other`, and
   free-text remainders are kept whole, never split on their own commas.
   A test asserts no option fragment ever leaks into `_other`.

3. **Employee Q23 (`loyalty_factor`) — probable missing 7th option.**
   Following §3.3 and the six §4.1 options strictly, 14 responses are
   quarantined in `_other`. But **7 of those 14 share the identical
   structured wording** "İş güvencesi eksikliği (işin sürekli olmaması,
   sözleşmelerin proje bazlı olması)" — job-security lack. That is form-
   option phrasing, not free text, and §6.7's own narrative ranks "job
   security" second among employee retention factors, which matches n=7
   exactly (pay 14, job security 7, development 5). **The §4.1 list of six
   options is almost certainly missing this one.** Needs sign-off; adopting
   it is a one-line dictionary change plus a re-run. Until then the item's
   chart would show an implausibly large "Other / unclassified" bar (14 of
   43). (Also: the spec says Q23 "returned 15 distinct values"; the
   analysed sheet has 14 distinct values plus one blank.)

   *Build-stage addendum:* module §6.7 (Expectation Asymmetry) requires
   the pay → job security → development ranking, so the UI layer counts
   the seven identically worded quarantined responses as a "Job security"
   theme (`JOB_SECURITY_TR` in
   `src/features/employment-explorer/lib/module-data.ts`, unit-tested,
   footnoted in the module). The ETL contract is untouched — the records
   stay quarantined in `_other`; once the 7th option is signed off, the
   dictionary change makes this bridge constant obsolete.

4. **Employer activity fields are absent from the §4 dictionary.** §4.2
   lists no option set for `main_activity_field` / `other_activity_fields`,
   and the employer form used two options the employee form (§4.1) lacks:
   "Yazılım ve Dijitalleşme Hizmetleri" and "Güneş Santralı Yatırımcısı"
   (3 of 20 firms as main activity). Routing them to `_other` would null a
   sixth of the employer profile chart, so the ETL recognises them with
   **ETL-supplied English labels** — "Software and digitalisation services",
   "Solar plant investor" — marked in the question `notes`. Confirm the
   wording against the report. One typed answer ("Güneş Paneli ve Hücre
   Distribitörlüğü ve Tedariği") stays in `_other`.

5. **`retention_methods`: unlisted option selected twice.** "İşin anlamı ve
   sosyal etki" (meaning of work and social impact) appears in 2 records
   but is not among the five §4.2 options → `_other`, flagged here as a
   likely sixth questionnaire option.

6. **`employment_change_drivers`: "Teşvikler" × 5.** Five of 20 employers
   entered "Teşvikler" (incentives), not among the six §4.2 options →
   `_other`. At a quarter of the sample this deserves sign-off. Two further
   singleton free-texts also quarantined. The **O&M-requirements option was
   selected by nobody** (spec §6.10 says "near-absent"; it is literally
   zero) — its Turkish label never occurs in the data and is reconstructed
   in the dictionary.

7. **Interviewer-typed variants.** The MoNE academia-collaboration option
   appears only as an ALL-CAPS entry ("MEB ÇIRAKLIK EĞİTİMİ, STAJYER VE
   İŞKUR PROGRAMLARI") — consistent with the 7 interviewer-administered
   sessions. Matched Turkish-case-insensitively to the §4.2 option.

8. **`has_certificate` edge cases.** 16 employees derive to `false`: 14 who
   chose "Sertifikam bulunmuyor." (the report's 32% stat keeps its n=14),
   one who wrote "na", and one whose only entries ("Diksiyon, Proje
   Yöneticiliği") are unrecognised and quarantined — that respondent may
   actually hold certificates, but §3.4's rule is applied literally.
   Trailing-comma artefacts ("Sertifikam bulunmuyor., ") are handled.

9. **`strategyMatrix` is empty.** The 15 recommendations (§6.12) live in the
   published PDF, which is not part of the source material for this session.
   The `Recommendation` interface is defined in `src/types/survey.ts`;
   transcribe the matrix into the ETL before building module §6.12.
   Likewise `reportFigure` is omitted from all questions — the PDF's figure
   numbers are needed to fill it.

10. **Likert Turkish scale labels are ETL-supplied.** The workbook stores
    bare integers 1–5; standard Turkish agreement-scale wording was added
    for the TR locale and should get native review (spec "Items to
    Confirm" 6).

11. **Employer verbatim text: internal spec tension to resolve.** §3.3 says
    `annual_volume` is exposed "as a raw verbatim list in the methodology
    drawer", while §6.11/§7 say "no employer verbatim text, ever". The data
    layer keeps `annual_volume` and employer `_other` values (the §3.5
    schema ships employer records client-side by design); whether any of it
    renders is a UI decision that needs an explicit call when §6.13/§6.11
    are built.

## Quarantined `_other` totals (nothing discarded, no spurious categories)

| Question | Entries | Content |
|---|---|---|
| `loyalty_factor` | 14 | 7 × job-security wording (see #3) + 7 free-text |
| `employment_change_drivers` | 7 | 5 × "Teşvikler" + 2 singletons |
| `certificates` | 3 | "na", "Diksiyon, Proje Yöneticiliği", "Ges kurulum kursu" |
| `retention_methods` | 2 | 2 × "İşin anlamı ve sosyal etki" |
| `career_plan_5y` | 1 | geothermal free-text (§3.3) |
| `growth_tech_areas` | 1 | policy-scepticism remark |
| `other_activity_fields` | 1 | distributor/supply typed answer |

The "1 ve 3" career-plan answer is stored as `career_plan_5y_multi:
["managerial", "current_role"]` with a record flag, per §3.3 — it is not in
`_other`.
