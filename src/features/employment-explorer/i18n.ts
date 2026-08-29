/**
 * UI chrome strings for the EN/TR toggle (§6.0). Question and option labels
 * come from the data dictionary; only interface copy lives here.
 *
 * NOTE: Turkish strings are working drafts and need native review before
 * launch (BuildSpec "Items to Confirm" 6).
 */

import type { Language } from './lib/data';

const en = {
    lensEmployees: 'Employees',
    lensEmployers: 'Employers',
    lensCompare: 'Compare',
    filters: 'Filters',
    clearAll: 'Clear all',
    close: 'Close',
    baseLabel: (n: number, total: number) => `n = ${n} of ${total}`,
    smallBase: 'Small base — indicative only.',
    suppressed: 'Base too small to display (n < 5). Widen your filters.',
    viewAsTable: 'View as table',
    viewAsChart: 'View as chart',
    category: 'Category',
    count: 'Count',
    share: 'Share',
    employeeSeries: 'Employees',
    employerSeries: 'Employers',
    heroTitle: 'Employment in the Turkish Solar Sector',
    heroSubtitle:
      'An interactive explorer for the SolarHub Employment Report (WP1) — workforce conditions, expectations and the gaps between them.',
    heroStatEmployees: 'employees surveyed',
    heroStatEmployers: 'employer organisations',
    heroStatGraduates: 'of employers say graduates are not job-ready',
    heroStatPurpose: 'of employees say clean-energy purpose lifts their satisfaction',
    heroHonesty:
      'The sample is small and indicative, not statistically representative — read every figure with its base.',
    heroMethodologyLink: 'How the survey was run',
    exploreData: 'Explore the data',
    downloadReport: 'Download the full report (PDF)',
    downloadPending: 'Report link pending publication (Zenodo DOI to be confirmed)',
    whoAnsweredTitle: 'Who answered',
    whoAnsweredIntro:
      'Sample composition. Click any segment to apply it as a global filter — every chart on the page recomputes.',
    employeePanel: 'Employees',
    employerPanel: 'Employer organisations',
    ageByGender: 'Age × gender',
    educationLevel: 'Education level',
    experienceBand: 'Experience in solar',
    activityField: 'Main field of activity',
    companySize: 'Company headcount',
    mainActivity: 'Field employing the most personnel',
    yearsOperating: 'Years operating in solar',
    headcountBand: 'Headcount band',
    internationalShare: 'Share of operations abroad',
    ladderTitle: 'The Confidence Ladder',
    ladderIntro:
      'Do people feel secure? Trust declines as it moves outward from the individual.',
    ladderAnnotation:
      'The workforce treats portable individual competence — not corporate or sectoral security — as its guarantee.',
    ladderSelf: 'Self',
    ladderEmployer: 'Employer',
    ladderSector: 'Sector',
    ladderSelfFull: 'My technical knowledge means I have no unemployment concern',
    ladderEmployerFull: "My company's market position means I have no unemployment concern",
    ladderSectorFull: 'The Turkish solar sector will grow steadily and is a secure long-term career',
    ladderViewAgree: '% agreeing (4–5)',
    ladderViewMean: 'Mean score (1–5)',
    ladderViewDist: 'Full 5-point distribution',
    ladderFootnote:
      'Agreement % is the rounded share of 4s plus the rounded share of 5s — the rounding the published report uses.',
    likertDisagree: 'Disagree',
    likertNeutral: 'Neutral',
    likertAgree: 'Agree',
    agreeing: 'agreeing',
    meanScore: 'mean score',
    dimmedEmployerLens:
      'This module reads the employee dataset only. Switch to the Employees lens to interact with it.',
    dimmedCompareLens:
      'Employee dataset only — this module has no employer counterpart, so it is inactive in Compare.',
    dimmedEmployeeLens:
      'This panel reads the employer dataset. Switch lens to interact with it.',
    openFilters: 'Open the filter drawer',
    removeFilter: (label: string) => `Remove filter ${label}`,
    languageToggle: 'Language',
    skipToContent: 'Skip to content',
    andConnector: '·',
    methodologyStub: (collectedE: number, pilotE: number, collectedR: number, pilotR: number) =>
      `Methodology in brief: ${collectedE} employee responses were collected, of which ${pilotE} were pre-launch pilot tests (44 analysed); ${collectedR} employer forms were collected, of which ${pilotR} were pilots (20 analysed). The full methodology module arrives in a later build stage.`,
    footerLine:
      'SolarHub — Horizon Europe WIDERA Excellence Hub, Grant Agreement 101086110. Survey fieldwork 4 March – 13 July 2026.',
};

export type UIStrings = typeof en;

