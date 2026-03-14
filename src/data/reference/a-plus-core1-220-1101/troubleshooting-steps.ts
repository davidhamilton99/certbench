import type { ReferenceTable } from "../types";

export const troubleshootingSteps: ReferenceTable = {
  id: "troubleshooting-steps",
  title: "CompTIA Troubleshooting Methodology",
  description: "The official 7-step CompTIA troubleshooting process — tested on both A+ 220-1101 and 220-1102.",
  columnHeaders: [
    { key: "step", label: "Step", mono: true },
    { key: "action", label: "Action" },
    { key: "description", label: "Description" },
    { key: "example", label: "Example" },
  ],
  entries: [
    {
      columns: {
        step: "1",
        action: "Identify the problem",
        description: "Gather information from the user, identify user changes, perform backups if needed, and question the obvious. Review system and application logs.",
        example: "User says 'my computer won't connect to the internet.' Ask: when did it last work? Any recent changes? Is it all sites or just one?",
      },
    },
    {
      columns: {
        step: "2",
        action: "Establish a theory of probable cause",
        description: "Consider multiple possible causes (question the obvious). Use internal/external resources. Start with the simplest, most likely explanation first.",
        example: "Theory: NIC driver corrupted after Windows Update. Alternative: router DHCP lease expired. Check the simple causes first.",
      },
    },
    {
      columns: {
        step: "3",
        action: "Test the theory to determine cause",
        description: "Confirm the theory with a quick test. If confirmed, determine the next steps to resolve. If not confirmed, establish a new theory or escalate.",
        example: "Run ipconfig — if no IP address assigned, theory of DHCP issue is supported. Try ipconfig /release and /renew.",
      },
    },
    {
      columns: {
        step: "4",
        action: "Establish a plan of action",
        description: "Plan how to resolve the problem. Consider potential effects on the system, and refer to vendor instructions or internal knowledgebase.",
        example: "Plan: uninstall and reinstall the NIC driver. Schedule during off-hours to minimise disruption. Document steps.",
      },
    },
    {
      columns: {
        step: "5",
        action: "Implement the solution or escalate",
        description: "Execute the plan. If you cannot resolve it, escalate to the appropriate person or team. Make one change at a time to isolate cause.",
        example: "Reinstall NIC driver from manufacturer's website. Reboot system. Test connectivity after each change.",
      },
    },
    {
      columns: {
        step: "6",
        action: "Verify full system functionality",
        description: "Confirm the problem is resolved and implement preventive measures. Test with the end user to ensure full functionality is restored.",
        example: "User confirms internet is working. Browse multiple sites. Ping external IP (8.8.8.8) and hostname. Enable Windows Update if it was disabled.",
      },
    },
    {
      columns: {
        step: "7",
        action: "Document findings, actions, and outcomes",
        description: "Record what the problem was, what caused it, what steps were taken, and the final resolution. Helps future troubleshooting and builds knowledgebase.",
        example: "Log ticket: 'NIC driver conflict after KB5023696. Resolved by rolling back to driver v22.60.0. No recurrence in 48h.'",
      },
    },
  ],
};
