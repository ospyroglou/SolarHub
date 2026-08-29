/**
 * §6.11 — Free-text drawer. A collapsible panel holding every quarantined
 * employee `_other` response, verbatim with an English working translation
 * and the question it came from. EMPLOYEE TEXT ONLY: §7 forbids employer
 * verbatim text anywhere in the build, so this module never touches the
 * employer records. The corpus is the full analysed set (44), independent
 * of the active filters — it is an appendix, not a chart.
 */

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { ModuleSection } from '../components/ModuleSection';
import { cn } from '../lib/cn';
import { employees, getQuestion, type Language } from '../lib/data';
import { useFilters } from '../state/filter-context';

const COPY: Record<Language, {
  title: string;
  intro: string;
  toggleOpen: string;
  toggleClosed: string;
  translationNote: string;
  originalLabel: string;
  countLabel: (n: number) => string;
}> = {
  en: {
    title: 'What people wrote in their own words',
    intro:
      'Closed questions sometimes came back as free text. Nothing was discarded: every unclassified employee response is here, verbatim, with a working translation.',
    toggleOpen: 'Hide the responses',
    toggleClosed: 'Show all responses',
    translationNote:
      'Translations are working translations by the explorer team, not part of the survey instrument. Employee responses only — employer verbatim text is never published (§7).',
    originalLabel: 'Original (TR)',
    countLabel: (n) => `${n} responses`,
  },
  tr: {
    title: 'Katılımcıların kendi ifadeleri',
    intro:
      'Kapalı sorular bazen serbest metinle yanıtlandı. Hiçbir şey atılmadı: sınıflandırılamayan her çalışan yanıtı burada, olduğu gibi ve çeviriyle.',
    toggleOpen: 'Yanıtları gizle',
    toggleClosed: 'Tüm yanıtları göster',
    translationNote:
      'Çeviriler gezgin ekibinin çalışma çevirileridir, anket aracının parçası değildir. Yalnızca çalışan yanıtları — işveren serbest metni hiçbir zaman yayımlanmaz (§7).',
    originalLabel: 'Orijinal (TR)',
    countLabel: (n) => `${n} yanıt`,
  },
};

/**
 * Working translations keyed by the verbatim Turkish string. An entry
 * missing here renders untranslated rather than machine-guessed at runtime.
 * One response references a specific employer's investment behaviour and is
 * individually under review (BuildSpec "Items to Confirm" 5).
 */
const TRANSLATIONS: Record<string, string> = {
  'İş güvencesi eksikliği (işin sürekli olmaması, sözleşmelerin proje bazlı olması)':
    'Lack of job security (work is not continuous; contracts are project-based)',
  'İş Güvenliği Uygulamalarının Her gün Daha da Benimsenmesi':
    'Occupational safety practices being adopted more each day',
  'Sektörün teorik içeriği, üretim imkanları':
    "The sector's theoretical content and its production opportunities",
  'Çalışıtığm firmanın uzun vadeli yatuırımlar yaparak geleceği garanti altına laması ve maaş ve yan haklarını sağlaması':
    'My company securing the future through long-term investments, and providing pay and benefits',
  "Yenilenebilir Enerji'nin çevreye ve insanlara faydalı olduğu için":
    'Because renewable energy benefits the environment and people',
  'Soru ve cevaplar uyuşmuyor': 'The questions and answers do not match',
  'Dünya dışı kaynaktan gelen enerjinin elektriksel dönüşümündeki gelişim.':
    'Progress in the electrical conversion of energy arriving from an extraterrestrial source.',
  'İlk hedef alacağım diğer proje ve ya görevin şuan yürütmekte olan görevimden bilgi ve tecrübemi üst seviyeye çıkartması ikincil hedef maaş ve yan haklar':
    'First goal: that my next project or role raises my knowledge and experience beyond my current position; secondary goal: pay and benefits',
  na: 'n/a',
  'Diksiyon, Proje Yöneticiliği': 'Diction; project management',
  'Ges kurulum kursu': 'Solar plant (GES) installation course',
  'Jeotermal enerji çalışmalarına hız vereceğim.':
    'I will accelerate my work in geothermal energy.',
};

interface Entry {
  question: string;
  valueTr: string;
  count: number;
}

function collectEntries(): Entry[] {
  const map = new Map<string, Entry>();
  for (const record of employees) {
    for (const o of record._other) {
      const key = `${o.question}::${o.valueTr}`;
      const existing = map.get(key);
      if (existing) existing.count++;
      else map.set(key, { question: o.question, valueTr: o.valueTr, count: 1 });
    }
  }
  return [...map.values()].sort(
    (a, b) => a.question.localeCompare(b.question) || b.count - a.count,
  );
}

const ENTRIES = collectEntries();

export function FreeTextDrawer() {
  const { state } = useFilters();
  const c = COPY[state.language];
  const [open, setOpen] = useState(false);

  const total = ENTRIES.reduce((acc, e) => acc + e.count, 0);
  const byQuestion = new Map<string, Entry[]>();
  for (const e of ENTRIES) {
    const list = byQuestion.get(e.question) ?? [];
    list.push(e);
    byQuestion.set(e.question, list);
  }

  return (
    <ModuleSection id="free-text" title={c.title} intro={c.intro}>
      <div className="rounded-sh-card border border-sh-rule bg-sh-surface p-5">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="text-sh-h4 text-sh-deep">
            {open ? c.toggleOpen : c.toggleClosed}{' '}
            <span className="sh-num font-normal text-sh-muted">({c.countLabel(total)})</span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={cn('shrink-0 text-sh-muted transition-transform', open && 'rotate-180')}
          />
        </button>

        {open && (
          <div className="mt-4 flex flex-col gap-6 border-t border-sh-rule pt-4">
            {[...byQuestion.entries()].map(([questionId, entries]) => {
              const q = getQuestion(questionId);
              return (
                <section key={questionId} aria-label={q.labelEn}>
                  <h4 className="text-sh-chart font-semibold text-sh-deep">
                    {state.language === 'tr' ? q.labelTr : q.labelEn}
                  </h4>
                  <ul className="mt-2 flex flex-col gap-3">
                    {entries.map((e) => (
                      <li key={e.valueTr} className="rounded-md border border-sh-rule bg-sh-sand p-3">
                        <p className="text-sh-chart italic leading-relaxed text-sh-ink">
                          “{e.valueTr}”
                          {e.count > 1 ? (
                            <span className="sh-num not-italic text-sh-muted"> × {e.count}</span>
                          ) : null}
                        </p>
                        {state.language === 'en' && TRANSLATIONS[e.valueTr] ? (
                          <p className="mt-1.5 text-sh-tick leading-relaxed text-sh-muted">
                            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide">EN</span>
                            {TRANSLATIONS[e.valueTr]}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            <p className="text-sh-tick text-sh-muted">{c.translationNote}</p>
          </div>
        )}
      </div>
    </ModuleSection>
  );
}
