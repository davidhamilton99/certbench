"use client";

import { chosenPlan, type PlanInterval } from "./return-path";
import { useReturnPath } from "./useReturnPath";

/**
 * The plan in words. No price is printed here: the pricing page shows each
 * visitor the price for their region, and this page cannot know which that was.
 */
const PLAN_CHOSEN: Record<PlanInterval, string> = {
  monthly: "You chose Pro, billed every month.",
  quarterly: "You chose Pro, billed every three months.",
  annual: "You chose Pro, billed every year.",
};

/**
 * The sentence under "Create your account". A visitor who pressed the payment
 * button on the pricing page while signed out is sent here with the chosen
 * plan in the return address, and is told that payment comes next and that
 * the plan has been kept. Everyone else is told that the account is free.
 */
export function RegisterLead() {
  const plan = chosenPlan(useReturnPath());
  if (plan) return <>Create your account to continue to payment. {PLAN_CHOSEN[plan]}</>;
  return <>The account is free. No payment card is required.</>;
}
