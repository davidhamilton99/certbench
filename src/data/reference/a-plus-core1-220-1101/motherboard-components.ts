import type { ReferenceTable } from "../types";

export const motherboardComponents: ReferenceTable = {
  id: "motherboard-components",
  title: "Motherboard & Form Factors",
  description: "Motherboard form factors, CPU sockets, expansion slots, and key components for the CompTIA A+ 220-1101 exam.",
  columnHeaders: [
    { key: "component", label: "Component" },
    { key: "description", label: "Description" },
    { key: "formFactor", label: "Form Factor / Standard" },
    { key: "notes", label: "Exam Notes" },
  ],
  entries: [
    // Form factors
    { columns: { component: "ATX", description: "Full-size motherboard — most desktop systems", formFactor: "305 × 244 mm", notes: "9 mounting holes; supports most full-size cases" } },
    { columns: { component: "Micro-ATX (mATX)", description: "Smaller desktop form factor, fewer expansion slots", formFactor: "244 × 244 mm", notes: "Fits ATX and mATX cases; up to 4 PCIe slots" } },
    { columns: { component: "Mini-ITX", description: "Very compact form factor for HTPCs and small builds", formFactor: "170 × 170 mm", notes: "Typically 1 PCIe x16 slot; low power; fits most cases" } },
    // CPU sockets
    { columns: { component: "LGA 1700", description: "Intel socket — 12th/13th/14th gen (Alder/Raptor Lake)", formFactor: "LGA (Land Grid Array)", notes: "Pins on motherboard; 1700 contact pads on CPU" } },
    { columns: { component: "LGA 1200", description: "Intel socket — 10th/11th gen (Comet/Rocket Lake)", formFactor: "LGA (Land Grid Array)", notes: "Not cross-compatible with LGA 1700" } },
    { columns: { component: "AM4", description: "AMD socket — Ryzen 1000–5000 series", formFactor: "PGA (Pin Grid Array)", notes: "Pins on CPU; long socket lifecycle (2017–2022)" } },
    { columns: { component: "AM5", description: "AMD socket — Ryzen 7000 series and beyond", formFactor: "LGA (Land Grid Array)", notes: "AMD shifted to LGA with AM5; DDR5 only" } },
    // RAM slots
    { columns: { component: "DIMM", description: "Dual Inline Memory Module — desktop RAM", formFactor: "288-pin (DDR4/5), 240-pin (DDR3)", notes: "Two notches split; DDR4 and DDR5 not interchangeable" } },
    { columns: { component: "SO-DIMM", description: "Small Outline DIMM — laptop/compact RAM", formFactor: "260-pin (DDR4/5), 204-pin (DDR3)", notes: "Approx. half the physical length of full DIMM" } },
    // Expansion slots
    { columns: { component: "PCIe x16", description: "Primary GPU slot — 16 lanes of PCIe bandwidth", formFactor: "PCIe (Gen 3/4/5)", notes: "Longest slot; retention clip locks card in place" } },
    { columns: { component: "PCIe x4", description: "Mid-size slot — NVMe adapters, controllers", formFactor: "PCIe (Gen 3/4)", notes: "Physically shorter than x16; may be open-ended" } },
    { columns: { component: "PCIe x1", description: "Small slot — sound cards, NICs, riser cards", formFactor: "PCIe (Gen 3/4)", notes: "Shortest PCIe slot; lowest bandwidth" } },
    // Storage interfaces on board
    { columns: { component: "M.2 slot", description: "Compact slot for NVMe SSDs and SATA SSDs", formFactor: "M.2 (2242/2260/2280/22110)", notes: "Key M = NVMe; Key B+M = SATA or NVMe; check keying" } },
    { columns: { component: "SATA ports", description: "On-board SATA III connectors for drives and optical", formFactor: "SATA III (6 Gbps)", notes: "Typically 4–8 ports; L-shaped 7-pin connector" } },
    // Power connectors
    { columns: { component: "24-pin ATX power", description: "Main motherboard power connector from PSU", formFactor: "ATX power standard", notes: "20+4 pin config; keyed so it only fits one way" } },
    { columns: { component: "8-pin CPU power (EPS12V)", description: "Dedicated +12V power for CPU VRM", formFactor: "ATX 12V v2.x", notes: "Also ships as 4+4 pin; required for modern CPUs" } },
    { columns: { component: "6/8-pin PCIe power", description: "Supplemental power for discrete GPUs", formFactor: "PCIe power standard", notes: "6-pin = 75W; 8-pin = 150W; high-end GPUs may need 2+" } },
    // Front panel & headers
    { columns: { component: "Front panel connectors", description: "Power SW, Reset SW, HDD LED, Power LED pins", formFactor: "Varies by case", notes: "Tiny 1–2 pin headers; refer to motherboard manual for layout" } },
    { columns: { component: "USB headers", description: "Internal USB 2.0 (9-pin) and USB 3.0 (19-pin) headers", formFactor: "Internal header", notes: "USB 3.2 Gen 1 uses 20-pin internal A-key connector" } },
    // Firmware
    { columns: { component: "BIOS/UEFI", description: "Firmware interface for hardware initialisation and boot config", formFactor: "ROM/Flash chip on board", notes: "UEFI replaces legacy BIOS; supports GPT, Secure Boot, GUI" } },
    { columns: { component: "CMOS battery", description: "CR2032 coin cell — powers RTC and BIOS settings", formFactor: "CR2032 (3V lithium)", notes: "Removing resets BIOS settings and system clock" } },
  ],
};
