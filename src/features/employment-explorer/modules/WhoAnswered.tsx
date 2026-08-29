/**
 * §6.2 — Who answered. Sample composition, employee and employer side by
 * side. Clicking any segment applies it as a global filter — this is the
 * primary way readers discover that filtering exists, so segments carry a
 * pointer cursor and hover/active outlines. Every chart recomputes from the
 * filtered set and inherits the §7 rules through <ChartCard>.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartCard } from '../components/ChartCard';
import {
  CategoryBarChart,
  CategoryBarChartHorizontal,
  CategoryDonut,
  type CatDatum,
} from '../components/charts';
import { DimmablePanel, ModuleSection } from '../components/ModuleSection';
import { useStrings, type UIStrings } from '../i18n';
import { makeBase } from '../lib/base-count';
import { optionsOf, type Language } from '../lib/data';
import { FIRM_SCALE_OPTIONS } from '../lib/filters';
import { useReducedMotion } from '../lib/hooks';
import { tallyCategory, type CategoryCount } from '../lib/stats';
import { useFilters } from '../state/filter-context';
import type { EmployeeRecord, EmployerRecord } from '../../../types/survey';

/* Ordinal colour ramps anchored on the dataset hues (light→dark). */
const AMBER_RAMP = ['#FBEAC2', '#F6CE74', '#F2A900', '#C78A00', '#8F6300'];
const TEAL_RAMP = ['#BFDEDA', '#7FB2A6', '#4A9992', '#1B7F79'];

const GENDER_COLORS: Record<string, string> = {
  male: 'var(--sh-deep)',
  female: 'var(--sh-solar)',
  prefer_not_say: 'var(--sh-muted)',
};

function withLabels(
  data: CategoryCount[],
  questionIdOrOptions: string | { value: string; labelEn: string; labelTr: string }[],
  lang: Language,
): CatDatum[] {
  const options =
    typeof questionIdOrOptions === 'string' ? optionsOf(questionIdOrOptions) : questionIdOrOptions;
  return data.map((d) => {
    const opt = options.find((o) => o.value === d.value);
    return {
      ...d,
      label: opt ? (lang === 'tr' ? opt.labelTr : opt.labelEn) : d.value,
    };
  });
}

function tableFor(data: CatDatum[], t: UIStrings) {
  return {
    headers: [t.category, t.count, t.share],
    rows: data.map((d) => [d.label, d.count, `${Math.round(d.pct)}%`]),
  };
}

function ariaFor(title: string, data: CatDatum[], n: number): string {
  const top = [...data].sort((a, b) => b.count - a.count)[0];
  return top
    ? `${title}: n = ${n}; largest category ${top.label} with ${top.count} (${Math.round(top.pct)}%).`
    : `${title}: no data under the current filters.`;
}

export function WhoAnswered() {
  const { state } = useFilters();
  const t = useStrings(state.language);

  const employeeDimmed = state.lens === 'employers';
  const employerDimmed = state.lens === 'employees';

  return (
    <ModuleSection id="who-answered" title={t.whoAnsweredTitle} intro={t.whoAnsweredIntro}>
      <div className="grid gap-6 lg:grid-cols-2">
        <DimmablePanel dimmed={employeeDimmed} note={t.dimmedEmployerLens}>
          <PanelHeading series="employee" label={t.employeePanel} />
          <div className="mt-3 flex flex-col gap-6">
            <AgeGenderChart />
            <div className="grid gap-6 sm:grid-cols-2">
              <EmployeeCategoryCard
                title={t.educationLevel}
                questionId="education_level"
                filterKey="education_level"
                kind="donut"
              />
              <EmployeeCategoryCard
                title={t.experienceBand}
                questionId="experience"
                filterKey="experience"
                kind="bar"
              />
            </div>
            <EmployeeCategoryCard
              title={t.activityField}
              questionId="activity_field"
              filterKey="activity_field"
              kind="horizontal"
            />
            <EmployeeCategoryCard
              title={t.companySize}
              questionId="company_size"
              filterKey="company_size"
              kind="bar"
            />
          </div>
        </DimmablePanel>

        <DimmablePanel dimmed={employerDimmed} note={t.dimmedEmployeeLens}>
          <PanelHeading series="employer" label={t.employerPanel} />
          <div className="mt-3 flex flex-col gap-6">
            <EmployerCategoryCard
              title={t.mainActivity}
              questionId="main_activity_field"
              filterKey="main_activity_field"
              kind="horizontal"
            />
            <div className="grid gap-6 sm:grid-cols-2">
              <EmployerCategoryCard
                title={t.yearsOperating}
                questionId="years_operating"
                filterKey="years_operating"
                kind="donut"
              />
              <EmployerHeadcountCard />
            </div>
            <EmployerCategoryCard
              title={t.internationalShare}
              questionId="international_share"
              filterKey="international_share"
              kind="bar"
            />
          </div>
        </DimmablePanel>
      </div>
    </ModuleSection>
  );
}

