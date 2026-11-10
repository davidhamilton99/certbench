import type { NewQuestion } from "./types";

/** 4.0 Virtualization and Cloud Computing: what 220-1201 added to 4.1 and 4.2. */
export const questions: NewQuestion[] = [
  {
    key: "c1-4.1-containers-1",
    objective: "4.1",
    topic: "containers",
    difficulty: 1,
    question: "Which statement BEST describes a container?",
    options: [
      "A full virtual computer that runs its own guest OS",
      "A physical server dedicated to running a single app",
      "An isolated app package sharing the host's kernel",
      "A desktop streamed to users from the data center",
    ],
    answer: 2,
    explanation:
      "A container bundles an application with the libraries and settings it needs and runs it isolated from other containers, but all containers on a host share the host operating system's kernel, so they're small and start in seconds. A virtual machine runs its own complete guest OS, a dedicated physical server isn't virtualized at all, and a desktop streamed from a data center is virtual desktop infrastructure (VDI).",
  },
  {
    key: "c1-4.1-containers-2",
    objective: "4.1",
    topic: "containers",
    difficulty: 2,
    question:
      "A developer wants an application, with exactly the same library versions, to run identically on a laptop, a test server and a cloud host, start in seconds, and not need a separate guest OS for each copy. Which technology fits BEST?",
    options: [
      "Type 1 hypervisor virtual machines",
      "Containers",
      "Virtual desktop infrastructure",
      "A dual-boot installation",
    ],
    answer: 1,
    explanation:
      "A container image packages the application with its exact dependencies, so it runs the same anywhere a container engine is installed, and containers start in seconds because they share the host's kernel instead of booting their own OS. Virtual machines each need a full guest OS, VDI delivers whole desktops to users, and dual booting only chooses which OS starts.",
  },
  {
    key: "c1-4.1-containers-3",
    objective: "4.1",
    topic: "containers",
    difficulty: 3,
    question:
      "A technician tries to run a Windows container on a Linux server's container engine, and it won't start. Linux containers on the same server run fine. Why?",
    options: [
      "Containers can only run on public cloud servers",
      "The server needs a Type 2 hypervisor first",
      "The Linux server's TPM must be cleared to run it",
      "It uses the host's kernel, and this host runs Linux",
    ],
    answer: 3,
    explanation:
      "Containers don't carry their own kernel; they use the host's, so a Windows container needs a Windows host and a Linux container needs a Linux kernel. (Docker Desktop runs Linux containers on Windows by running a lightweight Linux VM behind the scenes.) Containers run on laptops and on-premises servers as well as in the cloud, a Type 2 hypervisor isn't what runs containers, and the TPM has nothing to do with it.",
  },
  {
    key: "c1-4.1-hypervisor-1",
    objective: "4.1",
    topic: "hypervisor types (Type 1, Type 2)",
    difficulty: 2,
    question:
      "After installing VMware ESXi on a new server, a technician sees only a basic console screen showing the host's IP address, with no desktop. How are virtual machines typically created and managed on this Type 1 hypervisor?",
    options: [
      "From a web browser or management console on another computer",
      "From a desktop OS installed on top of ESXi first",
      "By installing VirtualBox on the server to create them",
      "Only from the server's console, using a keyboard and mouse",
    ],
    answer: 0,
    explanation:
      "A Type 1 hypervisor like ESXi runs directly on the hardware with no general-purpose desktop; its console mainly shows the host's address and basic settings, and VMs are created and managed remotely, through a web browser or a management console. Installing a desktop OS on top would defeat the point of a bare-metal hypervisor, VirtualBox is a Type 2 hypervisor that needs a host OS, and the local console can't build VMs.",
  },
  {
    key: "c1-4.1-hypervisor-2",
    objective: "4.1",
    topic: "hypervisor types (Type 1, Type 2)",
    difficulty: 3,
    question:
      "A technician installs a Type 1 hypervisor on an older desktop to build a test lab, but the installer stops with 'no network adapters found,' even though the onboard network card works in Windows. What is the MOST likely reason?",
    options: [
      "Type 1 hypervisors can't use network adapters",
      "The hypervisor has no driver for that network card",
      "The network card must be disabled in UEFI first",
      "Windows must stay installed to supply the driver",
    ],
    answer: 1,
    explanation:
      "A Type 1 hypervisor runs directly on the hardware, so it has to bring its own drivers, and many support only the hardware on their vendor's compatibility list; a consumer network chip that works in Windows may have no driver in the hypervisor. Check the compatibility list or add a supported network card. Type 1 hypervisors certainly use network adapters, disabling the card hides it completely, and it's Type 2 hypervisors that rely on a host OS and its drivers.",
  },
  {
    key: "c1-4.1-hypervisor-3",
    objective: "4.1",
    topic: "hypervisor types (Type 1, Type 2)",
    difficulty: 2,
    question:
      "Whenever the operating system on a developer's laptop crashes, all of the virtual machines running on the laptop stop too. What explains this?",
    options: [
      "The VMs all share a single guest OS kernel",
      "The VM files are stored on a separate drive",
      "A Type 2 hypervisor depends on the host OS",
      "A Type 1 hypervisor has no host OS to depend on",
    ],
    answer: 2,
    explanation:
      "A Type 2 hypervisor runs as an application on the host operating system, so when that OS crashes, the hypervisor and every VM it runs stop with it. A Type 1 hypervisor doesn't depend on a general-purpose host OS, so it doesn't explain what happened; each VM has its own guest kernel rather than a shared one; and where the VM files are stored doesn't make the VMs stop.",
  },
  {
    key: "c1-4.2-egress-1",
    objective: "4.2",
    topic: "ingress/egress metering",
    difficulty: 2,
    question:
      "A company's cloud bill jumped after customers began downloading large training videos that the company stores with its public cloud provider. The amount of data stored hasn't changed. Which charge MOST likely grew?",
    options: [
      "Ingress charges for data uploaded into the cloud",
      "Charges for running on a dedicated host",
      "Multitenancy fees for sharing hardware",
      "Egress charges for data leaving the cloud",
    ],
    answer: 3,
    explanation:
      "Cloud providers meter data transfer, and data leaving the cloud for the internet (egress) is usually billed per gigabyte, so more downloads mean a bigger bill even though storage hasn't grown. Data coming in (ingress) is typically free, nothing in the scenario adds a dedicated host, and providers don't bill a separate fee for multitenancy.",
  },
  {
    key: "c1-4.2-egress-2",
    objective: "4.2",
    topic: "ingress/egress metering",
    difficulty: 2,
    question:
      "A company keeps its backups in a public cloud provider's storage service. Every night it uploads 200 GB, and twice a month it downloads about 50 GB to the office to test restores. Under typical public cloud pricing, which transfers add data transfer charges to the bill?",
    options: [
      "Only the restore downloads to the office",
      "Only the nightly uploads",
      "Both, at the same rate per gigabyte",
      "Neither, because cloud data transfer is always free",
    ],
    answer: 0,
    explanation:
      "Providers meter traffic in both directions but typically bill for egress, data leaving the cloud, while ingress, data coming in, is free. So the restore downloads add transfer charges and the nightly uploads don't. The two directions aren't usually priced the same, and egress is far from free.",
  },
  {
    key: "c1-4.2-multitenancy-1",
    objective: "4.2",
    topic: "multitenancy",
    difficulty: 2,
    question:
      "A company's Microsoft 365 admin center refers to the organization's 'tenant.' Which cloud characteristic does this term reflect?",
    options: ["Elasticity", "Dedicated resources", "Multitenancy", "File synchronization"],
    answer: 2,
    explanation:
      "In a multitenant service, one provider's infrastructure and software serve many customers, called tenants, and each tenant's users, data and settings are kept logically separate from every other tenant's. Elasticity is scaling with demand, dedicated resources would mean hardware used by one customer only, and file synchronization keeps copies of files the same across devices.",
  },
  {
    key: "c1-4.2-dedicated-1",
    objective: "4.2",
    topic: "shared vs. dedicated resources",
    difficulty: 2,
    question:
      "A company's compliance rules and a per-server software license require that its cloud VMs never run on the same physical servers as other customers' VMs. What should the company request from the provider?",
    options: [
      "Shared resources in a public cloud",
      "Dedicated resources, such as a dedicated host",
      "Elasticity, so the VMs can scale with demand",
      "Metered utilization with limits on egress traffic",
    ],
    answer: 1,
    explanation:
      "Dedicated resources set physical hardware, such as a dedicated host, aside for one customer, which satisfies rules against sharing servers with other customers and suits licenses counted per physical server. Shared resources put many customers on the same hardware, which is exactly what the rules forbid, and elasticity and metered utilization describe scaling and billing, not isolation.",
  },
  {
    key: "c1-4.2-dedicated-2",
    objective: "4.2",
    topic: "shared vs. dedicated resources",
    difficulty: 2,
    question:
      "Which is a typical trade-off of choosing dedicated resources instead of shared resources in a public cloud?",
    options: [
      "Lower cost, since no one else shares the hardware",
      "No ability to run virtual machines on it",
      "No way to encrypt the data stored on it",
      "Higher cost for hardware no other customer uses",
    ],
    answer: 3,
    explanation:
      "Shared resources spread the cost of hardware across many customers, which makes them cheaper; dedicated resources reserve hardware for one customer, which costs more but gives physical isolation. Dedicated hosts still run virtual machines, and encryption is available either way.",
  },
];
