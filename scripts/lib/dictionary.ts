/**
 * Data dictionary for the ETL: maps every Turkish column header and response
 * value in the two analysed sheets to stable question IDs, option value slugs
 * and the English labels of BuildSpec v1.1 §4 (verbatim — they follow the
 * published report's own wording).
 *
 * Where the workbook contains structured questionnaire options that §4 does
 * not list (employer activity fields), the English label is ETL-supplied and
 * the option is marked `etlSupplied` — see REPORT.md. Everything else that
 * does not match a §4 option is routed to `_other`, never mapped.
 */

import type { QuestionType } from '../../src/types/survey';

export interface OptionDef {
  value: string;
  labelEn: string;
  /** Canonical Turkish label (as it appears in the workbook where observed). */
  labelTr: string;
  /** Additional accepted raw spellings beyond labelTr (matched normalised). */
  trVariants?: string[];
  /** English label not present in BuildSpec §4 — supplied by the ETL. */
  etlSupplied?: boolean;
}

export interface QuestionDef {
  id: string;
  /** 1-based column index in the analysed sheet. */
  col: number;
  dimension: string;
  labelEn: string;
  shortLabel: string;
  type: QuestionType;
  options?: OptionDef[];
  notes?: string;
  /**
   * Distinctive substring that must appear in the Turkish column header —
   * guards column order when the ETL is re-run against a fresh export.
   */
  headerKey: string;
}

/* ------------------------------------------------------------------ */
/* Normalisation helpers                                               */
/* ------------------------------------------------------------------ */

/** Collapse all whitespace runs to single spaces and trim. */
export function normSpace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Turkish-aware case fold for matching. Length-preserving so it can be used
 * for positional comparisons during multi-select tokenisation.
 */
