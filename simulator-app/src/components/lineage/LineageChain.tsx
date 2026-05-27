import type { ExampleLinePerson, ExamplePayout } from '@mlm/product-lifeplus';
import { LineagePersonCard } from './LineagePersonCard';

interface LineageChainProps {
  people: ExampleLinePerson[];
  payouts: ExamplePayout[];
  customerIndex: number | null;
  orderSummary?: string;
  showKpis: boolean;
  onToggleKpis: (next: boolean) => void;
  onSelectPerson: (personId: string) => void;
}

export function LineageChain({
  people,
  payouts,
  customerIndex,
  orderSummary,
  showKpis,
  onToggleKpis,
  onSelectPerson,
}: LineageChainProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Teamstruktur
          </p>
          <h2 className="mt-1 text-base font-semibold text-gray-950">
            Auszahlungslinie
          </h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-500 shadow-sm">
          {people.length} Personen
        </span>
      </div>

      <div className="space-y-3">
        {[...people].reverse().map((person) => {
          const peopleIndex = people.findIndex((p) => p.id === person.id);
          const isCustomer = customerIndex === peopleIndex;
          const isBelowCustomer =
            customerIndex !== null && peopleIndex < customerIndex;
          return (
            <LineagePersonCard
              key={person.id}
              person={person}
              payouts={payouts.filter(
                (payout) => payout.personId === person.id,
              )}
              isCustomer={isCustomer}
              isBelowCustomer={isBelowCustomer}
              orderSummary={isCustomer ? orderSummary : undefined}
              showKpis={showKpis}
              onSelect={() => onSelectPerson(person.id)}
            />
          );
        })}
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={showKpis}
          onChange={(event) => onToggleKpis(event.target.checked)}
          className="h-4 w-4 rounded border-gray-300 accent-brand-600"
        />
        KPIs einblenden (GV, AV, QL, SH)
      </label>
    </section>
  );
}
