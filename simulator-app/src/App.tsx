import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getProduct } from '@mlm/product-registry';
import {
  runSimulation,
  type ProductId,
  type SimulationResult,
  type SimulationMode,
} from '@mlm/simulator-core';
import { createTreeGrowthStrategy } from '@mlm/simulator-realistic-growth';
import { evaluateGoals } from '@mlm/simulator-goals';
import { BrandLockup } from './components/BrandLockup';
import { NumberStepper } from './components/NumberStepper';
import { Slider } from './components/Slider';
import { HeroNumber } from './components/HeroNumber';
import { StatCard } from './components/StatCard';
import { ProvisionChart } from './components/ProvisionChart';
import { SettingsDrawer } from './components/SettingsDrawer';
import { YearlySummaryTable } from './components/YearlySummaryTable';
import {
  NetworkVisualizations,
  type NetworkView,
} from './components/NetworkVisualizations';
import {
  AdvancedSettingsPanel,
  type RealityStrategy,
} from './components/AdvancedSettingsPanel';
import { GoalsLadderPanel } from './components/GoalsLadderPanel';
import type { GoalUI } from './components/GoalsEditorDialog';
import { LineageView } from './components/lineage/LineageView';
import {
  PersonTreeVisualizations,
  type PersonTreeView,
} from './components/person-tree/PersonTreeVisualizations';

const DEFAULT_GOALS: GoalUI[] = [
  { id: 'products-refinanced', label: 'Produkte refinanziert', icon: 'leaf',   kind: 'productsRefinanced', amountEUR: 100 },
  { id: 'holiday',             label: 'Urlaub',                 icon: 'plane',  kind: 'yearlySurplus',      amountEUR: 2000, requiresRefinanced: true },
  { id: 'car',                 label: 'Auto',                   icon: 'car',    kind: 'monthlySurplus',     amountEUR: 500,  requiresRefinanced: true },
  { id: 'rent-free',           label: 'Mietfrei wohnen',        icon: 'home',   kind: 'monthlySurplus',     amountEUR: 1400, requiresRefinanced: true },
  { id: 'free-life',           label: 'Frei leben',             icon: 'crown',  kind: 'monthlyIncome',      amountEUR: 5000, requiresRefinanced: true },
];

type InputMode = 'slider' | 'stepper';

interface PersistedAppState {
  membersPerYear?: number;
  shoppersPerYear?: number;
  monthlyIP?: number;
  duplication?: number;
  attrition?: number;
  ipToEur?: number;
  maxDirectMembersPerMember?: number;
  realityStrategy?: RealityStrategy | 'standard' | 'dirichlet' | 'momentum' | 'lifecycle';
  goals?: GoalUI[];
  monthlyProductCostEUR?: number;
  inputMode?: InputMode;
}

const STORAGE_VERSION = 1;
type ExpandedSection = 'goals' | 'advanced' | null;
type DetailStatus = 'ready' | 'loading';
const DETAIL_CALCULATION_DEBOUNCE_MS = 800;