const tr: UIStrings = {
    lensEmployees: 'Çalışanlar',
    lensEmployers: 'İşverenler',
    lensCompare: 'Karşılaştır',
    filters: 'Filtreler',
    clearAll: 'Tümünü temizle',
    close: 'Kapat',
    baseLabel: (n: number, total: number) => `n = ${n} / ${total}`,
    smallBase: 'Küçük taban — yalnızca gösterge niteliğinde.',
    suppressed: 'Taban görüntülenemeyecek kadar küçük (n < 5). Filtreleri genişletin.',
    viewAsTable: 'Tablo olarak görüntüle',
    viewAsChart: 'Grafik olarak görüntüle',
    category: 'Kategori',
    count: 'Sayı',
    share: 'Oran',
    employeeSeries: 'Çalışanlar',
    employerSeries: 'İşverenler',
    heroTitle: 'Türkiye Güneş Enerjisi Sektöründe İstihdam',
    heroSubtitle:
      'SolarHub İstihdam Raporu (WP1) için etkileşimli veri gezgini — iş gücü koşulları, beklentiler ve aradaki farklar.',
    heroStatEmployees: 'çalışan ankete katıldı',
    heroStatEmployers: 'işveren kuruluş',
    heroStatGraduates: 'işverene göre yeni mezunlar göreve hazır değil',
    heroStatPurpose: 'çalışana göre temiz enerji amacı iş memnuniyetini artırıyor',
    heroHonesty:
      'Örneklem küçük ve gösterge niteliğindedir; istatistiksel olarak temsili değildir — her rakamı tabanıyla birlikte okuyun.',
    heroMethodologyLink: 'Anket nasıl yürütüldü',
    exploreData: 'Verileri keşfet',
    downloadReport: 'Raporun tamamını indir (PDF)',
    downloadPending: 'Rapor bağlantısı yayın bekliyor (Zenodo DOI doğrulanacak)',
    whoAnsweredTitle: 'Kimler yanıtladı',
    whoAnsweredIntro:
      'Örneklem bileşimi. Bir dilime tıklayarak genel filtre olarak uygulayın — sayfadaki her grafik yeniden hesaplanır.',
    employeePanel: 'Çalışanlar',
    employerPanel: 'İşveren kuruluşlar',
    ageByGender: 'Yaş × cinsiyet',
    educationLevel: 'Eğitim seviyesi',
    experienceBand: 'Sektör deneyimi',
    activityField: 'Ana faaliyet alanı',
    companySize: 'Firma personel sayısı',
    mainActivity: 'En çok personel istihdam eden alan',
    yearsOperating: 'Sektörde faaliyet yılı',
    headcountBand: 'Çalışan sayısı bandı',
    internationalShare: 'Yurt dışı operasyon payı',
    ladderTitle: 'Güven Merdiveni',
    ladderIntro:
      'İnsanlar kendilerini güvende hissediyor mu? Güven, bireyden dışarı doğru azalıyor.',
    ladderAnnotation:
      'İş gücü, kurumsal veya sektörel güvenceyi değil, taşınabilir bireysel yetkinliği güvencesi olarak görüyor.',
    ladderSelf: 'Birey',
    ladderEmployer: 'İşveren',
    ladderSector: 'Sektör',
    ladderSelfFull: 'Mevcut teknik bilgi ve tecrübem sayesinde işsiz kalma endişem yoktur',
    ladderEmployerFull: 'Şirketimin piyasadaki durumu sayesinde işsiz kalma endişem yoktur',
    ladderSectorFull: 'Türkiye güneş enerjisi sektörü istikrarlı büyüyecek ve uzun vadeli güvenli bir kariyer alanıdır',
    ladderViewAgree: 'Katılım oranı (4–5)',
    ladderViewMean: 'Ortalama puan (1–5)',
    ladderViewDist: 'Tam 5’li dağılım',
    ladderFootnote:
      'Katılım oranı, 4 ve 5 paylarının ayrı ayrı yuvarlanıp toplanmasıyla hesaplanır — yayımlanan raporun kullandığı yuvarlama.',
    likertDisagree: 'Katılmıyor',
    likertNeutral: 'Kararsız',
    likertAgree: 'Katılıyor',
    agreeing: 'katılıyor',
    meanScore: 'ortalama puan',
    dimmedEmployerLens:
      'Bu modül yalnızca çalışan veri setini okur. Etkileşim için Çalışanlar merceğine geçin.',
    dimmedCompareLens:
      'Yalnızca çalışan veri seti — bu modülün işveren karşılığı yok; Karşılaştır merceğinde pasiftir.',
    dimmedEmployeeLens:
      'Bu panel işveren veri setini okur. Etkileşim için merceği değiştirin.',
    openFilters: 'Filtre çekmecesini aç',
    removeFilter: (label: string) => `${label} filtresini kaldır`,
    languageToggle: 'Dil',
    skipToContent: 'İçeriğe atla',
    andConnector: '·',
    methodologyStub: (collectedE: number, pilotE: number, collectedR: number, pilotR: number) =>
      `Kısaca yöntem: ${collectedE} çalışan yanıtı toplandı, bunların ${pilotE} tanesi lansman öncesi pilot testti (44 analiz edildi); ${collectedR} işveren formu toplandı, ${pilotR} tanesi pilottu (20 analiz edildi). Tam yöntem modülü sonraki aşamada eklenecek.`,
    footerLine:
      'SolarHub — Horizon Europe WIDERA Mükemmeliyet Merkezi, Hibe Sözleşmesi 101086110. Saha çalışması 4 Mart – 13 Temmuz 2026.',
};

const STRINGS: Record<Language, UIStrings> = { en, tr };

export function useStrings(language: Language): UIStrings {
  return STRINGS[language];
}

export function getStrings(language: Language): UIStrings {
  return STRINGS[language];
}
