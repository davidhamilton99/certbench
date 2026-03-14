import type { ReferenceTable } from "../types";

export const storageTypes: ReferenceTable = {
  id: "storage-types",
  title: "Storage Devices",
  description: "Storage technologies, interfaces, speeds, and use cases for the CompTIA A+ 220-1101 exam.",
  columnHeaders: [
    { key: "type", label: "Storage Type" },
    { key: "interface", label: "Interface", mono: true },
    { key: "formFactor", label: "Form Factor" },
    { key: "maxSpeed", label: "Max Speed", mono: true },
    { key: "capacity", label: "Typical Capacity" },
    { key: "useCase", label: "Use Case" },
  ],
  entries: [
    // HDDs
    { columns: { type: "HDD (3.5\")", interface: "SATA III", formFactor: "3.5\" (desktop)", maxSpeed: "~200 MB/s", capacity: "1 TB – 20 TB", useCase: "Desktop PCs, NAS, bulk storage" } },
    { columns: { type: "HDD (2.5\")", interface: "SATA III", formFactor: "2.5\" (laptop)", maxSpeed: "~150 MB/s", capacity: "500 GB – 5 TB", useCase: "Laptops, portable drives, PS4/Xbox" } },
    // SATA SSD
    { columns: { type: "SSD (SATA)", interface: "SATA III", formFactor: "2.5\" or M.2 (B+M key)", maxSpeed: "~550 MB/s", capacity: "120 GB – 4 TB", useCase: "OS drives, laptop upgrades, general use" } },
    // NVMe
    { columns: { type: "SSD (NVMe M.2)", interface: "PCIe 3.0 ×4 / 4.0 ×4", formFactor: "M.2 2280 (M key)", maxSpeed: "3,500 MB/s (Gen3) / 7,000 MB/s (Gen4)", capacity: "250 GB – 4 TB", useCase: "High-performance OS and application drives" } },
    { columns: { type: "SSD (NVMe PCIe add-in)", interface: "PCIe ×4 slot", formFactor: "PCIe card (AIC)", maxSpeed: "7,000+ MB/s", capacity: "1 TB – 8 TB", useCase: "Workstations, servers without M.2 slot" } },
    // eMMC
    { columns: { type: "eMMC", interface: "eMMC (soldered)", formFactor: "Soldered chip (BGA)", maxSpeed: "~400 MB/s", capacity: "32 GB – 256 GB", useCase: "Budget laptops, Chromebooks, tablets" } },
    // Optical
    { columns: { type: "CD-ROM / CD-RW", interface: "SATA / USB (external)", formFactor: "5.25\" bay / external", maxSpeed: "52× (~7.8 MB/s)", capacity: "700 MB", useCase: "Legacy software, audio CDs" } },
    { columns: { type: "DVD-ROM / DVD-RW", interface: "SATA / USB (external)", formFactor: "5.25\" bay / external", maxSpeed: "16× (~22 MB/s)", capacity: "4.7 GB (SL) / 8.5 GB (DL)", useCase: "Software installs, video playback" } },
    { columns: { type: "Blu-ray (BD-ROM / BD-R)", interface: "SATA / USB (external)", formFactor: "5.25\" bay / external", maxSpeed: "16× (~72 MB/s)", capacity: "25 GB (SL) / 50 GB (DL)", useCase: "HD video, large data archival" } },
    // Removable
    { columns: { type: "USB Flash Drive", interface: "USB 2.0 / 3.0", formFactor: "USB thumb drive", maxSpeed: "Up to 400 MB/s (USB 3.0)", capacity: "4 GB – 2 TB", useCase: "File transport, OS installation media" } },
    { columns: { type: "SD Card", interface: "SD / SDXC / SDUC", formFactor: "SD (full-size)", maxSpeed: "Up to 985 MB/s (UHS-II)", capacity: "2 GB – 2 TB", useCase: "Cameras, laptops, single-board computers" } },
    { columns: { type: "microSD Card", interface: "microSD / microSDXC", formFactor: "microSD", maxSpeed: "Up to 985 MB/s (UHS-II)", capacity: "2 GB – 1 TB", useCase: "Smartphones, tablets, dashcams, action cams" } },
    // RAID
    { columns: { type: "RAID 0 (Striping)", interface: "Any (HW or SW RAID)", formFactor: "2+ drives", maxSpeed: "N× single drive", capacity: "N× smallest drive", useCase: "Maximum speed; no redundancy — data loss risk" } },
    { columns: { type: "RAID 1 (Mirroring)", interface: "Any (HW or SW RAID)", formFactor: "2 drives", maxSpeed: "Read boost; write = single drive", capacity: "= smallest drive", useCase: "Redundancy; survives 1 drive failure" } },
    { columns: { type: "RAID 5 (Striping + parity)", interface: "Any (HW or SW RAID)", formFactor: "3+ drives", maxSpeed: "Good read; moderate write", capacity: "(N-1)× smallest drive", useCase: "Balance of speed, capacity, and redundancy" } },
    { columns: { type: "RAID 10 (1+0)", interface: "Any (HW or SW RAID)", formFactor: "4+ drives", maxSpeed: "High read and write", capacity: "50% of total drives", useCase: "High performance + redundancy; most expensive" } },
  ],
};
