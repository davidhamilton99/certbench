import type { OrderingScenario } from "../types";

/**
 * SY0-801's Incident Response Process lab. SY0-701's version
 * (incident-response-steps) orders NIST's phase names; SY0-801 names its own
 * activities, and two of them, negotiation and notification, aren't steps
 * every incident passes through in a fixed place. So the drill orders the six
 * that run in sequence, in the order SY0-801 lists them, and the explanation
 * says where the other two fit instead of asserting an order CompTIA doesn't
 * give.
 *
 * Not registered anywhere yet: the switch-over PR adds SY0-801's labs to the
 * registry, with this one in domain 4.0.
 */
export const incidentResponseProcess: OrderingScenario = {
  type: "ordering",
  id: "incident-response-process",
  title: "Incident Response Process",
  description: "Put the incident response activities in order, from before an incident to after it.",
  domain_number: "4.0",
  domain_title: "Security Operations",
  items: [
    "Preparation",
    "Identification",
    "Investigation",
    "Containment",
    "Eradication and recovery",
    "Post-incident activities",
  ],
  correct_order: [0, 1, 2, 3, 4, 5],
  explanation:
    "Preparation comes first: training, playbooks, tabletop exercises and clear roles are in place before anything happens. Identification spots and confirms the incident, through detection, internal or external advisories, or threat hunting. Investigation works out what happened, preserving evidence under chain of custody, and carries on alongside the steps after it. Containment isolates the affected systems so the damage stops spreading. Eradication and recovery remove the attacker's foothold and bring systems back to normal. Post-incident activities close the loop: lessons learned, root cause analysis and a post-incident report that feeds back into preparation. SY0-801 lists two more activities that don't sit at one fixed step. Negotiation comes between containment and eradication in its list, but only some incidents, such as ransomware or extortion, involve it, and it needs legal advice first. Notification and external reporting follow their own clock: customers, regulators or law enforcement may have to be told while the response is still under way, because laws set deadlines. GDPR, for example, gives 72 hours from becoming aware of a personal data breach to notify the supervisory authority.",
};
