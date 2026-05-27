import type { ExampleLinePerson } from '@mlm/product-lifeplus';

interface PersonActionSheetProps {
  person: ExampleLinePerson;
  isCustomer: boolean;
  onPickStatus: () => void;
  onPickOrder: () => void;
  onAddPersonAbove: () => void;
  onDeletePerson: () => void;
  onRemoveOrder: () => void;
  onClose: () => void;
  canDeletePerson: boolean;
}

export function PersonActionSheet({
  person,
  isCustomer,
  onPickStatus,
  onPickOrder,
  onAddPersonAbove,
  onDeletePerson,
  onRemoveOrder,
  onClose,
  canDeletePerson,
}: PersonActionSheetProps) {
  const handleDeleteClick = () => {
    if (typeof window === 'undefined') {
      onDeletePerson();
      return;
    }
    const confirmed = window.confirm(
      `${person.name} wirklich loeschen?`,
    );
    if (confirmed) onDeletePerson();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/35 px-3 pb-3 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Auswahl schliessen"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Aktion
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

        <div className="grid grid-cols-2 gap-2">
          <StructureButton onClick={onAddPersonAbove}>
            + Person darueber
          </StructureButton>
          <StructureButton
            onClick={handleDeleteClick}
            disabled={!canDeletePerson}
            tone="danger"
          >
            - Person loeschen
          </StructureButton>
        </div>

        <div className="my-3 border-t border-gray-200" />

        <div className="space-y-2">
          <ActionButton onClick={onPickStatus}>Status setzen</ActionButton>
          <ActionButton onClick={onPickOrder}>
            {isCustomer ? 'Order aendern' : 'Order setzen'}
          </ActionButton>
          {isCustomer && (
            <ActionButton onClick={onRemoveOrder} tone="danger">
              Order loeschen
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  tone = 'default',
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  const base =
    'w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition';
  const variant =
    tone === 'danger'
      ? 'border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50'
      : 'border-gray-200 bg-white text-gray-800 hover:border-brand-300 hover:bg-brand-50/40';

  return (
    <button type="button" onClick={onClick} className={`${base} ${variant}`}>
      {children}
    </button>
  );
}

function StructureButton({
  children,
  onClick,
  disabled,
  tone = 'default',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  const base =
    'w-full rounded-md px-3 py-2 text-center text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40';
  const variant =
    tone === 'danger'
      ? 'bg-red-50 text-red-700 hover:bg-red-100'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variant}`}
    >
      {children}
    </button>
  );
}
