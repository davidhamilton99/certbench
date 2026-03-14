import type { ReferenceTable } from "../types";

export const cableTypes: ReferenceTable = {
  id: "cable-types",
  title: "Cables & Connectors",
  description: "Cable categories, speeds, distances, and connector types for the CompTIA A+ 220-1101 exam.",
  columnHeaders: [
    { key: "cable", label: "Cable / Standard" },
    { key: "category", label: "Category" },
    { key: "maxSpeed", label: "Max Speed", mono: true },
    { key: "maxDistance", label: "Max Distance", mono: true },
    { key: "connector", label: "Connector(s)" },
  ],
  entries: [
    // Twisted pair copper — Ethernet
    { columns: { cable: "Cat 5e", category: "Twisted pair (copper)", maxSpeed: "1 Gbps", maxDistance: "100 m", connector: "RJ-45" } },
    { columns: { cable: "Cat 6", category: "Twisted pair (copper)", maxSpeed: "10 Gbps", maxDistance: "55 m (10G) / 100 m (1G)", connector: "RJ-45" } },
    { columns: { cable: "Cat 6a", category: "Twisted pair (copper)", maxSpeed: "10 Gbps", maxDistance: "100 m", connector: "RJ-45" } },
    // Fiber optic
    { columns: { cable: "Single-mode fiber (SMF)", category: "Fiber optic", maxSpeed: "100+ Gbps", maxDistance: "40+ km", connector: "LC, SC" } },
    { columns: { cable: "Multimode fiber (MMF)", category: "Fiber optic", maxSpeed: "10 Gbps", maxDistance: "550 m (OM3/OM4)", connector: "LC, SC, ST" } },
    // Coaxial
    { columns: { cable: "Coax RG-6", category: "Coaxial", maxSpeed: "N/A (analog/digital TV)", maxDistance: "~300 m", connector: "F-type" } },
    // USB
    { columns: { cable: "USB 2.0", category: "USB", maxSpeed: "480 Mbps", maxDistance: "5 m", connector: "Type-A, Type-B, Mini, Micro" } },
    { columns: { cable: "USB 3.0 (3.2 Gen 1)", category: "USB", maxSpeed: "5 Gbps", maxDistance: "3 m", connector: "Type-A, Type-B, Micro-B" } },
    { columns: { cable: "USB 3.1 (3.2 Gen 2)", category: "USB", maxSpeed: "10 Gbps", maxDistance: "3 m", connector: "Type-A, Type-C" } },
    { columns: { cable: "USB Type-C", category: "USB", maxSpeed: "Up to 40 Gbps (TB4)", maxDistance: "2 m (passive)", connector: "USB-C (reversible)" } },
    // Thunderbolt
    { columns: { cable: "Thunderbolt 3", category: "Thunderbolt", maxSpeed: "40 Gbps", maxDistance: "0.5 m (passive) / 2 m (active)", connector: "USB-C" } },
    { columns: { cable: "Thunderbolt 4", category: "Thunderbolt", maxSpeed: "40 Gbps", maxDistance: "0.8 m (passive) / 2 m (active)", connector: "USB-C" } },
    // Lightning
    { columns: { cable: "Lightning", category: "Apple proprietary", maxSpeed: "480 Mbps (USB 2.0 speed)", maxDistance: "2 m", connector: "Lightning (8-pin, reversible)" } },
    // Video — HDMI
    { columns: { cable: "HDMI 1.4", category: "Video / Audio", maxSpeed: "10.2 Gbps", maxDistance: "15 m (passive)", connector: "HDMI Type-A/C/D" } },
    { columns: { cable: "HDMI 2.0", category: "Video / Audio", maxSpeed: "18 Gbps", maxDistance: "15 m (passive)", connector: "HDMI Type-A" } },
    { columns: { cable: "HDMI 2.1", category: "Video / Audio", maxSpeed: "48 Gbps", maxDistance: "10 m (passive)", connector: "HDMI Type-A" } },
    // DisplayPort
    { columns: { cable: "DisplayPort 1.2", category: "Video / Audio", maxSpeed: "21.6 Gbps", maxDistance: "3 m (passive)", connector: "DP, Mini-DP" } },
    { columns: { cable: "DisplayPort 1.4", category: "Video / Audio", maxSpeed: "32.4 Gbps", maxDistance: "3 m (passive)", connector: "DP, Mini-DP" } },
    // DVI / VGA
    { columns: { cable: "DVI-D", category: "Video (digital)", maxSpeed: "~9.9 Gbps", maxDistance: "5 m", connector: "DVI-D (digital only)" } },
    { columns: { cable: "DVI-I", category: "Video (digital + analog)", maxSpeed: "~9.9 Gbps", maxDistance: "5 m", connector: "DVI-I (digital + analog pins)" } },
    { columns: { cable: "VGA", category: "Video (analog)", maxSpeed: "N/A (analog signal)", maxDistance: "10 m", connector: "DE-15 (HD15) — 15-pin" } },
    // Storage
    { columns: { cable: "SATA III", category: "Storage", maxSpeed: "6 Gbps", maxDistance: "1 m", connector: "SATA 7-pin data / 15-pin power" } },
    { columns: { cable: "eSATA", category: "Storage (external)", maxSpeed: "6 Gbps", maxDistance: "2 m", connector: "eSATA" } },
    // Legacy serial
    { columns: { cable: "Serial (RS-232)", category: "Serial (legacy)", maxSpeed: "115.2 Kbps", maxDistance: "15 m", connector: "DB-9 (DE-9) — 9-pin" } },
  ],
};
