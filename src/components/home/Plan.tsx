import { Check } from "lucide-react";

/**
 * One plan in the home page's summary of prices: its name, its price, a
 * sentence about the price, and what the plan includes. The full terms are on
 * the pricing page; the figures come from src/lib/pricing/terms.ts.
 */
export function Plan({
  name,
  price,
  note,
  lead,
  items,
}: {
  name: string;
  price: string;
  note: string;
  /** The sentence the list completes. */
  lead: string;
  items: string[];
}) {
  return (
    <div className="glass grid content-start gap-4 rounded-lg p-5 sm:p-6">
      <h3 className="text-body font-semibold">{name}</h3>
      <div className="grid gap-1.5">
        <p className="cb-display text-5xl">{price}</p>
        <p className="text-small text-muted-foreground">{note}</p>
      </div>
      <div className="grid gap-3 border-t border-border pt-4">
        <p className="text-small font-medium">{lead}</p>
        <ul className="grid gap-2.5 text-small">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <Check className="mt-1 size-4 shrink-0 text-primary" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