function PanelHeading({ series, label }: { series: 'employee' | 'employer'; label: string }) {
  return (
    <h3 className="flex items-center gap-2 text-sh-h3 text-sh-deep">
      <span
        aria-hidden="true"
        className="inline-block h-3 w-3 rounded-full"
        style={{ backgroundColor: `var(--sh-${series})` }}
      />
      {label}
    </h3>
  );
}

/* ------------------------------------------------------------------ */
/* Employee side                                                       */
/* ------------------------------------------------------------------ */

function EmployeeCategoryCard({
  title,
  questionId,
  filterKey,
  kind,
}: {
  title: string;
  questionId: string;
  filterKey: string;
  kind: 'bar' | 'donut' | 'horizontal';
}) {
  const { state, dispatch, filteredEmployees } = useFilters();
  const t = useStrings(state.language);
  const options = optionsOf(questionId);
  const { data, answered } = tallyCategory(
    filteredEmployees,
    (r) => r[questionId as keyof EmployeeRecord] as string | null,
    options.map((o) => o.value),
  );
  const labelled = withLabels(data, questionId, state.language);
  const base = makeBase(answered, 44);
  const active = state.employee[filterKey] ?? [];
  const toggle = (value: string) =>
    dispatch({ type: 'toggle', dataset: 'employee', key: filterKey, value });

  return (
    <ChartCard
      title={title}
      base={base}
      series="employee"
      table={tableFor(labelled, t)}
      ariaLabel={ariaFor(title, labelled, base.n)}
    >
      {kind === 'donut' ? (
        <CategoryDonut data={labelled} ramp={AMBER_RAMP} activeValues={active} onToggle={toggle} />
      ) : kind === 'horizontal' ? (
        <CategoryBarChartHorizontal
          data={labelled}
          color="var(--sh-employee)"
          activeValues={active}
          onToggle={toggle}
        />
      ) : (
        <CategoryBarChart
          data={labelled}
          color="var(--sh-employee)"
          activeValues={active}
          onToggle={toggle}
        />
      )}
    </ChartCard>
  );
}

