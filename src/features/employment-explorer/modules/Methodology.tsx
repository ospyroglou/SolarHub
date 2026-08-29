/**
 * §6.13 — Methodology and limitations. Always expanded, never an
 * accordion. Carries the full sample account (48 collected / 4 pilots / 44
 * analysed; 23 / 3 / 20), the note reconciling the report's "16
 * participants + 7 interviews" phrasing with the analysed base of 20, and
 * the explicit limitations. Sample numbers come from the dataset meta, not
 * hard-coded copy. The citation block carries a placeholder until the
 * Zenodo DOI is confirmed (Items to Confirm 7).
 */

import { ModuleSection } from '../components/ModuleSection';
import { meta, type Language } from '../lib/data';
import { useFilters } from '../state/filter-context';

const COPY: Record<Language, {
  title: string;
  intro: string;
  designTitle: string;
  design: string;
  recruitmentTitle: string;
  recruitment: string;
  fieldworkTitle: string;
  fieldwork: (ef: [string, string], rf: [string, string]) => string;
  sampleTitle: string;
  sampleEmployees: (collected: number, pilots: number, analysed: number) => string;
  sampleEmployers: (
    collected: number,
    self: number,
    interviewed: number,
    pilots: number,
    analysed: number,
  ) => string;
  reconciliation: string;
  limitationsTitle: string;
  limitations: string[];
  citationTitle: string;
  citation: string;
  doiPending: string;
}> = {
  en: {
    title: 'Methodology and limitations',
    intro: 'How the survey was run, who it reached, and how far the numbers can be read.',
    designTitle: 'Instrument design',
    design:
      'Two structured questionnaires — employee and employer — each organised around six research dimensions, with 5-point agreement scales, single- and multi-select items and banded composition questions. The study was approved by the METU Human Subjects Ethics Committee.',
    recruitmentTitle: 'Recruitment and administration',
    recruitment:
      'Respondents were reached through GÜNDER communication channels and LinkedIn. The employee survey was self-administered online. The employer side used a hybrid approach: self-completed online forms combined with interviewer-administered sessions.',
    fieldworkTitle: 'Fieldwork',
    fieldwork: (ef, rf) =>
      `Employees: ${ef[0]} to ${ef[1]}. Employers: ${rf[0]} to ${rf[1]}. Pilot testing ran 18 February – 1 March 2026; the surveys went live on 4 March 2026, and every pre-launch pilot response is excluded from analysis.`,
    sampleTitle: 'Sample account, in full',
    sampleEmployees: (collected, pilots, analysed) =>
      `Employees — ${collected} responses received, of which ${pilots} were pre-launch pilot tests. ${analysed} analysed.`,
    sampleEmployers: (collected, self, interviewed, pilots, analysed) =>
      `Employers — ${collected} forms received: ${self} self-completed online and ${interviewed} gathered through interviewer-administered sessions. ${pilots} were pre-launch pilot tests. ${analysed} analysed.`,
    reconciliation:
      'The published report gives the employer figures as "16 participants" plus "7 face-to-face interviews" — those describe the two collection routes, and they sum to the 23 raw forms. The analysed base of 20 is the denominator every percentage in the report is calculated on, and it is the base this explorer states throughout.',
    limitationsTitle: 'Limitations',
    limitations: [
      'Self-selection bias: respondents opted in through sector channels.',
      'White-collar skew: 93% of employee respondents hold a bachelor’s degree or above.',
      'Subcontractor field personnel are under-represented.',
      'With n = 44 and n = 20, no result should be read as a population estimate — the explorer suppresses any filtered view below n = 5 and flags bases of 15 or fewer.',
    ],
    citationTitle: 'Citation',
    citation:
      'SolarHub Employment Report, Work Package 1, v1.0, 31 July 2026. SolarHub — Horizon Europe WIDERA Excellence Hub, Grant Agreement 101086110.',
    doiPending: 'Zenodo DOI and canonical report URL to be confirmed.',
  },
  tr: {
    title: 'Yöntem ve sınırlılıklar',
    intro: 'Anket nasıl yürütüldü, kime ulaştı ve rakamlar ne kadar ileri okunabilir.',
    designTitle: 'Araç tasarımı',
    design:
      'Çalışan ve işveren için iki yapılandırılmış anket; her biri altı araştırma boyutu etrafında, 5’li katılım ölçekleri, tekli/çoklu seçim maddeleri ve bantlı bileşim sorularıyla kurgulandı. Çalışma ODTÜ İnsan Araştırmaları Etik Kurulu onaylıdır.',
    recruitmentTitle: 'Erişim ve uygulama',
    recruitment:
      'Katılımcılara GÜNDER iletişim kanalları ve LinkedIn üzerinden ulaşıldı. Çalışan anketi çevrim içi öz-uygulamalıdır. İşveren tarafında öz-doldurulan formlar ile görüşmeci eşliğinde oturumları birleştiren karma bir yaklaşım kullanıldı.',
    fieldworkTitle: 'Saha çalışması',
    fieldwork: (ef, rf) =>
      `Çalışanlar: ${ef[0]} – ${ef[1]}. İşverenler: ${rf[0]} – ${rf[1]}. Pilot testler 18 Şubat – 1 Mart 2026’da yapıldı; anketler 4 Mart 2026’da yayına girdi ve lansman öncesi tüm pilot yanıtlar analiz dışıdır.`,
    sampleTitle: 'Örneklem dökümü',
    sampleEmployees: (collected, pilots, analysed) =>
      `Çalışanlar — ${collected} yanıt alındı; ${pilots} tanesi lansman öncesi pilot testti. ${analysed} yanıt analiz edildi.`,
    sampleEmployers: (collected, self, interviewed, pilots, analysed) =>
      `İşverenler — ${collected} form alındı: ${self} çevrim içi öz-dolduruldu, ${interviewed} görüşmeci eşliğinde toplandı. ${pilots} form lansman öncesi pilottu. ${analysed} form analiz edildi.`,
    reconciliation:
      'Yayımlanan rapor işveren rakamlarını "16 katılımcı" ve "7 yüz yüze görüşme" olarak verir — bunlar iki toplama kanalını tanımlar ve toplamı 23 ham formdur. Rapordaki her yüzdenin paydası olan analiz tabanı 20’dir; bu gezgin de baştan sona bu tabanı kullanır.',
    limitationsTitle: 'Sınırlılıklar',
    limitations: [
      'Öz-seçim yanlılığı: katılımcılar sektör kanallarından gönüllü katıldı.',
      'Beyaz yakalı ağırlığı: çalışan katılımcıların %93’ü lisans ve üzeri mezunu.',
      'Taşeron saha personeli yeterince temsil edilmiyor.',
      'n = 44 ve n = 20 ile hiçbir sonuç evren tahmini olarak okunmamalıdır — gezgin n < 5 olan her görünümü bastırır, 15 ve altını işaretler.',
    ],
    citationTitle: 'Atıf',
    citation:
      'SolarHub İstihdam Raporu, İş Paketi 1, s1.0, 31 Temmuz 2026. SolarHub — Horizon Europe WIDERA Mükemmeliyet Merkezi, Hibe Sözleşmesi 101086110.',
    doiPending: 'Zenodo DOI ve raporun kalıcı adresi doğrulanacak.',
  },
};

