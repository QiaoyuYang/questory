"use client";

type Option<T extends string> = { id: T; label: string };

type Props<T extends string> = {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/** An iOS-style segmented control: a row of buttons with one pressed. */
export function Segmented<T extends string>({ label, options, value, onChange, className = "" }: Props<T>) {
  return (
    <div role="group" aria-label={label} className={`flex rounded-[10px] bg-black/25 p-1 ${className}`}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className={`min-h-9 flex-1 rounded-[7px] px-2 text-[0.9375rem] font-semibold transition-colors ${
              selected ? "bg-seam text-paint shadow-sm" : "text-concrete hover:text-paint"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
