import type { ReferenceTable } from "../types";

export const wirelessStandards: ReferenceTable = {
  id: "wireless-standards",
  title: "Wireless Standards",
  description: "IEEE 802.11 Wi-Fi generations and short-range wireless technologies tested on Network+ N10-009.",
  columnHeaders: [
    { key: "standard", label: "Standard", mono: true },
    { key: "name", label: "Name / Gen" },
    { key: "frequency", label: "Frequency" },
    { key: "maxSpeed", label: "Max Speed", mono: true },
    { key: "range", label: "Typical Range" },
    { key: "features", label: "Key Features / Notes" },
  ],
  entries: [
    { columns: { standard: "802.11a", name: "Wi-Fi 1 (legacy)", frequency: "5 GHz", maxSpeed: "54 Mbps", range: "~35 m indoor", features: "OFDM; less interference than 2.4 GHz but shorter range; not compatible with b/g" } },
    { columns: { standard: "802.11b", name: "Wi-Fi 2 (legacy)", frequency: "2.4 GHz", maxSpeed: "11 Mbps", range: "~35 m indoor", features: "DSSS modulation; prone to interference from microwaves and Bluetooth" } },
    { columns: { standard: "802.11g", name: "Wi-Fi 3 (legacy)", frequency: "2.4 GHz", maxSpeed: "54 Mbps", range: "~38 m indoor", features: "OFDM; backward compatible with 802.11b; still susceptible to 2.4 GHz congestion" } },
    { columns: { standard: "802.11n", name: "Wi-Fi 4", frequency: "2.4 GHz / 5 GHz", maxSpeed: "600 Mbps", range: "~70 m indoor", features: "MIMO (up to 4x4); channel bonding (40 MHz); dual-band; beamforming" } },
    { columns: { standard: "802.11ac", name: "Wi-Fi 5", frequency: "5 GHz", maxSpeed: "3.5 Gbps", range: "~35 m indoor", features: "MU-MIMO (downlink); 80/160 MHz channels; up to 8 spatial streams; beamforming" } },
    { columns: { standard: "802.11ax", name: "Wi-Fi 6 / 6E", frequency: "2.4 / 5 / 6 GHz (6E adds 6 GHz)", maxSpeed: "9.6 Gbps", range: "~30 m indoor", features: "OFDMA; MU-MIMO (up/downlink); BSS Colouring; TWT (battery savings); 6E = 6 GHz band" } },
    { columns: { standard: "Bluetooth", name: "Bluetooth 4/5", frequency: "2.4 GHz (ISM)", maxSpeed: "50 Mbps (BT 5)", range: "~10–100 m", features: "Short-range PAN; BLE for IoT sensors; frequency hopping (FHSS) to reduce interference" } },
    { columns: { standard: "NFC", name: "Near Field Communication", frequency: "13.56 MHz", maxSpeed: "424 Kbps", range: "~4 cm", features: "Contactless payments and access cards; no pairing required; passive/active modes" } },
    { columns: { standard: "Zigbee", name: "IEEE 802.15.4", frequency: "2.4 GHz (primary)", maxSpeed: "250 Kbps", range: "~10–100 m mesh", features: "Low-power mesh for IoT/home automation; self-healing mesh topology" } },
    { columns: { standard: "Z-Wave", name: "Z-Wave (Sub-GHz)", frequency: "908 MHz (US)", maxSpeed: "100 Kbps", range: "~30 m (100 m mesh)", features: "Low-interference IoT mesh; sub-GHz avoids 2.4 GHz congestion; max 232 devices" } },
  ],
};