export default function App() {
  const productId = (import.meta.env.VITE_PRODUCT ?? 'lifeplus') as ProductId;
  const product = getProduct(productId);
  const defaults = product.simulator.defaultInputs;
  const persistedState = useMemo(
    () => loadPersistedState(productId),
    [productId],
  );

  useEffect(() => {
    document.title = product.brand.name;
  }, [product.brand.name]);

  const [membersPerYear, setMembersPerYear] = useState(
    persistedState?.membersPerYear ?? defaults.membersPerYear,
  );
  const [shoppersPerYear, setShoppersPerYear] = useState(
    persistedState?.shoppersPerYear ?? defaults.shoppersPerYear,
  );
  const [monthlyIP, setMonthlyIP] = useState(
    persistedState?.monthlyIP ?? defaults.memberMonthlyVolume,
  );
  const [duplication, setDuplication] = useState(
    persistedState?.duplication ?? defaults.duplicationRate * 100,
  );
  const [attrition, setAttrition] = useState(
    persistedState?.attrition ?? defaults.attritionRate * 100,
  );
  const [ipToEur, setIpToEur] = useState(
    persistedState?.ipToEur ?? defaults.unitToCurrency ?? 1,
  );
  const [page, setPage] = useState<'chart' | 'network' | 'lineage' | 'person-tree'>('chart');
  const [networkView, setNetworkView] = useState<NetworkView>('sunburst');
  const [personTreeView, setPersonTreeView] = useState<PersonTreeView>('radial');
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const [expandedSection, setExpandedSection] =
    useState<ExpandedSection>(null);

  useEffect(() => {
    if (!viewMenuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setViewMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setViewMenuOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [viewMenuOpen]);

  const [maxDirectMembersPerMember, setMaxDirectMembersPerMember] = useState(
    persistedState?.maxDirectMembersPerMember ??
      defaults.maxDirectMembersPerMember ??
      29,
  );
  const [realityStrategy, setRealityStrategy] = useState<RealityStrategy>(
    normalizeRealityStrategy(persistedState?.realityStrategy),
  );
  const [goals, setGoals] = useState<GoalUI[]>(
    cloneGoals(persistedState?.goals ?? DEFAULT_GOALS),
  );
  const [monthlyProductCostEUR, setMonthlyProductCostEUR] = useState(
    persistedState?.monthlyProductCostEUR ??
      defaults.monthlyProductCostEUR ??
      100,
  );
  const [inputMode, setInputMode] = useState<InputMode>(
    persistedState?.inputMode ?? 'slider',
  );

  useEffect(() => {
    savePersistedState(productId, {
      membersPerYear,
      shoppersPerYear,
      monthlyIP,
      duplication,
      attrition,
      ipToEur,
      maxDirectMembersPerMember,
      realityStrategy,
      goals,
      monthlyProductCostEUR,
      inputMode,
    });
  }, [
    productId,
    membersPerYear,
    shoppersPerYear,
    monthlyIP,
    duplication,
    attrition,
    ipToEur,
    maxDirectMembersPerMember,
    realityStrategy,
    goals,
    monthlyProductCostEUR,
    inputMode,
  ]);

  const resetAll = () => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Alle Anpassungen verwerfen und auf Produkt-Defaults zuruecksetzen?',
      );
      if (!confirmed) return;
    }
    clearPersistedState(productId);
    setMembersPerYear(defaults.membersPerYear);
    setShoppersPerYear(defaults.shoppersPerYear);
    setMonthlyIP(defaults.memberMonthlyVolume);
    setDuplication(defaults.duplicationRate * 100);
    setAttrition(defaults.attritionRate * 100);
    setIpToEur(defaults.unitToCurrency ?? 1);
    setMaxDirectMembersPerMember(defaults.maxDirectMembersPerMember ?? 29);
    setRealityStrategy('person-tree');
    setGoals(cloneGoals(DEFAULT_GOALS));
    setMonthlyProductCostEUR(defaults.monthlyProductCostEUR ?? 100);
  };

  const inputs = useMemo(
    () => ({
      membersPerYear,
      shoppersPerYear,
      duplicationRate: duplication / 100,
      attritionRate: attrition / 100,
      memberMonthlyVolume: monthlyIP,
      shopperMonthlyVolume: monthlyIP,
      unitToCurrency: ipToEur,
      monthlyProductCostEUR,
      maxDirectMembersPerMember,
    }),
    [
      membersPerYear,
      shoppersPerYear,
      monthlyIP,
      duplication,
      attrition,
      ipToEur,
      monthlyProductCostEUR,
      maxDirectMembersPerMember,
    ],
  );

  const treeGrowthStrategy = useMemo(
    () => {
      if (realityStrategy === 'person-tree-random') {
        return createTreeGrowthStrategy({
          strategy: 'dirichlet',
          seed: 42,
        });
      }

      if (realityStrategy === 'person-tree-momentum') {
        return createTreeGrowthStrategy({
          strategy: 'momentum',
          seed: 42,
        });
      }

      return undefined;
    },
    [realityStrategy],
  );

  const simulationMode = useMemo<SimulationMode>(
    () => realityStrategy,
    [realityStrategy],
  );

  const fastResult = useMemo(
    () =>
      runSimulation(product, inputs, undefined, {
        simulationMode: 'standard',
      }),
    [product, inputs],
  );
  const [detailResult, setDetailResult] = useState<SimulationResult | undefined>(
    undefined,
  );
  const [detailResultKey, setDetailResultKey] = useState('');
  const [detailStatus, setDetailStatus] = useState<DetailStatus>('loading');
  const detailRequestKey = useMemo(
    () =>
      JSON.stringify({
        product: product.id,
        inputs,
        realityStrategy,
      }),
    [inputs, product.id, realityStrategy],
  );

  useEffect(() => {
    setDetailStatus('loading');
    const handle = window.setTimeout(() => {
      const nextDetail = runSimulation(product, inputs, undefined, {
        simulationMode,
        treeGrowthStrategy,
      });
      setDetailResult(nextDetail);
      setDetailResultKey(detailRequestKey);
      setDetailStatus('ready');
    }, DETAIL_CALCULATION_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [detailRequestKey, inputs, product, simulationMode, treeGrowthStrategy]);

  const detailedResult =
    detailResult !== undefined &&
    detailStatus === 'ready' &&
    detailResultKey === detailRequestKey
      ? detailResult
      : undefined;
  const result = detailedResult ?? fastResult;
  const resultIsDetailed = detailedResult !== undefined;
  const visualizationResult = detailedResult ?? fastResult;

  const statusValue = detailResult?.finalQuarter.rankName ?? 'wird berechnet';

  const statusHint =
    !detailedResult
      ? 'Neuberechnung laeuft — Hero zeigt letzten exakten Stand'
      : 'Exakt aktualisiert';

  const showDetailedTable = detailedResult !== undefined;
  const tableYears = detailedResult?.yearSummaries ?? [];

  const detailCaption =
    !detailedResult
      ? 'Chart und Ziele folgen live. Hero/Netzwerk/Rang bleiben auf dem letzten exakten Stand, bis die Detail-Berechnung fertig ist.'
      : 'Hero, Ziele, Chart, Status, Beine und Tabelle sind mit echten Detaildaten aktualisiert.';

  const goalProgress = useMemo(
    () => evaluateGoals(result, activeGoals(goals), inputs),
    [result, goals, inputs],
  );

  // Hero-Block (Provision, Netzwerk, Rang) zieht aus detailResult — bleibt
  // auf dem letzten EXAKT berechneten Stand stehen, statt bei jeder
  // Slider-Bewegung auf die Aggregat-Approximation umzuspringen. Chart und
  // Tabelle laufen weiter wie bisher (result-basiert).
  const heroQuarter = detailResult?.finalQuarter;
  const heroNetworkSize = Math.round(heroQuarter?.networkSize ?? 0);
  const formattedHeroNetworkSize =
    heroQuarter === undefined
      ? 'wird berechnet'
      : heroNetworkSize >= 1000
      ? heroNetworkSize.toLocaleString('de-DE')
      : heroNetworkSize.toString();
  const heroIsStale = detailResult !== undefined && !detailedResult;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <a
          href={product.siteUrl}
          aria-label="Zur Webseite"
          className="flex items-center gap-3 hover:opacity-80 transition min-w-0"
        >
          <BrandLockup lockup={product.brand.lockup} size={28} />
          <h1 className="text-sm font-medium text-gray-600 truncate">Verguetungs-Simulator</h1>
        </a>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage('chart')}
            aria-label="Zur Chart-Seite"
            title="Chart"
            className={`text-gray-500 hover:text-gray-900 transition p-2 rounded-md hover:bg-gray-100 ${
              page === 'chart' ? 'bg-gray-100 text-brand-700' : ''
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 19V5" />
              <path d="M4 19h16" />
              <path d="M8 16v-5" />
              <path d="M12 16V8" />
              <path d="M16 16v-3" />
              <path d="M20 16V7" />
            </svg>
          </button>

          <button
            onClick={() => setPage('lineage')}
            aria-label="Verguetungsplan erklaeren"
            title="Verguetungsplan"
            className={`text-gray-500 hover:text-gray-900 transition p-2 rounded-md hover:bg-gray-100 ${
              page === 'lineage' ? 'bg-gray-100 text-brand-700' : ''
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M7 4h10" strokeLinecap="round" />
              <path d="M9 8h6" strokeLinecap="round" />
              <path d="M12 8v11" />
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
              <path d="M14 12h5" strokeLinecap="round" />
              <path d="M14 19h5" strokeLinecap="round" />
            </svg>
          </button>

          <div className="relative" ref={viewMenuRef}>
            <button
              onClick={() => setViewMenuOpen((open) => !open)}
              aria-label="Netzwerk- oder Personenbaum-Ansicht waehlen"
              title="Netzwerk / Personenbaum"
              className={`text-gray-500 hover:text-gray-900 transition p-2 rounded-md hover:bg-gray-100 ${
                page === 'person-tree' || page === 'network' ? 'bg-gray-100 text-brand-700' : ''
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="4" r="2" />
                <circle cx="6" cy="13" r="2" />
                <circle cx="18" cy="13" r="2" />
                <circle cx="6" cy="20" r="1.5" />
                <circle cx="18" cy="20" r="1.5" />
                <path d="M12 6v3l-6 2" />
                <path d="M12 9l6 2" />
                <path d="M6 15v3" />
                <path d="M18 15v3" />
              </svg>
            </button>
            {viewMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-lg border border-gray-200 bg-white shadow-lg p-1 z-30">
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Personen
                </div>
                <PersonTreeMenuItem
                  label="Radial Tree"
                  active={page === 'person-tree' && personTreeView === 'radial'}
                  icon="radial"
                  onClick={() => {
                    setPersonTreeView('radial');
                    setPage('person-tree');
                    setViewMenuOpen(false);
                  }}
                />
                <PersonTreeMenuItem
                  label="Dendrogramm"
                  active={page === 'person-tree' && personTreeView === 'dendrogram'}
                  icon="dendrogram"
                  onClick={() => {
                    setPersonTreeView('dendrogram');
                    setPage('person-tree');
                    setViewMenuOpen(false);
                  }}
                />
                <PersonTreeMenuItem
                  label="Hyperbolic Tree"
                  active={false}
                  icon="hyperbolic"
                  disabled
                  onClick={() => {}}
                />
                <div className="px-3 pt-2 pb-1 mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 border-t border-gray-100">
                  Gruppen
                </div>
                <NetworkMenuItem
                  label="Sunburst"
                  active={page === 'network' && networkView === 'sunburst'}
                  icon="sunburst"
                  onClick={() => { setNetworkView('sunburst'); setPage('network'); setViewMenuOpen(false); }}
                />
                <NetworkMenuItem
                  label="Bein-Spalten"
                  active={page === 'network' && networkView === 'legs'}
                  icon="columns"
                  onClick={() => { setNetworkView('legs'); setPage('network'); setViewMenuOpen(false); }}
                />
                <NetworkMenuItem
                  label="Hybrid-Tree"
                  active={page === 'network' && networkView === 'hybrid'}
                  icon="tree"
                  onClick={() => { setNetworkView('hybrid'); setPage('network'); setViewMenuOpen(false); }}
                />
              </div>
            )}
          </div>

          <SettingsDrawer
            ipToEur={ipToEur}
            onIpToEurChange={setIpToEur}
            productName={product.terminology.productName}
          />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {page === 'chart' ? (
          <>
            <GoalsLadderPanel
              open={expandedSection === 'goals'}
              onToggle={() =>
                setExpandedSection((section) =>
                  section === 'goals' ? null : 'goals',
                )
              }
              goals={goals}
              onGoalsChange={setGoals}
              defaultGoals={DEFAULT_GOALS}
              monthlyProductCostEUR={monthlyProductCostEUR}
              goalProgress={goalProgress}
            />
            <AdvancedSettingsPanel
              open={expandedSection === 'advanced'}
              onToggle={() =>
                setExpandedSection((section) =>
                  section === 'advanced' ? null : 'advanced',
                )
              }
              maxDirectMembersPerMember={maxDirectMembersPerMember}
              onMaxDirectChange={setMaxDirectMembersPerMember}
              monthlyProductCostEUR={monthlyProductCostEUR}
              onMonthlyProductCostChange={setMonthlyProductCostEUR}
              realityStrategy={realityStrategy}
              onRealityStrategyChange={setRealityStrategy}
              onResetAll={resetAll}
            />
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="mb-3 flex justify-end">
              <InputModeToggle value={inputMode} onChange={setInputMode} />
            </div>
            <div className="mb-5 space-y-4">
              <ControlGroup title="Wachstum" cols={2}>
                {inputMode === 'slider' ? (
                  <Slider label={`${product.terminology.memberLabel} / Jahr`} value={membersPerYear} min={0} max={36} step={0.5} onChange={setMembersPerYear} />
                ) : (
                  <NumberStepper label={`${product.terminology.memberLabel} / Jahr`} value={membersPerYear} min={0} max={36} step={0.5} onChange={setMembersPerYear} />
                )}
                {inputMode === 'slider' ? (
                  <Slider label={`${product.terminology.shopperLabel} / Jahr`} value={shoppersPerYear} min={0} max={36} step={0.5} onChange={setShoppersPerYear} />
                ) : (
                  <NumberStepper label={`${product.terminology.shopperLabel} / Jahr`} value={shoppersPerYear} min={0} max={36} step={0.5} onChange={setShoppersPerYear} />
                )}
              </ControlGroup>
              <ControlGroup title="Umsätze Members und Shopper">
                {inputMode === 'slider' ? (
                  <Slider label="Umsatz / Monat" value={monthlyIP} min={40} max={200} step={5} unit={` ${product.terminology.volumeUnit}`} onChange={setMonthlyIP} />
                ) : (
                  <NumberStepper label="Umsatz / Monat" value={monthlyIP} min={40} step={5} fastStep={25} unit={` ${product.terminology.volumeUnit}`} onChange={setMonthlyIP} />
                )}
              </ControlGroup>
              <ControlGroup title="Dynamik" cols={2}>
                {inputMode === 'slider' ? (
                  <Slider label="Duplikation" value={duplication} min={0} max={100} step={1} unit="%" onChange={setDuplication} />
                ) : (
                  <NumberStepper label="Duplikation" value={duplication} min={0} max={100} step={1} fastStep={10} unit="%" onChange={setDuplication} />
                )}
                {inputMode === 'slider' ? (
                  <Slider label="Fluktuation" value={attrition} min={0} max={50} step={1} unit="%" onChange={setAttrition} />
                ) : (
                  <NumberStepper label="Fluktuation" value={attrition} min={0} max={50} step={1} fastStep={10} unit="%" onChange={setAttrition} />
                )}
              </ControlGroup>
            </div>
            <div className={`transition-opacity ${heroIsStale ? 'opacity-60' : 'opacity-100'}`}>
              {heroQuarter ? (
                <HeroNumber monthlyEUR={heroQuarter.totalEUR} year={heroQuarter.year} />
              ) : (
                <HeroSkeleton />
              )}
              <div className="grid grid-cols-2 gap-2.5 mt-4 mb-4">
                <StatCard label="Netzwerk-Groesse" value={formattedHeroNetworkSize} />
                <StatCard
                  label={`Aktueller ${product.terminology.rankLabel}`}
                  value={statusValue}
                />
              </div>
            </div>
            <p className="mb-4 text-xs text-gray-500">
              {statusHint}: {detailCaption}
            </p>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Provisionsverlauf - 10 Jahre</p>
              <div className="relative">
                <ProvisionChart
                  yearEnds={result.yearEnds}
                  goalProgress={goalProgress}
                  goals={goals}
                  mode={resultIsDetailed ? 'detail' : 'aggregate'}
                />
                {!resultIsDetailed && <OrangeHourglassSpinner />}
              </div>
            </div>
            {showDetailedTable ? (
              <YearlySummaryTable
                years={tableYears}
                personYearEnds={detailedResult?.personYearEnds}
                treeCompensationYearEnds={detailedResult?.treeCompensationYearEnds}
              />
            ) : (
              <ExactDataPlaceholder />
            )}
            </div>
          </>
        ) : page === 'network' ? (
          <NetworkVisualizations
            yearEnds={visualizationResult.yearEnds}
            selectedView={networkView}
            memberMonthlyVolume={inputs.memberMonthlyVolume}
            shopperMonthlyVolume={inputs.shopperMonthlyVolume}
            personYearEnds={visualizationResult.personYearEnds}
            treeCompensationYearEnds={visualizationResult.treeCompensationYearEnds}
            unitToCurrency={inputs.unitToCurrency ?? 1}
          />
        ) : page === 'lineage' ? (
          <LineageView />
        ) : (
          <PersonTreeVisualizations
            personYearEnds={visualizationResult.personYearEnds ?? []}
            treeCompensationYearEnds={visualizationResult.treeCompensationYearEnds}
            memberMonthlyVolume={inputs.memberMonthlyVolume}
            shopperMonthlyVolume={inputs.shopperMonthlyVolume}
            unitToCurrency={inputs.unitToCurrency ?? 1}
            selectedView={personTreeView}
          />
        )}
        <p className="text-xs text-gray-500 text-center mt-4 px-4">
          Berechnungen auf Basis des aktuell hinterlegten Verguetungsplans. Keine Garantie fuer tatsaechliche Provisionen.
        </p>
      </main>
      <footer className="max-w-4xl mx-auto px-4 sm:px-6 pb-8 pt-2">
        <div className="border-t border-gray-200 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <span>© 2026 {product.brand.shortName}</span>
          <div className="flex items-center gap-3">
            <a
              href={`${product.siteUrl}impressum.html`}
              className="hover:text-brand-700 transition"
            >
              Impressum
            </a>
            <a
              href={`${product.siteUrl}datenschutz.html`}
              className="hover:text-brand-700 transition"
            >
              Datenschutz
            </a>
            <a
              href={product.siteUrl}
              className="hover:text-brand-700 transition"
            >
              Zur Webseite
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function activeGoals(goals: GoalUI[]): GoalUI[] {
  return goals.filter(
    (goal) => goal.kind === 'productsRefinanced' || goal.amountEUR > 0,
  );
}

function InputModeToggle({
  value,
  onChange,
}: {
  value: InputMode;
  onChange: (mode: InputMode) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5 text-xs">
      <button
        type="button"
        onClick={() => onChange('slider')}
        className={`flex items-center gap-1 rounded px-2 py-1 transition ${
          value === 'slider'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-900'
        }`}
        aria-pressed={value === 'slider'}
        title="Slider"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="12" x2="20" y2="12" />
          <circle cx="14" cy="12" r="3" fill="currentColor" />
        </svg>
        Slider
      </button>
      <button
        type="button"
        onClick={() => onChange('stepper')}
        className={`flex items-center gap-1 rounded px-2 py-1 transition ${
          value === 'stepper'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-900'
        }`}
        aria-pressed={value === 'stepper'}
        title="Stepper"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="8" width="5" height="8" rx="1" />
          <rect x="9.5" y="8" width="5" height="8" rx="1" />
          <rect x="16" y="8" width="5" height="8" rx="1" />
          <line x1="5.5" y1="12" x2="5.5" y2="12" />
          <line x1="18.5" y1="12" x2="18.5" y2="12" />
        </svg>
        Stepper
      </button>
    </div>
  );
}

function ControlGroup({
  title,
  children,
  cols = 1,
}: {
  title: string;
  children: ReactNode;
  cols?: 1 | 2 | 3;
}) {
  const colsClass =
    cols === 3
      ? 'grid-cols-1 lg:grid-cols-3'
      : cols === 2
        ? 'grid-cols-1 lg:grid-cols-2'
        : 'grid-cols-1';

  return (
    <section>
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
        {title}
      </h2>
      <div className={`grid ${colsClass} gap-x-4 gap-y-3`}>
        {children}
      </div>
    </section>
  );
}

function ExactDataPlaceholder() {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5">
      <div className="mb-3 flex items-center gap-3">
        <InlineOrangeSpinner />
        <p className="text-sm font-medium text-gray-800">
          Exakte LifePlus-Tabelle wird berechnet
        </p>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Die schnelle Umsatzkurve und Zielmarker sind bereits aktualisiert. Status,
        Beine und Provisionen werden nachgeliefert, sobald die Eingabe kurz ruht.
      </p>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-5 text-center">
      <p className="text-xs uppercase tracking-wider text-gray-500">
        Provision in Jahr 10
      </p>
      <div className="mx-auto mt-3 h-8 w-44 animate-pulse rounded bg-gray-200" />
      <div className="mx-auto mt-2 h-4 w-32 animate-pulse rounded bg-gray-100" />
    </div>
  );
}

function OrangeHourglassSpinner() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
    >
      <div className="h-16 w-16 animate-spin rounded-full border-[7px] border-orange-500 border-l-transparent border-r-transparent opacity-95" />
    </div>
  );
}

function InlineOrangeSpinner() {
  return (
    <span
      className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-[3px] border-orange-500 border-l-transparent border-r-transparent"
      aria-hidden="true"
    />
  );
}

function storageKey(productId: ProductId): string {
  return `mlm-simulator:${productId}:v${STORAGE_VERSION}`;
}

function loadPersistedState(productId: ProductId): PersistedAppState | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const raw = window.localStorage.getItem(storageKey(productId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as PersistedAppState;

    return {
      ...parsed,
      realityStrategy: normalizeRealityStrategy(parsed.realityStrategy),
      goals: sanitizeGoals(parsed.goals),
    };
  } catch {
    return undefined;
  }
}

function savePersistedState(productId: ProductId, state: PersistedAppState): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey(productId), JSON.stringify(state));
  } catch {
    // Storage can be unavailable in private browsing. The simulator still works.
  }
}

function clearPersistedState(productId: ProductId): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(storageKey(productId));
  } catch {
    // Ignore storage failures; state reset in React still applies.
  }
}

function normalizeRealityStrategy(
  strategy: PersistedAppState['realityStrategy'] | undefined,
): RealityStrategy {
  if (
    strategy === 'person-tree' ||
    strategy === 'person-tree-random' ||
    strategy === 'person-tree-momentum'
  ) {
    return strategy;
  }
  if (strategy === 'standard') return 'person-tree';
  if (strategy === 'dirichlet') return 'person-tree-random';
  if (strategy === 'momentum') return 'person-tree-momentum';
  if (strategy === 'lifecycle') return 'person-tree';
  return 'person-tree';
}

function cloneGoals(goals: GoalUI[]): GoalUI[] {
  return goals.map((goal) => ({ ...goal }));
}

function sanitizeGoals(goals: GoalUI[] | undefined): GoalUI[] | undefined {
  if (!Array.isArray(goals)) return undefined;

  const cleaned = goals
    .filter((goal) => goal && typeof goal.id === 'string')
    .map((goal) => ({
      id: goal.id,
      label: goal.label || 'Ziel',
      icon: goal.icon || 'crown',
      kind: goal.kind || 'monthlySurplus',
      amountEUR: Math.max(0, Number(goal.amountEUR) || 0),
      requiresRefinanced: goal.requiresRefinanced,
    }));

  return cleaned.length > 0 ? cleaned : undefined;
}

function NetworkMenuItem({ label, active, icon, onClick }: { label: string; active: boolean; icon: 'sunburst' | 'columns' | 'tree'; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${active ? 'bg-brand-50 text-brand-800' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-950'}`}>
      <MenuIcon type={icon} />
      <span>{label}</span>
    </button>
  );
}

function MenuIcon({ type }: { type: 'sunburst' | 'columns' | 'tree' }) {
  if (type === 'sunburst') {
    return (
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="10" cy="10" r="2.2" />
        <path d="M10 3a7 7 0 0 1 7 7" />
        <path d="M10 17a7 7 0 0 1-7-7" />
        <path d="M4.8 5.2a7 7 0 0 1 10 0" />
      </svg>
    );
  }
  if (type === 'columns') {
    return (
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 5h3v10H4z" />
        <path d="M8.5 3h3v12h-3z" />
        <path d="M13 7h3v8h-3z" />
      </svg>
    );
  }
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="4" r="2" />
      <circle cx="5" cy="15" r="2" />
      <circle cx="15" cy="15" r="2" />
      <path d="M9 6 6 13" />
      <path d="M11 6 14 13" />
    </svg>
  );
}

