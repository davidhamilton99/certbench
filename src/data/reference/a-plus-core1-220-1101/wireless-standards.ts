import type { ReferenceTable } from "../types";

export const wirelessStandards: ReferenceTable = {
  id: "wireless-standards",
  title: "Wireless Standards",
  description: "Wi-Fi, Bluetooth, NFC, RFID, and cellular wireless standards for the CompTIA A+ 220-1101 exam.",
  columnHeaders: [
    { key: "standard", label: "Standard", mono: true },
    { key: "name", label: "Name / Brand" },
    { key: "frequency", label: "Frequency" },
    { key: "maxSpeed", label: "Max Speed", mono: true },
    { key: "features", label: "Key Features / Exam Notes" },
  ],
  entries: [
    // Wi-Fi standards
    { columns: { standard: "802.11a", name: "Wi-Fi (legacy)", frequency: "5 GHz", maxSpeed: "54 Mbps", features: "Less interference than 2.4 GHz; shorter range; not compatible with 802.11b/g" } },
    { columns: { standard: "802.11b", name: "Wi-Fi (legacy)", frequency: "2.4 GHz", maxSpeed: "11 Mbps", features: "First widely adopted standard; prone to interference from microwaves, Bluetooth" } },
    { columns: { standard: "802.11g", name: "Wi-Fi (legacy)", frequency: "2.4 GHz", maxSpeed: "54 Mbps", features: "Backward compatible with 802.11b; still found in older devices" } },
    { columns: { standard: "802.11n", name: "Wi-Fi 4", frequency: "2.4 GHz / 5 GHz", maxSpeed: "600 Mbps", features: "First dual-band standard; introduced MIMO (multiple antennas); 40 MHz channels" } },
    { columns: { standard: "802.11ac", name: "Wi-Fi 5", frequency: "5 GHz only", maxSpeed: "3.5 Gbps", features: "MU-MIMO; beamforming; 80/160 MHz channels; Wave 2 = 4×4 MU-MIMO" } },
    { columns: { standard: "802.11ax", name: "Wi-Fi 6 / 6E", frequency: "2.4 / 5 GHz (6E adds 6 GHz)", maxSpeed: "9.6 Gbps", features: "OFDMA; BSS Coloring; target wake time (TWT); better in dense environments" } },
    // Bluetooth
    { columns: { standard: "Bluetooth 4.0", name: "Bluetooth Low Energy (BLE)", frequency: "2.4 GHz ISM", maxSpeed: "1 Mbps", features: "Introduced BLE for IoT, wearables; ~10 m range" } },
    { columns: { standard: "Bluetooth 4.2", name: "Bluetooth LE", frequency: "2.4 GHz ISM", maxSpeed: "1 Mbps", features: "Faster data transfer, privacy improvements over 4.0" } },
    { columns: { standard: "Bluetooth 5.0", name: "Bluetooth 5", frequency: "2.4 GHz ISM", maxSpeed: "2 Mbps", features: "2× speed vs 4.2; 4× range; 8× broadcast capacity; common in modern peripherals" } },
    { columns: { standard: "Bluetooth 5.3", name: "Bluetooth 5.3", frequency: "2.4 GHz ISM", maxSpeed: "2 Mbps", features: "Enhanced energy efficiency; LE audio support; used in current earbuds, keyboards" } },
    // NFC
    { columns: { standard: "NFC", name: "Near Field Communication", frequency: "13.56 MHz", maxSpeed: "424 Kbps", features: "Range ≤4 cm; contactless payments (Apple Pay, tap-to-pay); device pairing" } },
    // RFID
    { columns: { standard: "RFID (LF)", name: "Low Frequency RFID", frequency: "125–134 kHz", maxSpeed: "~1 Kbps", features: "Range ≤10 cm; access cards, livestock tracking; not affected by water/metal as much" } },
    { columns: { standard: "RFID (HF)", name: "High Frequency RFID", frequency: "13.56 MHz", maxSpeed: "~26 Kbps", features: "Range ≤1 m; smart cards, library tags, NFC overlaps this band" } },
    { columns: { standard: "RFID (UHF)", name: "Ultra High Frequency RFID", frequency: "860–960 MHz", maxSpeed: "~140 Kbps", features: "Range up to 12 m; retail inventory, supply chain, asset tracking" } },
    // Cellular
    { columns: { standard: "3G (HSPA+)", name: "3rd Generation", frequency: "700 MHz – 2.1 GHz", maxSpeed: "~42 Mbps", features: "Legacy mobile broadband; being sunset by most carriers" } },
    { columns: { standard: "4G LTE", name: "4th Generation (LTE)", frequency: "700 MHz – 2.6 GHz", maxSpeed: "~150 Mbps (cat 6)", features: "Current baseline mobile standard; LTE-A reaches ~1 Gbps" } },
    { columns: { standard: "5G", name: "5th Generation", frequency: "Sub-6 GHz / mmWave (24–100 GHz)", maxSpeed: "Up to 20 Gbps (mmWave)", features: "Low latency (<1 ms); mmWave = high speed, short range; sub-6 = broader coverage" } },
  ],
};
