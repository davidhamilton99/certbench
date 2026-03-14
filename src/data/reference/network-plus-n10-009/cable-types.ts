import type { ReferenceTable } from "../types";

export const cableTypes: ReferenceTable = {
  id: "cable-types",
  title: "Cable Types",
  description: "Copper, fibre, and coaxial cabling specifications and wiring standards for Network+ N10-009.",
  columnHeaders: [
    { key: "cable", label: "Cable", mono: true },
    { key: "category", label: "Category / Type" },
    { key: "maxSpeed", label: "Max Speed", mono: true },
    { key: "maxDistance", label: "Max Distance", mono: true },
    { key: "connector", label: "Connector" },
    { key: "use", label: "Typical Use / Notes" },
  ],
  entries: [
    { columns: { cable: "Cat 5e", category: "UTP / STP copper", maxSpeed: "1 Gbps", maxDistance: "100 m", connector: "RJ-45", use: "Gigabit Ethernet; enhanced Cat 5 with reduced crosstalk; most common legacy install" } },
    { columns: { cable: "Cat 6", category: "UTP / STP copper", maxSpeed: "10 Gbps", maxDistance: "55 m (10G) / 100 m (1G)", connector: "RJ-45", use: "10GBase-T at shorter runs; thicker with internal spline separator to reduce crosstalk" } },
    { columns: { cable: "Cat 6a", category: "UTP / STP copper", maxSpeed: "10 Gbps", maxDistance: "100 m", connector: "RJ-45", use: "10GBase-T at full 100 m; augmented Cat 6; heavier and less flexible than Cat 6" } },
    { columns: { cable: "Cat 7", category: "SSTP / SFTP copper", maxSpeed: "10 Gbps", maxDistance: "100 m", connector: "GG45 / TERA / RJ-45", use: "Individually shielded pairs plus overall shield; not officially TIA/EIA recognised" } },
    { columns: { cable: "Cat 8", category: "SFTP copper", maxSpeed: "40 Gbps", maxDistance: "30 m", connector: "RJ-45", use: "Data centre top-of-rack switch connections; very short high-bandwidth runs" } },
    { columns: { cable: "Single-mode fiber", category: "Optical fibre (SMF)", maxSpeed: "100+ Gbps", maxDistance: "40–80 km+", connector: "LC, SC, ST, MTP/MPO", use: "Long-haul WAN and campus backbone; 9 µm core; laser light source; yellow jacket" } },
    { columns: { cable: "Multimode fiber", category: "Optical fibre (MMF)", maxSpeed: "100 Gbps", maxDistance: "500 m (OM4) / 400 m (OM3)", connector: "LC, SC, ST, MTP/MPO", use: "Short-range data centre and campus runs; 50/62.5 µm core; LED/VCSEL; orange/aqua jacket" } },
    { columns: { cable: "Coaxial RG-6", category: "Coaxial copper", maxSpeed: "~1 Gbps (DOCSIS 3.1)", maxDistance: "~300 m", connector: "F-type", use: "Cable TV (CATV) and broadband internet; thicker dielectric than RG-59" } },
    { columns: { cable: "Coaxial RG-59", category: "Coaxial copper", maxSpeed: "~350 MHz bandwidth", maxDistance: "~230 m", connector: "F-type / BNC", use: "Analogue CCTV and composite video; thinner than RG-6; higher signal loss at high frequency" } },
    { columns: { cable: "Direct Attach Copper", category: "Twinaxial copper (DAC)", maxSpeed: "10–100 Gbps", maxDistance: "7–15 m", connector: "SFP+ / QSFP", use: "Ultra-low latency data centre rack connections; cheaper than optical transceiver + fiber" } },
    { columns: { cable: "T568A wiring", category: "RJ-45 pin-out standard", maxSpeed: "N/A", maxDistance: "N/A", connector: "RJ-45", use: "Pairs: G-W/G, O-W/O, Bl-W/Bl, Br-W/Br; preferred by TIA/EIA for residential; used in crossover cables (one end T568A, one T568B)" } },
    { columns: { cable: "T568B wiring", category: "RJ-45 pin-out standard", maxSpeed: "N/A", maxDistance: "N/A", connector: "RJ-45", use: "Pairs: O-W/O, G-W/G, Bl-W/Bl, Br-W/Br; most common in commercial installations; straight-through cables use T568B on both ends" } },
  ],
};
