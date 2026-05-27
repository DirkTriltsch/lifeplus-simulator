import { useState } from 'react';
import type {
  ExampleLinePerson,
  ExampleOrder,
} from '@mlm/product-lifeplus';

interface OrderSheetProps {
  person: ExampleLinePerson;
  initialOrder: ExampleOrder;
  onSave: (order: ExampleOrder) => void;
  onClose: () => void;
}

export function OrderSheet({
  person,
  initialOrder,
  onSave,
  onClose,
}: OrderSheetProps) {
  const [kind, setKind] = useState<ExampleOrder['kind']>(initialOrder.kind);
  const [ipText, setIpText] = useState(String(initialOrder.ip));
  const ipValue = Math.max(0, Number(ipText) || 0);
  const isMember = kind === 'member_order';

  const handleSave = () => {
    onSave({ kind, ip: ipValue });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/35 px-3 pb-3 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Order schliessen"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Order setzen
            </p>
            <h2 className="mt-1 text-lg font-semibold text-gray-950">
              {person.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Schliessen"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="m6 6 12 12" />
              <path d="m18 6-12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs uppercase tracking-wider text-gray-500">
          Bestellung als
        </p>
        <div className="mt-2 grid grid-cols-2 rounded-lg bg-gray-100 p-1 text-sm">
          <button
            type="button"
            onClick={() => setKind('member_order')}
            className={`rounded-md px-3 py-2 transition ${
              isMember ? 'bg-white text-brand-800 shadow-sm' : 'text-gray-600'
            }`}
          >
            Member
          </button>
          <button
            type="button"
            onClick={() => setKind('shopper')}
            className={`rounded-md px-3 py-2 transition ${
              !isMember ? 'bg-white text-brand-800 shadow-sm' : 'text-gray-600'
            }`}
          >
            Shopper
          </button>
        </div>

        <p className="mt-4 text-xs uppercase tracking-wider text-gray-500">
          IP
        </p>
        <div className="mt-2 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={9999}
            step={5}
            value={ipText}
            onChange={(event) => setIpText(event.target.value)}
            onFocus={(event) => event.target.select()}
            className="w-full bg-transparent text-right text-base font-medium text-gray-900 outline-none"
            aria-label="IP Betrag"
          />
          <span className="text-sm text-gray-500">IP</span>
        </div>

        {isMember && ipValue > 150 && (
          <p className="mt-3 text-xs text-gray-500">
            Split: 150 IP Referral, {ipValue - 150} IP Shop-Discount.
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={ipValue <= 0}
          className="mt-5 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Order speichern
        </button>
      </div>
    </div>
  );
}
