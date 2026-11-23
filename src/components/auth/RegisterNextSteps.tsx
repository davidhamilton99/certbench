"use client";

import { chosenPlan } from "./return-path";
import { useReturnPath } from "./useReturnPath";

export interface NextStep {
  title: string;
  body: string;
}

/**
 * What happens after the account is made, in the order it happens. It is
 * shown beside the form on a wide screen only, so the form stays first on a
 * phone.
 *
 * A visitor who pressed the payment button on the pricing page arrives with
 * the chosen plan in the return address. For them the next thing is payment,
 * so the list says that, and the sentence about needing no payment card is
 * not shown beside a form that leads to one. Both lists are written by the
 * page on the server and handed in, so this component carries no copy tables.
 */
export function RegisterNextSteps({ free, paying }: { free: NextStep[]; paying: NextStep[] }) {
  const plan = chosenPlan(useReturnPath());
  const steps = plan ? paying : free;
  return (
    <section aria-labelledby="register-next" className="hidden lg:col-start-1 lg:row-start-1 lg:block">
      <h2 id="register-next" className="cb-subsection">
        A study path for your CompTIA exam
      </h2>
      <p className="mt-3 text-body text-muted-foreground">
        {plan
          ? "This is what happens next."
          : "An account is free, and you do not need a payment card. This is what happens next."}
      </p>
      <ol className="mt-8 grid gap-0 border-t border-foreground/80">
        {steps.map(({ title, body }, i) => (
          <li key={title} className="flex gap-4 border-b border-border py-4">
            <span
              aria-hidden
              className="flex size-6 shrink-0 items-center justify-center rounded-xs border border-foreground/40 text-note font-medium"
            >
              {i + 1}
            </span>
            <div>
              <h3 className="font-semibold leading-snug">{title}</h3>
              <p className="mt-0.5 text-small text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
