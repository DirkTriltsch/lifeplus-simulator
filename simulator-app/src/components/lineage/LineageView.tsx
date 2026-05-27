import { useMemo, useState } from 'react';
import {
  calculateExampleLine,
  type ExampleLineCalculation,
  type ExampleLinePerson,
  type ExampleOrder,
} from '@mlm/product-lifeplus';
import { cloneDefaultTeam, DEFAULT_LINEAGE_TEAM } from './defaultTeam';
import { LineageChain } from './LineageChain';
import { OrderSheet } from './OrderSheet';
import { PersonActionSheet } from './PersonActionSheet';
import { StatusPickerSheet } from './StatusPickerSheet';

const DEFAULT_ORDER_IP = 75;

type SheetMode = 'menu' | 'status' | 'order' | null;

interface PlacedOrder {
  customerId: string;
  order: ExampleOrder;
}

export function LineageView() {
  const [people, setPeople] = useState<ExampleLinePerson[]>(() =>
    cloneDefaultTeam(),
  );
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [showKpis, setShowKpis] = useState(false);

  const customerIndex = useMemo(() => {
    if (!placedOrder) return null;
    return people.findIndex((person) => person.id === placedOrder.customerId);
  }, [placedOrder, people]);

  const isTeamModified = useMemo(() => {
    if (people.length !== DEFAULT_LINEAGE_TEAM.length) return true;
    const defaultIds = new Set(DEFAULT_LINEAGE_TEAM.map((p) => p.id));
    return people.some((p) => !defaultIds.has(p.id));
  }, [people]);

  const calculation: ExampleLineCalculation | null = useMemo(() => {
    if (!placedOrder || customerIndex == null || customerIndex < 0) return null;
    return calculateExampleLine({
      peopleFromCustomerUp: people.slice(customerIndex + 1),
      order: placedOrder.order,
    });
  }, [placedOrder, people, customerIndex]);

  const activePerson =
    activePersonId == null
      ? undefined
      : people.find((person) => person.id === activePersonId);

  const activePersonIsCustomer =
    activePerson != null && placedOrder?.customerId === activePerson.id;

  const handlePersonSelect = (personId: string) => {
    setActivePersonId(personId);
    setSheetMode('menu');
  };

  const handleCloseSheet = () => {
    setActivePersonId(null);
    setSheetMode(null);
  };

  const handleUpdateRank = (rank: string) => {
    if (!activePerson) return;
    const id = activePerson.id;
    setPeople((current) =>
      current.map((person) =>
        person.id === id ? { ...person, rank } : person,
      ),
    );
  };

  const handleSaveOrder = (order: ExampleOrder) => {
    if (!activePerson) return;
    setPlacedOrder({ customerId: activePerson.id, order });
  };

  const handleRemoveOrder = () => {
    setPlacedOrder(null);
    handleCloseSheet();
  };

  const handleRemoveOrderFromHeader = () => {
    setPlacedOrder(null);
  };

  const handleResetTeam = () => {
    setPeople(cloneDefaultTeam());
    setPlacedOrder(null);
  };

  const handleAddPersonAbove = () => {
    if (!activePerson) return;
    const id = activePerson.id;
    const newPerson: ExampleLinePerson = {
      id: `person-${Date.now()}`,
      name: `Person ${people.length + 1}`,
      rank: 'Member',
    };

    setPeople((current) => {
      const activeIndex = current.findIndex((person) => person.id === id);
      if (activeIndex < 0) return [...current, newPerson];
      return [
        ...current.slice(0, activeIndex + 1),
        newPerson,
        ...current.slice(activeIndex + 1),
      ];
    });
    setActivePersonId(newPerson.id);
    setSheetMode('status');
  };

  const handleDeleteActivePerson = () => {
    if (!activePerson || people.length <= 1) return;
    const id = activePerson.id;

    setPeople((current) => current.filter((person) => person.id !== id));
    if (placedOrder?.customerId === id) {
      setPlacedOrder(null);
    }
    handleCloseSheet();
  };

  const orderSummary = placedOrder
    ? formatOrderSummary(placedOrder.order)
    : undefined;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Verguetungsplan
            </p>
            <h1 className="mt-1 text-xl font-semibold text-gray-950">
              Beispielrechnung
            </h1>
          </div>
          <p className="max-w-md text-xs text-gray-500">
            Tippe eine Person an, um deren Status zu setzen oder eine Order auf
            dieser Ebene zu platzieren.
          </p>
          {(placedOrder || isTeamModified) && (
            <div className="flex flex-wrap gap-2 self-start sm:self-center">
              {placedOrder && (
                <button
                  type="button"
                  onClick={handleRemoveOrderFromHeader}
                  className="rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50"
                >
                  Order loeschen
                </button>
              )}
              {isTeamModified && (
                <button
                  type="button"
                  onClick={handleResetTeam}
                  className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-700"
                >
                  Team zuruecksetzen
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <LineageChain
          people={people}
          payouts={calculation?.payouts ?? []}
          customerIndex={customerIndex}
          orderSummary={orderSummary}
          showKpis={showKpis}
          onToggleKpis={setShowKpis}
          onSelectPerson={handlePersonSelect}
        />

        <div className="space-y-4">
          {calculation ? (
            <PhaseSummary
              phase1IP={calculation.phase1IP}
              phase2IP={calculation.phase2IP}
              phase3IP={calculation.phase3IP}
              totalIP={calculation.totalIP}
              orderIP={placedOrder?.order.ip ?? 0}
            />
          ) : (
            <section className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
              Tippe eine Person an und waehle <strong>Order setzen</strong>, um
              die Auszahlung zu sehen.
            </section>
          )}
        </div>
      </div>

      {activePerson && sheetMode === 'menu' && (
        <PersonActionSheet
          person={activePerson}
          isCustomer={!!activePersonIsCustomer}
          onPickStatus={() => setSheetMode('status')}
          onPickOrder={() => setSheetMode('order')}
          onAddPersonAbove={handleAddPersonAbove}
          onDeletePerson={handleDeleteActivePerson}
          onRemoveOrder={handleRemoveOrder}
          onClose={handleCloseSheet}
          canDeletePerson={people.length > 1}
        />
      )}

      {activePerson && sheetMode === 'status' && (
        <StatusPickerSheet
          person={activePerson}
          onChange={handleUpdateRank}
          onClose={handleCloseSheet}
        />
      )}

      {activePerson && sheetMode === 'order' && (
        <OrderSheet
          person={activePerson}
          initialOrder={
            activePersonIsCustomer && placedOrder
              ? placedOrder.order
              : { kind: 'member_order', ip: DEFAULT_ORDER_IP }
          }
          onSave={handleSaveOrder}
          onClose={handleCloseSheet}
        />
      )}
    </div>
  );
}

function PhaseSummary({
  phase1IP,
  phase2IP,
  phase3IP,
  totalIP,
  orderIP,
}: {
  phase1IP: number;
  phase2IP: number;
  phase3IP: number;
  totalIP: number;
  orderIP: number;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wider text-gray-500">
        Ergebnis
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <SummaryTile label="Phase 1" value={phase1IP} />
        <SummaryTile label="Phase 2" value={phase2IP} />
        <SummaryTile label="Phase 3" value={phase3IP} />
        <SummaryTile label="Gesamt" value={totalIP} strong />
      </div>
      <p className="mt-3 text-sm text-gray-600">
        Gesamtanteil: {formatRate(orderIP > 0 ? totalIP / orderIP : 0)}
      </p>
    </section>
  );
}

function SummaryTile({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className={strong ? 'rounded-lg bg-brand-50 p-3' : 'rounded-lg bg-gray-50 p-3'}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={strong ? 'text-lg font-semibold text-brand-800' : 'text-lg font-semibold text-gray-950'}>
        {formatIp(value)}
      </p>
    </div>
  );
}

function formatOrderSummary(order: ExampleOrder): string {
  const kindLabel = order.kind === 'shopper' ? 'Shopper' : 'Member';
  return `${kindLabel} · ${formatIp(order.ip)}`;
}

function formatIp(value: number): string {
  return `${value.toLocaleString('de-DE', {
    maximumFractionDigits: 1,
  })} IP`;
}

function formatRate(rate: number): string {
  return `${(rate * 100).toLocaleString('de-DE', {
    maximumFractionDigits: 1,
  })}%`;
}