function PersonTreeMenuItem({
  label,
  active,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  icon: 'radial' | 'dendrogram' | 'hyperbolic';
  onClick: () => void;
  disabled?: boolean;
}) {
  const stateClass = disabled
    ? 'text-gray-300 cursor-not-allowed'
    : active
      ? 'bg-brand-50 text-brand-800'
      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-950';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'In Vorbereitung' : undefined}
      className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${stateClass}`}
    >
      <PersonTreeMenuIcon type={icon} />
      <span>{label}</span>
      {disabled && (
        <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-400">bald</span>
      )}
    </button>
  );
}

function PersonTreeMenuIcon({ type }: { type: 'radial' | 'dendrogram' | 'hyperbolic' }) {
  if (type === 'radial') {
    return (
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="10" cy="10" r="1.6" />
        <circle cx="10" cy="3.5" r="1.2" />
        <circle cx="16" cy="12" r="1.2" />
        <circle cx="4.5" cy="13.5" r="1.2" />
        <path d="M10 5.1 10 8.4" />
        <path d="M11.3 10.9 14.7 11.7" />
        <path d="M8.7 10.9 5.8 12.9" />
      </svg>
    );
  }
  if (type === 'dendrogram') {
    return (
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="4" cy="10" r="1.2" />
        <circle cx="11" cy="5" r="1.2" />
        <circle cx="11" cy="15" r="1.2" />
        <circle cx="16" cy="3" r="1" />
        <circle cx="16" cy="7" r="1" />
        <circle cx="16" cy="13" r="1" />
        <circle cx="16" cy="17" r="1" />
        <path d="M5.2 10 9.8 5" />
        <path d="M5.2 10 9.8 15" />
        <path d="M12 5 15 3" />
        <path d="M12 5 15 7" />
        <path d="M12 15 15 13" />
        <path d="M12 15 15 17" />
      </svg>
    );
  }
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="10" r="7" />
      <path d="M3 10 17 10" />
      <path d="M5 6 15 14" />
      <path d="M5 14 15 6" />
    </svg>
  );
}
