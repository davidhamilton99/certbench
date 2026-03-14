import type { ReferenceTable } from "../types";

export const routingProtocols: ReferenceTable = {
  id: "routing-protocols",
  title: "Routing Protocols",
  description: "Comparison of dynamic and static routing protocols tested on Network+ N10-009.",
  columnHeaders: [
    { key: "protocol", label: "Protocol", mono: true },
    { key: "type", label: "Type" },
    { key: "algorithm", label: "Algorithm" },
    { key: "metric", label: "Metric" },
    { key: "ad", label: "Admin Dist.", mono: true },
    { key: "features", label: "Key Features / Notes" },
  ],
  entries: [
    { columns: { protocol: "Static Route", type: "Static", algorithm: "None — manually configured", metric: "None", ad: "1", features: "Manually entered by admin; no overhead; no automatic failover; used for stub networks and default routes" } },
    { columns: { protocol: "Default Route", type: "Static", algorithm: "None — catch-all (0.0.0.0/0)", metric: "None", ad: "1", features: "Gateway of last resort; forwards traffic with no specific match; configured as 0.0.0.0/0" } },
    { columns: { protocol: "RIPv2", type: "IGP — Distance Vector", algorithm: "Bellman-Ford", metric: "Hop count (max 15)", ad: "120", features: "Classless (VLSM support); multicast updates (224.0.0.9); 30s update interval; slow convergence; unsuitable for large networks" } },
    { columns: { protocol: "OSPF", type: "IGP — Link State", algorithm: "Dijkstra (SPF)", metric: "Cost (based on bandwidth)", ad: "110", features: "Classless; fast convergence; hierarchical areas (Area 0 backbone); scales well; open standard; uses LSAs and LSDB" } },
    { columns: { protocol: "EIGRP", type: "IGP — Advanced Distance Vector", algorithm: "DUAL (Diffusing Update Algorithm)", metric: "Composite: bandwidth + delay + load + reliability", ad: "90 (internal) / 170 (external)", features: "Cisco proprietary (now partially open); very fast convergence; unequal-cost load balancing; sends partial updates" } },
    { columns: { protocol: "BGP", type: "EGP — Path Vector", algorithm: "Best Path Selection (AS-PATH, attributes)", metric: "Path attributes (AS-PATH, MED, LOCAL_PREF)", ad: "20 (eBGP) / 200 (iBGP)", features: "Internet routing protocol between ASes; policy-based; highly scalable; slow convergence; TCP port 179" } },
    { columns: { protocol: "IS-IS", type: "IGP — Link State", algorithm: "Dijkstra (SPF)", metric: "Cost (default: 10 per link)", ad: "115", features: "Open standard; used by large ISP cores; classless; similar to OSPF but runs directly over L2 (not IP)" } },
  ],
};