export function Methodology() {
  const { state } = useFilters();
  const c = COPY[state.language];

  return (
    <ModuleSection id="methodology" title={c.title} intro={c.intro}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Block heading={c.designTitle} body={c.design} />
        <Block heading={c.recruitmentTitle} body={c.recruitment} />
        <Block
          heading={c.fieldworkTitle}
          body={c.fieldwork(meta.employeeFieldwork, meta.employerFieldwork)}
        />
        <div className="rounded-sh-card border border-sh-rule bg-sh-surface p-5">
          <h3 className="text-sh-h4 text-sh-deep">{c.sampleTitle}</h3>
          <ul className="mt-2 flex flex-col gap-2 text-sh-chart leading-relaxed text-sh-ink">
            <li className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-sh-employee" />
              {c.sampleEmployees(meta.employeeCollected, meta.employeePilotExcluded, meta.employeeN)}
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-sh-employer" />
              {c.sampleEmployers(
                meta.employerCollected,
                meta.employerSelfCompleted,
                meta.employerInterviewed,
                meta.employerPilotExcluded,
                meta.employerN,
              )}
            </li>
          </ul>
          <p className="mt-3 border-t border-sh-rule pt-3 text-sh-tick leading-relaxed text-sh-muted">
            {c.reconciliation}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-sh-card border border-sh-rule bg-sh-surface p-5">
          <h3 className="text-sh-h4 text-sh-deep">{c.limitationsTitle}</h3>
          <ul className="mt-2 list-none space-y-1.5 text-sh-chart leading-relaxed text-sh-ink">
            {c.limitations.map((l) => (
              <li key={l} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-sh-muted" />
                {l}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-sh-card border border-sh-rule bg-sh-surface p-5">
          <h3 className="text-sh-h4 text-sh-deep">{c.citationTitle}</h3>
          <p className="mt-2 text-sh-chart leading-relaxed text-sh-ink">{c.citation}</p>
          <p className="mt-2 text-sh-tick italic text-sh-muted">{c.doiPending}</p>
        </div>
      </div>
    </ModuleSection>
  );
}

function Block({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="rounded-sh-card border border-sh-rule bg-sh-surface p-5">
      <h3 className="text-sh-h4 text-sh-deep">{heading}</h3>
      <p className="mt-2 text-sh-chart leading-relaxed text-sh-ink">{body}</p>
    </div>
  );
}
