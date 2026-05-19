import { useEffect, useMemo, useState } from 'react';
import { getProduct } from '@mlm/product-registry';
import { runSimulation, type ProductId } from '@mlm/simulator-core';
import { createGrowthModulator } from '@mlm/simulator-realistic-growth';
import { evaluateGoals } from '@mlm/simulator-goals';
import { BrandLockup } from './components/BrandLockup';
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
import type { GoalUI } from './components/GoalsEditorDialog';

const DEFAULT_GOALS: GoalUI[] = [
  { id: 'products-refinanced', label: 'Produkte refinanziert', icon: 'leaf',   kind: 'productsRefinanced', amountEUR: 100 },
  { id: 'holiday',             label: 'Urlaub',                 icon: 'plane',  kind: 'yearlySurplus',      amountEUR: 2000, requiresRefinanced: true },
  { id: 'car',                 label: 'Auto',                   icon: 'car',    kind: 'monthlySurplus',     amountEUR: 500,  requiresRefinanced: true },
  { id: 'rent-free',           label: 'Mietfrei wohnen',        icon: 'home',   kind: 'monthlySurplus',     amountEUR: 1400, requiresRefinanced: true },
  { id: 'free-life',           label: 'Frei leben',             icon: 'crown',  kind: 'monthlyIncome',      amountEUR: 5000, requiresRefinanced: true },
];

interface PersistedAppState {
  membersPerYear?: number;
  shoppersPerYear?: number;
  monthlyIP?: number;
  duplication?: number;
  attrition?: number;
  ipToEur?: number;
  maxDirectMembersPerMember?: number;
  realityStrategy?: RealityStrategy;
  goals?: GoalUI[];
  monthlyProductCostEUR?: number;
}

const STORAGE_VERSION = 1;

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
  const [page, setPage] = useState<'chart' | 'network'>('chart');
  const [networkView, setNetworkView] = useState<NetworkView>('sunburst');
  const [networkMenuOpen, setNetworkMenuOpen] = useState(false);

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
    setRealityStrategy('standard');
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

  const growthModulator = useMemo(
    () => {
      if (realityStrategy === 'standard') return undefined;

      return createGrowthModulator({
        strategy: realityStrategy,
        seed: 42,
      });
    },
    [realityStrategy],
  );

  const result = useMemo(
    () => runSimulation(product, inputs, undefined, { growthModulator }),
    [product, inputs, growthModulator],
  );

  const goalProgress = useMemo(
    () => evaluateGoals(result, activeGoals(goals), inputs),
    [result, goals, inputs],
  );

  const finalMonth = result.finalMonth;
  const networkSize = Math.round(finalMonth.networkSize);
  const formattedNetworkSize =
    networkSize >= 1000
      ? networkSize.toLocaleString('de-DE')
      : networkSize.toString();

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

          <div className="relative">
            <button
              onClick={() => setNetworkMenuOpen((open) => !open)}
              aria-label="Netzwerkansicht waehlen"
              title="Netzwerk"
              className={`text-gray-500 hover:text-gray-900 transition p-2 rounded-md hover:bg-gray-100 ${
                page === 'network' ? 'bg-gray-100 text-brand-700' : ''
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="5" r="2.5" />
                <circle cx="6" cy="18" r="2.5" />
                <circle cx="18" cy="18" r="2.5" />
                <path d="M10.8 7.2 7.2 15.8" />
                <path d="M13.2 7.2 16.8 15.8" />
                <path d="M8.5 18h7" />
              </svg>
            </button>
            {networkMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-lg border border-gray-200 bg-white shadow-lg p-1 z-30">
                <NetworkMenuItem label="Sunburst" active={networkView === 'sunburst'} icon="sunburst" onClick={() => { setNetworkView('sunburst'); setPage('network'); setNetworkMenuOpen(false); }} />
                <NetworkMenuItem label="Bein-Spalten" active={networkView === 'legs'} icon="columns" onClick={() => { setNetworkView('legs'); setPage('network'); setNetworkMenuOpen(false); }} />
                <NetworkMenuItem label="Hybrid-Tree" active={networkView === 'hybrid'} icon="tree" onClick={() => { setNetworkView('hybrid'); setPage('network'); setNetworkMenuOpen(false); }} />
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
            <AdvancedSettingsPanel
              maxDirectMembersPerMember={maxDirectMembersPerMember}
              onMaxDirectChange={setMaxDirectMembersPerMember}
              monthlyProductCostEUR={monthlyProductCostEUR}
              onMonthlyProductCostChange={setMonthlyProductCostEUR}
              realityStrategy={realityStrategy}
              onRealityStrategyChange={setRealityStrategy}
              goals={goals}
              onGoalsChange={setGoals}
              defaultGoals={DEFAULT_GOALS}
              onResetAll={resetAll}
              goalProgress={goalProgress}
            />
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-4 mb-5">
              <Slider label={`${product.terminology.memberLabel} / Jahr`} value={membersPerYear} min={0} max={6} step={0.25} onChange={setMembersPerYear} />
              <Slider label={`${product.terminology.shopperLabel} / Jahr`} value={shoppersPerYear} min={0} max={6} step={0.25} onChange={setShoppersPerYear} />
              <Slider label="Umsatz / Monat" value={monthlyIP} min={45} max={500} step={5} unit={` ${product.terminology.volumeUnit}`} onChange={setMonthlyIP} />
              <Slider label="Duplikation" value={duplication} min={0} max={100} unit="%" onChange={setDuplication} />
              <Slider label="Fluktuation" value={attrition} min={0} max={50} unit="%" onChange={setAttrition} />
            </div>
            <HeroNumber monthlyEUR={finalMonth.totalEUR} year={finalMonth.year} />
            <div className="grid grid-cols-2 gap-2.5 mt-4 mb-4">
              <StatCard label="Netzwerk-Groesse" value={formattedNetworkSize} />
              <StatCard label={`Aktueller ${product.terminology.rankLabel}`} value={finalMonth.rankName} />
            </div>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Provisionsverlauf - 10 Jahre</p>
              <ProvisionChart
                yearEnds={result.yearEnds}
                goalProgress={goalProgress}
                goals={goals}
              />
            </div>
            <YearlySummaryTable years={result.yearSummaries} />
            </div>
          </>
        ) : (
          <NetworkVisualizations
            yearEnds={result.yearEnds}
            selectedView={networkView}
            memberMonthlyVolume={inputs.memberMonthlyVolume}
            shopperMonthlyVolume={inputs.shopperMonthlyVolume}
          />
        )}
        <p className="text-xs text-gray-500 text-center mt-4 px-4">
          Schaetzung auf Basis des aktuell hinterlegten Verguetungsplans. Keine Garantie fuer tatsaechliche Provisionen.
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

function normalizeRealityStrategy(strategy: RealityStrategy | undefined): RealityStrategy {
  if (strategy === 'dirichlet' || strategy === 'momentum') return strategy;
  return 'standard';
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