export function foldTr(s: string): string {
  return s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

/** Normalisation used for single-select lookups (also unifies "0 - 20" / "0-20"). */
export function normValue(s: string): string {
  return foldTr(normSpace(s)).replace(/\s*-\s*/g, '-');
}

/* ------------------------------------------------------------------ */
/* Shared option sets                                                  */
/* ------------------------------------------------------------------ */

export const LIKERT_OPTIONS: OptionDef[] = [
  { value: '1', labelEn: 'Strongly disagree', labelTr: '1 - Kesinlikle katılmıyorum' },
  { value: '2', labelEn: 'Disagree', labelTr: '2 - Katılmıyorum' },
  { value: '3', labelEn: 'Neutral', labelTr: '3 - Kararsızım' },
  { value: '4', labelEn: 'Agree', labelTr: '4 - Katılıyorum' },
  { value: '5', labelEn: 'Strongly agree', labelTr: '5 - Kesinlikle katılıyorum' },
];

/** 0–20 / 21–40 / 41–60 / 61+ percentage bands (staff, education, employment type, female share). */
const PCT_BAND: OptionDef[] = [
  { value: '0_20', labelEn: '0–20%', labelTr: '%0 - 20', trVariants: ['%0-20 arası', '%0 - 20 arası', '%0-20'] },
  { value: '21_40', labelEn: '21–40%', labelTr: '%21 - 40', trVariants: ['%21-40 arası', '%21 - 40 arası', '%21-40'] },
  { value: '41_60', labelEn: '41–60%', labelTr: '%41 - 60', trVariants: ['%41-60 arası', '%41 - 60 arası', '%41-60'] },
  { value: '61_plus', labelEn: 'Over 61%', labelTr: "%61'den fazla", trVariants: ["%61'den fazlası"] },
];

const TURNOVER_BAND: OptionDef[] = [
  { value: '0_10', labelEn: '0–10%', labelTr: '%0 - 10', trVariants: ['%0-10 arası', '%0-10'] },
  { value: '11_20', labelEn: '11–20%', labelTr: '%11 - 20', trVariants: ['%11-20 arası', '%11-20'] },
  { value: '21_30', labelEn: '21–30%', labelTr: '%21 - 30', trVariants: ['%21-30 arası', '%21-30'] },
  { value: '31_40', labelEn: '31–40%', labelTr: '%31 - 40', trVariants: ['%31-40 arası', '%31-40'] },
  { value: '41_plus', labelEn: 'Over 41%', labelTr: "%41'den fazla" },
];

/**
 * Activity fields. The first nine carry the §4.1 English labels verbatim and
 * are shared with the employee questionnaire. The last two occur only in the
 * employer questionnaire and are missing from the §4 dictionary; their
 * English labels are ETL-supplied (flagged in REPORT.md).
 */
const ACTIVITY_FIELDS: OptionDef[] = [
  { value: 'cell_panel_manufacturing', labelEn: 'Cell and panel manufacturing', labelTr: 'Hücre ve Panel Üretimi' },
  { value: 'installation_om', labelEn: 'Installation, contracting, construction, O&M', labelTr: 'Kurulum, Taahhüt, İnşaat, İşletme, Bakım ve Onarım' },
  { value: 'rd_activities', labelEn: 'R&D activities', labelTr: 'Araştırma ve Geliştirme Faaliyetleri' },
  { value: 'engineering_consultancy', labelEn: 'Engineering and technical consultancy', labelTr: 'Mühendislik ve Teknik Müşavirlik' },
  { value: 'project_development', labelEn: 'Project development and consulting', labelTr: 'Proje Geliştirme ve Danışmanlık' },
  { value: 'plant_services', labelEn: 'Solar plant service provision', labelTr: 'Güneş Santrali Hizmet Sağlayıcısı (temizlik, güvenlik, vb)' },
  { value: 'inspection_certification', labelEn: 'Inspection, testing and certification', labelTr: 'Denetim, Test ve Belgelendirme' },
  { value: 'component_manufacturing', labelEn: 'System component manufacturing', labelTr: 'Güneş Santrali Sistem Bileşeni Üretimi (evirici, konstrüksiyon, kablolama, vb.)' },
  { value: 'solar_thermal', labelEn: 'Solar thermal system services', labelTr: 'Güneş Isıl Sistem Hizmetler' },
  { value: 'software_digitalisation', labelEn: 'Software and digitalisation services', labelTr: 'Yazılım ve Dijitalleşme Hizmetleri', etlSupplied: true },
  { value: 'plant_investor', labelEn: 'Solar plant investor', labelTr: 'Güneş Santralı Yatırımcısı', etlSupplied: true },
];

/** Employee-facing activity list: exactly the nine §4.1 options. */
const EMPLOYEE_ACTIVITY_FIELDS = ACTIVITY_FIELDS.slice(0, 9);

/* ------------------------------------------------------------------ */
/* Employee questions (§4.1)                                           */
/* ------------------------------------------------------------------ */

export const EMPLOYEE_QUESTIONS: QuestionDef[] = [
  {
    id: 'age', col: 2, dimension: 'Profile', type: 'single',
    labelEn: 'Age group', shortLabel: 'Age group', headerKey: 'Yaşınız',
    options: [
      { value: '18_24', labelEn: '18–24', labelTr: '18 – 24' },
      { value: '25_34', labelEn: '25–34', labelTr: '25 – 34' },
      { value: '35_44', labelEn: '35–44', labelTr: '35 – 44' },
      { value: '45_54', labelEn: '45–54', labelTr: '45 – 54' },
      { value: '55_plus', labelEn: '55+', labelTr: '55 ve üzeri' },
    ],
  },
  {
    id: 'gender', col: 3, dimension: 'Profile', type: 'single',
    labelEn: 'Gender', shortLabel: 'Gender', headerKey: 'Cinsiyetiniz',
    options: [
      { value: 'male', labelEn: 'Male', labelTr: 'Erkek' },
      { value: 'female', labelEn: 'Female', labelTr: 'Kadın' },
      { value: 'prefer_not_say', labelEn: 'Prefer not to say', labelTr: 'Belirtmek istemiyorum.' },
    ],
  },
  {
    id: 'experience', col: 4, dimension: 'Profile', type: 'single',
    labelEn: 'Total experience in the solar sector', shortLabel: 'Experience',
    headerKey: 'toplam iş deneyiminiz',
    options: [
      { value: '1_3', labelEn: '1–3 yr', labelTr: '1 – 3 yıl' },
      { value: '3_5', labelEn: '3–5 yr', labelTr: '3 – 5 yıl' },
      { value: '5_10', labelEn: '5–10 yr', labelTr: '5 – 10 yıl' },
      { value: '10_plus', labelEn: '10+ yr', labelTr: '10 yıl üzeri' },
    ],
  },
  {
    id: 'activity_field', col: 5, dimension: 'Profile', type: 'single',
    labelEn: 'Main field of activity', shortLabel: 'Field of activity',
    headerKey: 'hangi ana faaliyet alanında',
    options: EMPLOYEE_ACTIVITY_FIELDS,
  },
  {
    id: 'company_size', col: 6, dimension: 'Profile', type: 'single',
    labelEn: 'Company headcount', shortLabel: 'Company size',
    headerKey: 'toplam personel sayısı',
    options: [
      { value: '1_9', labelEn: '1–9', labelTr: '1 – 9' },
      { value: '10_49', labelEn: '10–49', labelTr: '10 – 49' },
      { value: '50_149', labelEn: '50–149', labelTr: '50 – 149' },
      { value: '150_299', labelEn: '150–299', labelTr: '150 – 299' },
      { value: '300_499', labelEn: '300–499', labelTr: '300 – 499' },
      { value: '500_plus', labelEn: '500+', labelTr: '500 ve üzeri' },
    ],
  },
  {
    id: 'education_level', col: 7, dimension: 'Profile', type: 'single',
    labelEn: 'Highest level of education completed', shortLabel: 'Education level',
    headerKey: 'en yüksek eğitim seviyesini',
    options: [
      { value: 'secondary', labelEn: 'Secondary', labelTr: 'Ortaöğretim' },
      { value: 'technical_high_school', labelEn: 'Technical or vocational high school', labelTr: 'Teknik Lise/ Endüstri Meslek Lisesi' },
      { value: 'bachelors', labelEn: "Bachelor's", labelTr: 'Lisans' },
      { value: 'masters', labelEn: "Master's", labelTr: 'Lisansüstü' },
      { value: 'doctorate', labelEn: 'Doctorate', labelTr: 'Doktora' },
    ],
  },
  {
    id: 'certificates', col: 8, dimension: 'Competence', type: 'multi',
    labelEn: 'Professional certificates held', shortLabel: 'Certificates held',
    headerKey: 'mesleki sertifikalar nelerdir',
    notes: 'Multi-select with free-text artefacts: "na", trailing commas and unlisted course names are quarantined in _other; "Engineering diploma" is kept as a distinct low-count category (§3.3).',
    options: [
      { value: 'ohs', labelEn: 'OHS certificates', labelTr: 'İş Sağlığı ve Güvenliği (İSG) Sertifikaları' },
      { value: 'none', labelEn: 'No certificate', labelTr: 'Sertifikam bulunmuyor.' },
      { value: 'manufacturer_training', labelEn: 'Manufacturer-focused technical training', labelTr: 'Üretici Odaklı Teknik Eğitim Sertifikaları' },
      { value: 'master_craftsman', labelEn: 'Master craftsman certificate', labelTr: 'Ustalık Belgesi' },
      { value: 'vqa_pv', labelEn: 'VQA photovoltaic power systems personnel', labelTr: 'MYK (Mesleki Yeterlilik Kurumu) Fotovoltaik Güç Sistemleri Personeli' },
      { value: 'vqa_thermal', labelEn: 'VQA solar thermal system personnel', labelTr: '(MYK) Güneş Isıl Sistem Personeli' },
      { value: 'ekat', labelEn: 'High voltage (EKAT) certificate', labelTr: 'Yüksek Gerilim / EKAT Belgesi' },
      { value: 'soft_skill', labelEn: 'Soft-skill training', labelTr: 'Soft Skill eğitim sertifikaları' },
      { value: 'engineering_diploma', labelEn: 'Engineering diploma', labelTr: 'Mühendislik diploması' },
    ],
  },
  {
    id: 'education_role_match', col: 9, dimension: 'Competence', type: 'likert5',
    labelEn: 'My education relates directly to my current role', shortLabel: 'Education–role match',
    headerKey: 'aldığım eğitim şu an yürüttüğüm görevle',
  },
  {
    id: 'certificate_value', col: 10, dimension: 'Competence', type: 'likert5',
    labelEn: 'My certificates improve my work quality and OHS awareness', shortLabel: 'Certificate value',
    headerKey: 'mesleki sertifikalar (MYK vb.)',
    notes: 'Only 35 of 44 answered — non-certificate-holders skipped it. The denominator for this item is 35, not 44 (§3.3).',
  },
  {
    id: 'training_support', col: 11, dimension: 'Conditions', type: 'likert5',
    labelEn: 'My company gives sufficient training support for new technologies', shortLabel: 'Training support',
    headerKey: 'yeterli eğitim desteği',
  },
  {
    id: 'pay_fairness', col: 12, dimension: 'Pay', type: 'likert5',
    labelEn: 'My pay and bonuses match the difficulty and responsibility of my job', shortLabel: 'Pay fairness',
    headerKey: 'maaş ve primlerin yeterli',
  },
  {
    id: 'rights_compliance', col: 13, dimension: 'Pay', type: 'likert5',
    labelEn: 'My employer complies with overtime, holiday pay and leave rights', shortLabel: 'Rights compliance',
    headerKey: 'fazla mesai ve resmî tatil',
  },
  {
    id: 'field_allowances', col: 14, dimension: 'Pay', type: 'likert5',
    labelEn: 'I am satisfied with accommodation, travel and per-diem on assignments', shortLabel: 'Field allowances',
    headerKey: 'konaklama, ulaşım ve harcırah',
  },
  {
    id: 'confidence_self', col: 15, dimension: 'Security', type: 'likert5',
    labelEn: 'My technical knowledge means I have no unemployment concern', shortLabel: 'Confidence: self',
    headerKey: 'Mevcut teknik bilgi ve tecrübem',
  },
  {
    id: 'confidence_employer', col: 16, dimension: 'Security', type: 'likert5',
    labelEn: "My company's market position means I have no unemployment concern", shortLabel: 'Confidence: employer',
    headerKey: 'Şirketinizin piyasadaki durumu',
  },
  {
    id: 'clean_energy_satisfaction', col: 17, dimension: 'Satisfaction', type: 'likert5',
    labelEn: 'Working for a clean future adds significantly to my job satisfaction', shortLabel: 'Clean-energy purpose',
    headerKey: 'temiz geleceğe hizmet eden',
  },
  {
    id: 'work_life_balance', col: 18, dimension: 'Satisfaction', type: 'likert5',
    labelEn: 'Seasonal peaks and field work harm my work–life balance', shortLabel: 'Work–life balance',
    headerKey: 'Mevsimsel yoğunluklar',
  },
  {
    id: 'confidence_sector', col: 19, dimension: 'Security', type: 'likert5',
    labelEn: 'The Turkish solar sector will grow steadily and is a secure long-term career', shortLabel: 'Confidence: sector',
    headerKey: 'önümüzdeki 10 yıl içinde istikrarlı',
  },
  {
    id: 'mobility_willingness', col: 20, dimension: 'Satisfaction', type: 'likert5',
    labelEn: 'I have no reservations about assignments in other locations', shortLabel: 'Mobility willingness',
    headerKey: 'farklı konumlarda',
  },
  {
    id: 'development_intent', col: 21, dimension: 'Future', type: 'likert5',
    labelEn: 'I plan training or certification in the next 2 years', shortLabel: 'Development intent',
    headerKey: 'mesleki yetkinliklerimi artırmaya',
  },
  {
    id: 'subcontractor_status', col: 22, dimension: 'Security', type: 'single',
    labelEn: 'Effect of subcontractor employment on job continuity', shortLabel: 'Subcontractor status',
    headerKey: 'Taşeron (alt yüklenici)',
    options: [
      { value: 'permanent_staff', labelEn: 'Not a subcontractor employee, permanent staff', labelTr: 'Taşeron firmada çalışmıyorum, iş yerinde kadrolu olarak çalışıyorum.' },
      { value: 'no_difference', labelEn: 'Being a subcontractor makes no difference, work is always available', labelTr: 'Hayır, taşeron olmamın bir önemi yok; işim her zaman hazır.' },
      { value: 'normal_project_periods', labelEn: 'I accept it as normal since I work only during project periods', labelTr: 'Sadece proje dönemlerinde çalıştığım için bu durumu normal karşılıyorum.' },
      { value: 'risky_dependence', labelEn: 'I find continuity risky due to dependence on the main contractor', labelTr: 'Ana şirketin projelerine bağlı olduğum için iş sürekliliğini riskli buluyorum.' },
    ],
  },
  {
    id: 'wage_comparison', col: 23, dimension: 'Pay', type: 'single',
    labelEn: 'Solar sector pay compared with other sectors', shortLabel: 'Wage comparison',
    headerKey: 'maaş seviyelerini',
    options: [
      { value: 'lower', labelEn: 'Lower than other sectors', labelTr: 'Diğer sektörlerden daha düşük.' },
      { value: 'similar', labelEn: 'Similar to other sectors', labelTr: 'Diğer sektörlerle benzer seviyede.' },
      { value: 'higher', labelEn: 'Higher than other sectors', labelTr: 'Diğer sektörlerden daha yüksek.' },
      { value: 'not_informed', labelEn: 'Not informed', labelTr: 'Bilgi sahibi değilim' },
    ],
  },
  {
    id: 'loyalty_factor', col: 24, dimension: 'Future', type: 'single',
    labelEn: 'Most decisive factor for a long-term career in solar', shortLabel: 'Long-term career factor',
    headerKey: 'uzun vadeli sürdürmenizde',
    notes: 'Single-select that returned many free-text values; everything outside the six defined options is quarantined in _other and charted only as "Other / unclassified" (§3.3). NOTE: 7 of the quarantined responses share the identical structured wording "İş güvencesi eksikliği (işin sürekli olmaması, sözleşmelerin proje bazlı olması)" — see REPORT.md.',
    options: [
      { value: 'pay_lagging', labelEn: 'Pay and benefits lagging other sectors', labelTr: 'Maaş ve yan hakların diğer sektörlerin gerisinde kalması' },
      { value: 'limited_development', labelEn: 'Limited professional development opportunities', labelTr: 'Meslekî gelişim olanaklarının kısıtlı olması' },
      { value: 'fringe_benefits', labelEn: 'Diversity of fringe benefits', labelTr: 'Yan hakların (sağlık sigortası, yol/yemek, ikramiye vb.) çeşitliliği' },
      { value: 'tech_change_concern', labelEn: 'Concern about keeping pace with technological change', labelTr: 'Sektördeki teknolojik değişim hızına ayak uyduramama endişesi' },
      { value: 'subcontracting_uncertainty', labelEn: 'Uncertainty from the subcontracting system', labelTr: 'Taşeron sisteminden kaynaklı belirsizlikler' },
      { value: 'no_policy_confidence', labelEn: 'No confidence in sector sustainability due to policy', labelTr: 'Politikalar sebebiyle sektörün sürdürülebilirliğine inancım yok' },
    ],
  },
  {
    id: 'career_plan_5y', col: 25, dimension: 'Future', type: 'single',
    labelEn: 'Where I plan to continue my career over the next 5 years', shortLabel: '5-year career plan',
    headerKey: '5 yıllık süreçte profesyonel kariyerinizi',
    notes: 'One respondent answered "1 ve 3" (two options selected) — stored as career_plan_5y_multi and flagged; one free-text geothermal answer is in _other (§3.3).',
    options: [
      { value: 'managerial', labelEn: 'Stay in solar and take on managerial responsibility', labelTr: 'Güneş enerjisi sektöründe kalarak, yönetimsel (ekip lideri, şef, müdür vb.) sorumluluklar üstlenmek.' },
      { value: 'new_technologies', labelEn: 'Stay in solar and move toward new technologies and specialisations', labelTr: 'Güneş enerjisi sektöründe kalarak, yeni teknolojilere ve uzmanlık alanlarına yönelmek.' },
      { value: 'current_role', labelEn: 'Stay in solar and continue specialising in my current role', labelTr: 'Güneş enerjisi sektöründe kalarak, mevcut rolümde uzmanlaşmaya devam etmek.' },
      { value: 'leave_sector', labelEn: 'Move to a different field or sector', labelTr: 'Güneş enerjisi sektörü dışındaki farklı bir alana veya sektöre geçiş yapmak.' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Employer questions (§4.2)                                           */
/* ------------------------------------------------------------------ */

function bandQ(
  id: string, col: number, dimension: string, labelEn: string, shortLabel: string,
  headerKey: string, options: OptionDef[], notes?: string,
): QuestionDef {
  return { id, col, dimension, labelEn, shortLabel, type: 'band', headerKey, options, ...(notes ? { notes } : {}) };
}

export const EMPLOYER_QUESTIONS: QuestionDef[] = [
  {
    id: 'main_activity_field', col: 2, dimension: 'Profile', type: 'single',
    labelEn: 'Field employing the most personnel', shortLabel: 'Main activity field',
    headerKey: 'en çok çalışan istihdam edilen faaliyet',
    notes: 'The employer questionnaire offered two activity options absent from the BuildSpec §4 dictionary (software & digitalisation services; solar plant investor); their English labels are ETL-supplied — see REPORT.md.',
    options: ACTIVITY_FIELDS,
  },
  {
    id: 'other_activity_fields', col: 3, dimension: 'Profile', type: 'multi',
    labelEn: 'Other fields of operation', shortLabel: 'Other activity fields',
    headerKey: 'faaliyet gösterdiği diğer alanları',
    notes: 'Same ETL-supplied options as main_activity_field; one typed distributor/supply answer is quarantined in _other.',
    options: ACTIVITY_FIELDS,
  },
  {
    id: 'years_operating', col: 4, dimension: 'Profile', type: 'single',
    labelEn: 'Years operating in solar', shortLabel: 'Years operating',
    headerKey: 'kaç yıldır faaliyet',
    options: [
      { value: '0_3', labelEn: '0–3 years', labelTr: '0 - 3 yıl' },
      { value: '4_7', labelEn: '4–7 years', labelTr: '4 - 7 yıl' },
      { value: '8_11', labelEn: '8–11 years', labelTr: '8 - 11 yıl' },
      { value: '12_15', labelEn: '12–15 years', labelTr: '12 - 15 yıl' },
    ],
  },
  {
    id: 'total_employees', col: 5, dimension: 'Profile', type: 'numeric',
    labelEn: 'Total employees', shortLabel: 'Total employees',
    headerKey: 'toplam çalışan sayısı',
    notes: 'Free numeric text parsed to integer; banded into employee_count_band to match the employee-side company-size bands (§3.3).',
  },
  {
    id: 'annual_volume', col: 6, dimension: 'Profile', type: 'freetext',
    labelEn: 'Approximate annual business volume', shortLabel: 'Annual volume',
    headerKey: 'yıllık iş hacminizi',
    notes: 'Free text with mixed units — not normalised and not charted; exposed only as a raw verbatim list in the methodology drawer (§3.3).',
  },
  {
    id: 'international_share', col: 7, dimension: 'Profile', type: 'band',
    labelEn: 'Share of operations carried out abroad', shortLabel: 'International share',
    headerKey: 'yurt dışında gerçekleştirilmektedir',
    options: [
      { value: 'under_20', labelEn: 'Under 20%', labelTr: "%20'den azı" },
      { value: '40_60', labelEn: '40–60%', labelTr: '%40 - %60 arası' },
      { value: 'over_80', labelEn: 'Over 80%', labelTr: "%80'den fazlası" },
    ],
  },

  bandQ('staff_dist_project_dev', 8, 'Composition', 'Staff distribution: project development and engineering design', 'Staff: project dev & design', 'Proje Geliştirme ve Mühendislik Tasarımı', PCT_BAND),
  bandQ('staff_dist_install', 9, 'Composition', 'Staff distribution: installation, contracting, construction and O&M', 'Staff: installation & O&M', 'faaliyet alanlarına göre dağılımını yaklaşık yüzde (%) olarak belirtiniz.  [Kurulum', PCT_BAND),
  bandQ('staff_dist_manufacturing', 10, 'Composition', 'Staff distribution: panel, cell and other production line workers', 'Staff: production lines', 'Üretim Hatlarında', PCT_BAND),
  bandQ('staff_dist_admin', 11, 'Composition', 'Staff distribution: administrative services', 'Staff: administration', 'İdari Hizmetler', PCT_BAND),
  bandQ('staff_dist_sales', 12, 'Composition', 'Staff distribution: sales services', 'Staff: sales', 'Satış Hizmetleri]', PCT_BAND),

  bandQ('edu_dist_doctorate', 13, 'Composition', 'Workforce distribution: doctorate', 'Education: doctorate', '[Doktora]', PCT_BAND,
    'Zero variance — all 20 firms answered 0–20%. Render as a single labelled statement, not a chart (§3.3).'),
  bandQ('edu_dist_postgrad', 14, 'Composition', 'Workforce distribution: postgraduate', 'Education: postgraduate', '[Lisansüstü]', PCT_BAND),
  bandQ('edu_dist_bachelor', 15, 'Composition', 'Workforce distribution: bachelor graduates', 'Education: bachelor', '[Lisans Mezunu]', PCT_BAND),
  bandQ('edu_dist_associate', 16, 'Composition', 'Workforce distribution: associate degree / vocational school', 'Education: associate', '[Ön Lisans', PCT_BAND),
  bandQ('edu_dist_secondary', 17, 'Composition', 'Workforce distribution: secondary education', 'Education: secondary', 'eğitim seviyesine göre dağılımını yaklaşık yüzde (%) olarak belirtiniz.  [Ortaöğretim]', PCT_BAND),
  bandQ('edu_dist_primary', 18, 'Composition', 'Workforce distribution: primary education', 'Education: primary', '[İlköğretim]', PCT_BAND),

  bandQ('turnover_manager', 19, 'Composition', 'Turnover: senior/middle manager and strategic planning', 'Turnover: managers', 'devir oranı* (turnover rate) nasıl tanımlarsınız?  [Üst/Orta Düzey', TURNOVER_BAND),
  bandQ('turnover_project_specialist', 20, 'Composition', 'Turnover: project specialist or engineer', 'Turnover: project specialists', '[Proje Uzmanı / Mühendis]', TURNOVER_BAND),
  bandQ('turnover_rd_engineer', 21, 'Composition', 'Turnover: R&D engineer', 'Turnover: R&D engineers', '[Ar-Ge Mühendisi]', TURNOVER_BAND),
  bandQ('turnover_project_technical', 22, 'Composition', 'Turnover: project technical personnel', 'Turnover: project technical', '[Proje Teknik Personeli]', TURNOVER_BAND),
  bandQ('turnover_entry_engineer', 23, 'Composition', 'Turnover: entry-level engineers', 'Turnover: entry-level engineers', '[Giriş Seviyesi Mühendisl', TURNOVER_BAND),
  bandQ('turnover_technician', 24, 'Composition', 'Turnover: specialist technicians and operators', 'Turnover: technicians', '[Uzman Teknisyen ve Opera', TURNOVER_BAND),
  bandQ('turnover_field_worker', 25, 'Composition', 'Turnover: field worker (unskilled)', 'Turnover: field workers', '[Saha elemanı', TURNOVER_BAND),
  bandQ('turnover_admin', 26, 'Composition', 'Turnover: administrative personnel', 'Turnover: administration', '[İdari Personel]', TURNOVER_BAND),

  bandQ('employment_type_permanent', 27, 'Composition', 'Workforce by employment type: full-time / permanent', 'Employment: permanent', '[Tam Zamanlı/Kadrolu]', PCT_BAND),
  bandQ('employment_type_project', 28, 'Composition', 'Workforce by employment type: project-based / temporary', 'Employment: project-based', '[Proje Bazlı/ Geçici]', PCT_BAND),
  bandQ('female_technical', 29, 'Composition', 'Female employee share: technical positions', 'Female share: technical', 'kadın çalışan oranı yaklaşık olarak nedir? [Teknik', PCT_BAND),
  bandQ('female_management', 30, 'Composition', 'Female employee share: management and administrative positions', 'Female share: management', '[Yönetim ve İdari', PCT_BAND),

  {
    id: 'certified_performance', col: 31, dimension: 'Skills', type: 'likert5',
    labelEn: 'Certified personnel meet our quality and application standards', shortLabel: 'Certified performance',
    headerKey: 'belgelendirilmiş personelin saha performansı',
  },
  {
    id: 'poaching_frequency', col: 32, dimension: 'Retention', type: 'likert5',
    labelEn: 'Our trained staff are frequently poached by competitors', shortLabel: 'Poaching frequency',
    headerKey: 'rakip firmalar tarafından transfer',
  },
  {
    id: 'graduate_readiness', col: 33, dimension: 'Skills', type: 'likert5',
    labelEn: "New graduates' job readiness and curriculum adequacy meet expectations", shortLabel: 'Graduate readiness',
    headerKey: 'göreve hazır bulunuşluk',
  },
  {
    id: 'regulatory_complexity', col: 34, dimension: 'Challenges', type: 'likert5',
    labelEn: 'Regulatory complexity harms our long-term HR strategy', shortLabel: 'Regulatory complexity',
    headerKey: 'mevzuatın karmaşıklığı',
  },
  {
    id: 'outflow_other_sectors', col: 35, dimension: 'Retention', type: 'likert5',
    labelEn: 'Our trained staff move out of solar to other sectors at a high rate', shortLabel: 'Outflow to other sectors',
    headerKey: 'sektörü dışındaki alanlara',
  },
  {
    id: 'field_fatigue', col: 36, dimension: 'Challenges', type: 'likert5',
    labelEn: 'Regional imbalance and seasonality create field fatigue we struggle to prevent', shortLabel: 'Field fatigue',
    headerKey: 'saha yorgunluğunu',
  },
  {
    id: 'hardest_role', col: 37, dimension: 'Challenges', type: 'single',
    labelEn: 'Position group hardest to fill with qualified candidates', shortLabel: 'Hardest role to fill',
    headerKey: 'nitelikli aday bulmakta',
    options: [
      { value: 'manager_strategic', labelEn: 'Senior/middle manager and strategic planning', labelTr: 'Üst/Orta Düzey Yönetici ve Strateji Planlama' },
      { value: 'technician_operator', labelEn: 'Specialist technicians and operators', labelTr: 'Uzman Teknisyen ve Operatörler' },
      { value: 'project_specialist', labelEn: 'Project specialist or engineer', labelTr: 'Proje Uzmanı / Mühendis' },
      { value: 'project_technical', labelEn: 'Project technical personnel', labelTr: 'Proje Teknik Personeli' },
      { value: 'rd_engineer', labelEn: 'R&D engineer', labelTr: 'Ar-Ge Mühendisi' },
      { value: 'field_worker', labelEn: 'Field worker (unskilled)', labelTr: 'Saha elemanı (Vasıfsız İşçi)' },
    ],
  },
  {
    id: 'recruitment_barriers', col: 38, dimension: 'Challenges', type: 'multi',
    labelEn: 'Top 3 barriers in technical recruitment', shortLabel: 'Recruitment barriers',
    headerKey: 'en önemli 3 engel',
    options: [
      { value: 'pay_expectations', labelEn: 'Pay and benefit expectations', labelTr: 'Ücret ve Yan Hak Beklentileri' },
      { value: 'technical_competence', labelEn: 'Insufficient technical competence', labelTr: 'Teknik Yetkinlik Yetersizliği' },
      { value: 'geographic', labelEn: 'Geographic location difficulties', labelTr: 'Coğrafi Lokasyon Zorlukları' },
      { value: 'field_reluctance', labelEn: 'Reluctance to do field work', labelTr: 'Saha çalışmasına isteksizlik' },
      { value: 'language', labelEn: 'Communication and language barrier', labelTr: 'İletişim ve Dil Bariyeri' },
    ],
  },
  {
    id: 'volume_headcount_relation', col: 39, dimension: 'Composition', type: 'single',
    labelEn: 'Relationship between business volume and headcount over 3 years', shortLabel: 'Volume vs headcount',
    headerKey: 'iş hacmindeki değişim ile personel',
    options: [
      { value: 'rose_together', labelEn: 'Volume and headcount rose together', labelTr: 'İş hacmi ve personel sayısı birlikte arttı.' },
      { value: 'volume_rose_headcount_flat_fell', labelEn: 'Volume rose, headcount flat or fell', labelTr: 'İş hacmi arttı, personel sayısı sabit kaldı / azaldı.' },
      { value: 'flat_flat_rose', labelEn: 'Volume flat, headcount flat or rose', labelTr: 'İş hacmi sabit kaldı, personel sayısı sabit kaldı / arttı.' },
      { value: 'flat_fell', labelEn: 'Volume flat, headcount fell', labelTr: 'İş hacmi sabit kaldı, personel sayısı azaldı.' },
      { value: 'fell_flat_rose', labelEn: 'Volume fell, headcount flat or rose', labelTr: 'İş hacmi azaldı, personel sayısı sabit kaldı / arttı.' },
      { value: 'fell_together', labelEn: 'Volume and headcount fell together', labelTr: 'İş hacmi ve personel sayısı birlikte azaldı.' },
    ],
  },
  {
    id: 'training_hours', col: 40, dimension: 'Skills', type: 'single',
    labelEn: 'Annual in-house training hours per employee', shortLabel: 'Training hours',
    headerKey: 'yıllık ortalama eğitim süresini',
    options: [
      { value: '0_16', labelEn: '0–16 h', labelTr: '0-16 saat arası' },
      { value: '17_40', labelEn: '17–40 h', labelTr: '17-40 saat arası' },
      { value: '41_80', labelEn: '41–80 h', labelTr: '41-80 saat arası' },
      { value: '81_plus', labelEn: '81+ h', labelTr: '81 saat ve üzeri' },
      { value: 'none', labelEn: 'No in-house programme', labelTr: 'Kurum içi eğitim programı uygulanmıyor' },
    ],
  },
  {
    id: 'academia_collaboration', col: 41, dimension: 'Skills', type: 'single',
    labelEn: 'Most effective collaboration model with education institutions', shortLabel: 'Academia collaboration',
    headerKey: 'eğitim ve akademik kurumlarla',
    notes: 'The MoNE option was observed only as an interviewer-typed ALL-CAPS entry; it is matched case-insensitively.',
    options: [
      { value: 'internship_programmes', labelEn: 'Long-term internship and candidate engineer programmes', labelTr: 'Uzun dönemli staj ve aday mühendis programları' },
      { value: 'mone_iskur', labelEn: 'MoNE apprenticeship, intern and İŞKUR programmes', labelTr: 'MEB çıraklık eğitimi, stajyer ve İŞKUR programları', trVariants: ['MEB ÇIRAKLIK EĞİTİMİ, STAJYER VE İŞKUR PROGRAMLARI'] },
      { value: 'kosgeb_iskur', labelEn: 'KOSGEB and İŞKUR institutional programmes', labelTr: 'KOSGEB, İŞKUR gibi kurumların uyguladığı programlar' },
      { value: 'guaranteed_employment', labelEn: 'Training with guaranteed post-graduation employment', labelTr: 'Mezuniyet sonrası doğrudan istihdam garantili eğitimler' },
      { value: 'commercial_courses', labelEn: 'Commercial courses', labelTr: 'Ticari nitelikli kurslar' },
      { value: 'none', labelEn: 'No collaboration', labelTr: 'Herhangi bir iş birliği yapılmıyor.' },
    ],
  },
  {
    id: 'resignation_reason', col: 42, dimension: 'Retention', type: 'single',
    labelEn: 'Dominant reason given by resigning staff', shortLabel: 'Resignation reason',
    headerKey: 'İstifa eden personelin',
    options: [
      { value: 'higher_pay', labelEn: 'Higher pay and benefit offers from other firms', labelTr: 'Başka firmalardan gelen daha yüksek ücret ve yan hak teklifleri' },
      { value: 'dissatisfaction', labelEn: 'Dissatisfaction with conditions, culture or management', labelTr: 'Mevcut çalışma koşulları, kurum kültürü veya yönetimsel süreçlerden duyulan memnuniyetsizlik' },
      { value: 'work_life_balance', labelEn: 'Work–life balance problems caused by field work', labelTr: 'Saha çalışmalarının yarattığı iş-yaşam dengesi sorunları' },
      { value: 'career_uncertainty', labelEn: 'Uncertainty about internal career progression', labelTr: 'Şirket içindeki kariyer ilerleme imkanlarının belirsizliği' },
      { value: 'sector_change', labelEn: 'Desire to move to a different sector', labelTr: 'Farklı bir sektöre geçiş yapma isteği' },
    ],
  },
  {
    id: 'retention_methods', col: 43, dimension: 'Retention', type: 'multi',
    labelEn: 'Most effective methods used to increase retention', shortLabel: 'Retention methods',
    headerKey: 'Çalışan bağlılığını arttırmak',
    notes: 'Two respondents selected "İşin anlamı ve sosyal etki" (meaning of work and social impact), which is not among the five §4 options; it is quarantined in _other — see REPORT.md.',
    options: [
      { value: 'salary_bonus', labelEn: 'Competitive salary and bonus systems', labelTr: 'Rekabetçi maaş ve prim sistemleri' },
      { value: 'career_development', labelEn: 'Career development and continuous learning', labelTr: 'Kariyer gelişimi ve sürekli öğrenme' },
      { value: 'flexible_working', labelEn: 'Flexible working models', labelTr: 'Esnek çalışma modelleri ve iş-yaşam dengesi' },
      { value: 'insurance_support', labelEn: 'Private or supplementary health insurance, meal and transport support', labelTr: 'Özel/tamamlayıcı sağlık sigortası, yemek/ulaşım desteği vb.' },
      { value: 'company_culture', labelEn: 'Strong company culture and social bonds', labelTr: 'Güçlü şirket kültürü ve sosyal bağlar' },
    ],
  },
  {
    id: 'growth_tech_areas', col: 44, dimension: 'Future', type: 'multi',
    labelEn: 'Areas expected to drive employment toward 2035', shortLabel: '2035 growth areas',
    headerKey: "Türkiye'nin 2035 hedefleri",
    options: [
      { value: 'energy_storage', labelEn: 'Energy storage', labelTr: 'Enerji Depolama' },
      { value: 'smart_grid', labelEn: 'Smart grid solutions', labelTr: 'Akıllı şebeke Çözümleri' },
      { value: 'end_of_life', labelEn: 'Panel end-of-life management', labelTr: 'Panel Ömür Sonu Yönetimi' },
      { value: 'manufacturing', labelEn: 'Panel, cell or equipment manufacturing', labelTr: 'Panel, Hücre veya Ekipman Üretimi' },
      { value: 'data_digitalisation', labelEn: 'Data management and digitalisation', labelTr: 'Veri Yönetimi ve Dijitalleşme' },
      { value: 'project_engineering', labelEn: 'Project development and engineering design', labelTr: 'Proje Geliştirme ve Mühendislik Tasarımı' },
      { value: 'installation_om', labelEn: 'Installation, contracting, construction and O&M', labelTr: 'Kurulum, Taahhüt, İnşaat, İşletme, Bakım ve Onarım' },
      { value: 'sales', labelEn: 'Sales services', labelTr: 'Satış Hizmetleri' },
    ],
  },
  {
    id: 'employment_change_2y', col: 45, dimension: 'Future', type: 'single',
    labelEn: 'Expected change in employment volume over 2 years', shortLabel: '2-year employment change',
    headerKey: 'istihdam hacminde öngördüğünüz',
    options: [
      { value: 'increase_over_25', labelEn: 'Increase over 25%', labelTr: "%25'ten fazla artış" },
      { value: 'increase_0_25', labelEn: 'Increase 0–25%', labelTr: '%0-25 arasında artış' },
      { value: 'stable', labelEn: 'Stable', labelTr: 'Sabit' },
      { value: 'decrease_0_25', labelEn: 'Decrease 0–25%', labelTr: '%0-25 arasında azalma' },
      { value: 'decrease_over_25', labelEn: 'Decrease over 25%', labelTr: "%25'ten fazla azalma" },
    ],
  },
  {
    id: 'employment_change_drivers', col: 46, dimension: 'Future', type: 'multi',
    labelEn: 'Top 3 factors behind that expectation', shortLabel: 'Employment change drivers',
    headerKey: 'istihdam değişim öngörünüzü etkileyen',
    notes: 'The O&M-requirements option was never selected (0 of 20). Five respondents entered "Teşvikler" (incentives), which is not among the six §4 options and is quarantined in _other — see REPORT.md.',
    options: [
      { value: 'investment_speed', labelEn: 'Changes in investment speed and capacity', labelTr: 'Yatırım Hızında ve Kapasitede Değişiklikler' },
      { value: 'storage_new_tech', labelEn: 'Storage and other new technologies', labelTr: 'Depolama ve Diğer Yeni Teknolojiler' },
      { value: 'regulatory', labelEn: 'Regulatory changes', labelTr: 'Mevzuat Değişiklikleri' },
      { value: 'domestic_production', labelEn: 'Domestic production focus', labelTr: 'Yerli Üretim Odaklılı' },
      { value: 'rd_focus', labelEn: 'R&D focus', labelTr: 'Ar-Ge Odaklılık' },
      // Never observed in the data; Turkish label reconstructed from the questionnaire pattern.
      { value: 'om_requirements', labelEn: 'Operation and maintenance requirements', labelTr: 'İşletme ve Bakım Gereklilikleri' },
    ],
  },
];

/** Multi-select question ids (BuildSpec §3.2 step 5). */
export const EMPLOYEE_MULTI_IDS = ['certificates'] as const;
export const EMPLOYER_MULTI_IDS = [
  'other_activity_fields',
  'recruitment_barriers',
  'retention_methods',
  'growth_tech_areas',
  'employment_change_drivers',
] as const;
