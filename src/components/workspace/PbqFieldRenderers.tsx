"use client";

/**
 * Shared field renderers used by both SimulationPlayer and DeviceConfigPanel.
 * Dropdown, TextInput, and SelectMany are identical across PBQ types.
 */

/* ------------------------------------------------------------------ */
/*  Dropdown                                                           */
/* ------------------------------------------------------------------ */

export function DropdownFieldRenderer({
  field,
  value,
  onChange,
}: {
  field: { id: string; label: string; options: string[] };
  value: number;
  onChange: (idx: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-text-primary">
        {field.label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full bg-bg-page border border-border rounded-md px-3 py-2 text-[14px] text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      >
        <option value={-1}>— Select —</option>
        {field.options.map((opt, i) => (
          <option key={i} value={i}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Text Input                                                         */
/* ------------------------------------------------------------------ */

export function TextInputFieldRenderer({
  field,
  value,
  onChange,
}: {
  field: { id: string; label: string; placeholder?: string };
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-text-primary">
        {field.label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || "Type your answer..."}
        className="w-full px-3 py-2 text-[14px] text-text-primary bg-bg-surface border border-border rounded-md placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Select Many (Checkboxes)                                           */
/* ------------------------------------------------------------------ */

export function SelectManyFieldRenderer({
  field,
  selectedIndices,
  onChange,
}: {
  field: { id: string; label: string; options: string[] };
  selectedIndices: number[];
  onChange: (indices: number[]) => void;
}) {
  const toggle = (idx: number) => {
    if (selectedIndices.includes(idx)) {
      onChange(selectedIndices.filter((i) => i !== idx));
    } else {
      onChange([...selectedIndices, idx]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-medium text-text-primary">
        {field.label}
      </label>
      <div className="flex flex-col gap-1.5">
        {field.options.map((opt, i) => {
          const isSelected = selectedIndices.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              className={`
                w-full text-left px-3 py-2.5 rounded-md text-[13px]
                border transition-colors duration-150
                ${
                  isSelected
                    ? "bg-info-bg border-primary/40 text-primary font-medium"
                    : "bg-bg-page border-border text-text-secondary hover:border-primary/30 hover:text-text-primary"
                }
              `}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`
                    w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                    ${isSelected ? "bg-primary border-primary" : "border-border"}
                  `}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  )}
                </span>
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
