'use client';

/** Umschalter fuer 2 bis 3 Optionen (statt Dropdown). */
export default function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<[T, string]>;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap rounded-lg border border-gray-200 bg-gray-50 p-0.5">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1.5 text-sm pointer-coarse:py-2.5 ${value === v ? 'bg-white font-medium shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
