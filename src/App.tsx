import { useMemo, useState } from 'react';
import { Slider } from './components/Slider';
import { HeroNumber } from './components/HeroNumber';
import { StatCard } from './components/StatCard';
import { ProvisionChart } from './components/ProvisionChart';
import { SettingsDrawer } from './components/SettingsDrawer';
import { YearlySummaryTable } from './components/YearlySummaryTable';
import { runSimulation } from './engine/simulation';

export default function App() {
  // Default-Werte gemäß Spezifikation
  const [membersPerYear, setMembersPerYear] = useState(2);
  const [shoppersPerYear, setShoppersPerYear] = useState(3);
  const [monthlyIP, setMonthlyIP] = useState(200);
  const [duplication, setDuplication] = useState(100); // %
  const [attrition, setAttrition] = useState(0); // %
  const [ipToEur, setIpToEur] = useState(1);

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
        <SettingsDrawer ipToEur={ipToEur} onIpToEurChange={setIpToEur} />
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          {/* Slider-Bereich */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-4 mb-5">
            <Slider
              label="Members / Jahr"
              value={membersPerYear}
              min={0}
              max={10}
              onChange={setMembersPerYear}
            />
            <Slider
              label="Shopper / Jahr"
              value={shoppersPerYear}
              min={0}
              max={20}
              onChange={setShoppersPerYear}
            />
            <Slider
              label="Umsatz / Monat"
              value={monthlyIP}
              min={40}
              max={500}
              step={10}
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

        <p className="text-xs text-gray-500 text-center mt-4 px-4">
          Schätzung auf Basis des LifePlus Business Plans. Keine Garantie für
          tatsächliche Provisionen.
        </p>
      </main>
    </div>
  );
}