/** Age × gender grouped bar; clicking a bar applies BOTH filters (§6.2). */
function AgeGenderChart() {
  const { state, dispatch, filteredEmployees } = useFilters();
  const t = useStrings(state.language);
  const reduced = useReducedMotion();

  const ageOptions = optionsOf('age');
  const genderOptions = optionsOf('gender');
  const label = (o: { labelEn: string; labelTr: string }) =>
    state.language === 'tr' ? o.labelTr : o.labelEn;

  const answered = filteredEmployees.filter((r) => r.age !== null && r.gender !== null).length;
  const base = makeBase(answered, 44);

  const data = ageOptions.map((age) => {
    const row: Record<string, string | number> = { label: label(age), value: age.value };
    for (const g of genderOptions) {
      row[g.value] = filteredEmployees.filter(
        (r) => r.age === age.value && r.gender === g.value,
      ).length;
    }
    return row;
  });

  const table = {
    headers: [t.category, ...genderOptions.map(label)],
    rows: data.map((row) => [
      row.label as string,
      ...genderOptions.map((g) => row[g.value] as number),
    ]),
  };

  const toggleBoth = (ageValue: string, genderValue: string) => {
    dispatch({ type: 'toggle', dataset: 'employee', key: 'age', value: ageValue });
    dispatch({ type: 'toggle', dataset: 'employee', key: 'gender', value: genderValue });
  };

  return (
    <ChartCard
      title={t.ageByGender}
      base={base}
      series="employee"
      table={table}
      ariaLabel={`${t.ageByGender}: n = ${base.n}.`}
    >
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="24%">
          <CartesianGrid vertical={false} stroke="var(--sh-rule)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: 'var(--sh-muted)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--sh-rule)' }}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: 'var(--sh-muted)' }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ fill: 'rgba(20,24,29,0.05)' }}
            formatter={(value, name) => {
              const v = typeof value === 'number' ? value : 0;
              const pct = base.n > 0 ? Math.round((v / base.n) * 100) : 0;
              return [`${v} (${pct}%)`, String(name)];
            }}
            contentStyle={{
              border: '1px solid var(--sh-rule)',
              borderRadius: 6,
              fontSize: 13,
            }}
          />
          <Legend
            formatter={(value: string) => (
              <span className="text-sh-tick text-sh-ink">{value}</span>
            )}
          />
          {genderOptions.map((g) => (
            <Bar
              key={g.value}
              dataKey={g.value}
              name={label(g)}
              fill={GENDER_COLORS[g.value] ?? 'var(--sh-muted)'}
              stroke="rgba(20,24,29,0.18)"
              strokeWidth={1}
              radius={[4, 4, 0, 0]}
              isAnimationActive={!reduced}
              animationDuration={200}
              animationEasing="ease-out"
            >
              {data.map((row) => {
                const isActive =
                  (state.employee['age'] ?? []).includes(row.value as string) &&
                  (state.employee['gender'] ?? []).includes(g.value);
                return (
                  <Cell
                    key={`${row.value}-${g.value}`}
                    cursor="pointer"
                    stroke={isActive ? 'var(--sh-deep)' : 'rgba(20,24,29,0.18)'}
                    strokeWidth={isActive ? 2 : 1}
                    onClick={() => toggleBoth(row.value as string, g.value)}
                  />
                );
              })}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Employer side                                                       */
/* ------------------------------------------------------------------ */

function EmployerCategoryCard({
  title,
  questionId,
  filterKey,
  kind,
}: {
  title: string;
  questionId: string;
  filterKey: string;
  kind: 'bar' | 'donut' | 'horizontal';
}) {
  const { state, dispatch, filteredEmployers } = useFilters();
  const t = useStrings(state.language);
  const options = optionsOf(questionId);
  const { data, answered } = tallyCategory(
    filteredEmployers,
    (r) => r[questionId as keyof EmployerRecord] as string | null,
    options.map((o) => o.value),
  );
  const labelled = withLabels(data, questionId, state.language);
  // Zero-count trailing options crowd the small employer charts; keep only
  // options observed in the FULL dataset, so filters never reshape the axis.
  const base = makeBase(answered, 20);
  const active = state.employer[filterKey] ?? [];
  const toggle = (value: string) =>
    dispatch({ type: 'toggle', dataset: 'employer', key: filterKey, value });

  return (
    <ChartCard
      title={title}
      base={base}
      series="employer"
      table={tableFor(labelled, t)}
      ariaLabel={ariaFor(title, labelled, base.n)}
    >
      {kind === 'donut' ? (
        <CategoryDonut data={labelled} ramp={TEAL_RAMP} activeValues={active} onToggle={toggle} />
      ) : kind === 'horizontal' ? (
        <CategoryBarChartHorizontal
          data={labelled}
          color="var(--sh-employer)"
          activeValues={active}
          onToggle={toggle}
        />
      ) : (
        <CategoryBarChart
          data={labelled}
          color="var(--sh-employer)"
          activeValues={active}
          onToggle={toggle}
        />
      )}
    </ChartCard>
  );
}

function EmployerHeadcountCard() {
  const { state, dispatch, filteredEmployers } = useFilters();
  const t = useStrings(state.language);
  const { data, answered } = tallyCategory(
    filteredEmployers,
    (r) => r.employee_count_band,
    FIRM_SCALE_OPTIONS.map((o) => o.value),
  );
  const labelled = withLabels(data, FIRM_SCALE_OPTIONS, state.language);
  const base = makeBase(answered, 20);
  const active = state.employer['employee_count_band'] ?? [];

  return (
    <ChartCard
      title={t.headcountBand}
      base={base}
      series="employer"
      table={tableFor(labelled, t)}
      ariaLabel={ariaFor(t.headcountBand, labelled, base.n)}
    >
      <CategoryBarChart
        data={labelled}
        color="var(--sh-employer)"
        activeValues={active}
        onToggle={(value) =>
          dispatch({ type: 'toggle', dataset: 'employer', key: 'employee_count_band', value })
        }
      />
    </ChartCard>
  );
}
