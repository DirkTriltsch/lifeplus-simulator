import { useMemo, useState } from 'react';
import { Slider } from './components/Slider';
import { HeroNumber } from './components/HeroNumber';
import { StatCard } from './components/StatCard';
import { ProvisionChart } from './components/ProvisionChart';
import { SettingsDrawer } from './components/SettingsDrawer';
import { YearlySummaryTable } from './components/YearlySummaryTable';
import { LegalSection } from './components/LegalSection';
import {
  NetworkVisualizations,
  type NetworkView,
} from './components/NetworkVisualizations';
import { runSimulation } from './engine/simulation';

export default function App() {
  // Default-Werte gemäß Spezifikation
  const [membersPerYear, setMembersPerYear] = useState(2);
  const [shoppersPerYear, setShoppersPerYear] = useState(3);
  const [monthlyIP, setMonthlyIP] = useState(45);
  const [duplication, setDuplication] = useState(100); // %
  const [attrition, setAttrition] = useState(0); // %
  const [ipToEur, setIpToEur] = useState(1);
  const [page, setPage] = useState<'chart' | 'network'>('chart');
  const [networkView, setNetworkView] = useState<NetworkView>('sunburst');
  const [networkMenuOpen, setNetworkMenuOpen] = useState(false);

  const result = useMemo(
    () =>
      runSimulation({
        membersPerYear,
        shoppersPerYear,
        duplicationRate: duplication / 100,
        attritionRate: attrition / 100,
        memberMonthlyIP: monthlyIP,
        shopperMonthlyIP: monthlyIP,
        ipToEur,
      }),
    [membersPerYear, shoppersPerYear, monthlyIP, duplication, attrition, ipToEur],
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
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-brand-400 flex items-center justify-center text-white font-bold text-sm">
            L+
          </div>
          <h1 className="text-base font-medium text-gray-900">
            LifePlus Vergütungs-Simulator
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage('chart')}
            aria-label="Zur Chart-Seite"
            title="Chart"
            className={`text-gray-500 hover:text-gray-900 transition p-2 rounded-md hover:bg-gray-100 ${
              page === 'chart' ? 'bg-gray-100 text-brand-700' : ''
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
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
              aria-label="Netzwerkansicht wählen"
              title="Netzwerk"
              className={`text-gray-500 hover:text-gray-900 transition p-2 rounded-md hover:bg-gray-100 ${
                page === 'network' ? 'bg-gray-100 text-brand-700' : ''
              }`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
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
                <NetworkMenuItem
                  label="Sunburst"
                  active={networkView === 'sunburst'}
                  icon="sunburst"
                  onClick={() => {
                    setNetworkView('sunburst');
                    setPage('network');
                    setNetworkMenuOpen(false);
                  }}
                />
                <NetworkMenuItem
                  label="Bein-Spalten"
                  active={networkView === 'legs'}
                  icon="columns"
                  onClick={() => {
                    setNetworkView('legs');
                    setPage('network');
                    setNetworkMenuOpen(false);
                  }}
                />
                <NetworkMenuItem
                  label="Hybrid-Tree"
                  active={networkView === 'hybrid'}
                  icon="tree"
                  onClick={() => {
                    setNetworkView('hybrid');
                    setPage('network');
                    setNetworkMenuOpen(false);
                  }}
                />
              </div>
            )}
          </div>

          <SettingsDrawer ipToEur={ipToEur} onIpToEurChange={setIpToEur} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {page === 'chart' ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          {/* Slider-Bereich */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-4 mb-5">
            <Slider
              label="Members / Jahr"
              value={membersPerYear}
              min={0}
              max={6}
              step={0.25}
              onChange={setMembersPerYear}
            />
            <Slider
              label="Shopper / Jahr"
              value={shoppersPerYear}
              min={0}
              max={6}
              step={0.25}
              onChange={setShoppersPerYear}
            />
            <Slider
              label="Umsatz / Monat"
              value={monthlyIP}
              min={45}
              max={500}
              step={5}
              unit=" IP"
              onChange={setMonthlyIP}
            />
            <Slider
              label="Duplikation"
              value={duplication}
              min={0}
              max={100}
              unit="%"
              onChange={setDuplication}
            />
            <Slider
              label="Fluktuation"
              value={attrition}
              min={0}
              max={50}
              unit="%"
              onChange={setAttrition}
            />
          </div>

          {/* Hero-Zahl */}
          <HeroNumber monthlyEUR={finalMonth.totalEUR} year={finalMonth.year} />

          {/* KPI-Karten */}
          <div className="grid grid-cols-2 gap-2.5 mt-4 mb-4">
            <StatCard label="Netzwerk-Größe" value={formattedNetworkSize} />
            <StatCard label="Aktueller Rang" value={finalMonth.rankName} />
          </div>

          {/* Chart */}
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              Provisionsverlauf — 10 Jahre
            </p>
            <ProvisionChart yearEnds={result.yearEnds} />
          </div>

          <YearlySummaryTable years={result.yearSummaries} />
        </div>
        ) : (
          <NetworkVisualizations
            yearEnds={result.yearEnds}
            selectedView={networkView}
          />
        )}

        <p className="text-xs text-gray-500 text-center mt-4 px-4">
          Schätzung auf Basis des LifePlus Business Plans. Keine Garantie für
          tatsächliche Provisionen.
        </p>
      </main>

      <LegalSection />
    </div>
  );
}

function NetworkMenuItem({
  label,
  active,
  icon,
  onClick,
}: {
  label: string;
  active: boolean;
  icon: 'sunburst' | 'columns' | 'tree';
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
        active
          ? 'bg-brand-50 text-brand-800'
          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-950'
      }`}
    >
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
