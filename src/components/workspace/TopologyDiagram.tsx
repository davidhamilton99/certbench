"use client";

import type { TopoDevice, TopoConnection, TopoDeviceType } from "@/data/pbq/types";

/* ------------------------------------------------------------------ */
/*  Device Icons (SVG)                                                 */
/* ------------------------------------------------------------------ */

function RouterIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 20}, ${y - 20})`}>
      <circle cx={20} cy={20} r={18} fill="#f8f8f9" stroke="#1a1a1f" strokeWidth={2} />
      {/* Cross arrows */}
      <line x1={8} y1={20} x2={32} y2={20} stroke="#1a1a1f" strokeWidth={1.5} />
      <line x1={20} y1={8} x2={20} y2={32} stroke="#1a1a1f" strokeWidth={1.5} />
      <polygon points="30,20 26,17 26,23" fill="#1a1a1f" />
      <polygon points="10,20 14,17 14,23" fill="#1a1a1f" />
      <polygon points="20,10 17,14 23,14" fill="#1a1a1f" />
      <polygon points="20,30 17,26 23,26" fill="#1a1a1f" />
    </g>
  );
}

function SwitchIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 22}, ${y - 14})`}>
      <rect x={0} y={0} width={44} height={28} rx={3} fill="#f8f8f9" stroke="#1a1a1f" strokeWidth={2} />
      {/* Arrows inside */}
      <line x1={10} y1={10} x2={22} y2={10} stroke="#1a1a1f" strokeWidth={1.5} />
      <polygon points="20,10 16,7 16,13" fill="#1a1a1f" />
      <line x1={34} y1={18} x2={22} y2={18} stroke="#1a1a1f" strokeWidth={1.5} />
      <polygon points="24,18 28,15 28,21" fill="#1a1a1f" />
    </g>
  );
}

function FirewallIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 18}, ${y - 20})`}>
      <rect x={0} y={0} width={36} height={40} rx={3} fill="#f8f8f9" stroke="#1a1a1f" strokeWidth={2} />
      {/* Brick pattern */}
      <line x1={0} y1={10} x2={36} y2={10} stroke="#1a1a1f" strokeWidth={1} />
      <line x1={0} y1={20} x2={36} y2={20} stroke="#1a1a1f" strokeWidth={1} />
      <line x1={0} y1={30} x2={36} y2={30} stroke="#1a1a1f" strokeWidth={1} />
      <line x1={18} y1={0} x2={18} y2={10} stroke="#1a1a1f" strokeWidth={1} />
      <line x1={9} y1={10} x2={9} y2={20} stroke="#1a1a1f" strokeWidth={1} />
      <line x1={27} y1={10} x2={27} y2={20} stroke="#1a1a1f" strokeWidth={1} />
      <line x1={18} y1={20} x2={18} y2={30} stroke="#1a1a1f" strokeWidth={1} />
      <line x1={9} y1={30} x2={9} y2={40} stroke="#1a1a1f" strokeWidth={1} />
      <line x1={27} y1={30} x2={27} y2={40} stroke="#1a1a1f" strokeWidth={1} />
    </g>
  );
}

function ServerIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 16}, ${y - 22})`}>
      <rect x={0} y={0} width={32} height={44} rx={3} fill="#f8f8f9" stroke="#1a1a1f" strokeWidth={2} />
      {/* Drive bays */}
      <line x1={4} y1={11} x2={28} y2={11} stroke="#1a1a1f" strokeWidth={1} />
      <line x1={4} y1={22} x2={28} y2={22} stroke="#1a1a1f" strokeWidth={1} />
      <line x1={4} y1={33} x2={28} y2={33} stroke="#1a1a1f" strokeWidth={1} />
      {/* LEDs */}
      <circle cx={8} cy={6} r={2} fill="#16a34a" />
      <circle cx={8} cy={17} r={2} fill="#16a34a" />
      <circle cx={8} cy={28} r={2} fill="#16a34a" />
    </g>
  );
}

function PcIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 16}, ${y - 18})`}>
      {/* Monitor */}
      <rect x={2} y={0} width={28} height={22} rx={2} fill="#f8f8f9" stroke="#1a1a1f" strokeWidth={2} />
      {/* Screen */}
      <rect x={5} y={3} width={22} height={14} rx={1} fill="#e2e2e6" />
      {/* Stand */}
      <line x1={16} y1={22} x2={16} y2={30} stroke="#1a1a1f" strokeWidth={2} />
      <line x1={8} y1={30} x2={24} y2={30} stroke="#1a1a1f" strokeWidth={2} />
    </g>
  );
}

function AccessPointIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 16}, ${y - 18})`}>
      {/* Body */}
      <ellipse cx={16} cy={22} rx={14} ry={8} fill="#f8f8f9" stroke="#1a1a1f" strokeWidth={2} />
      {/* Antenna */}
      <line x1={16} y1={14} x2={16} y2={4} stroke="#1a1a1f" strokeWidth={2} />
      <circle cx={16} cy={3} r={2} fill="#1a1a1f" />
      {/* Signal waves */}
      <path d="M 8 8 A 10 10 0 0 1 24 8" fill="none" stroke="#1a1a1f" strokeWidth={1.5} />
      <path d="M 11 11 A 6 6 0 0 1 21 11" fill="none" stroke="#1a1a1f" strokeWidth={1.5} />
    </g>
  );
}

function CloudIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 28}, ${y - 16})`}>
      <path
        d="M 14 30 A 10 10 0 0 1 8 16 A 12 12 0 0 1 28 8 A 10 10 0 0 1 48 16 A 8 8 0 0 1 42 30 Z"
        fill="#f8f8f9"
        stroke="#1a1a1f"
        strokeWidth={2}
      />
    </g>
  );
}

function DeviceIcon({ type, x, y }: { type: TopoDeviceType; x: number; y: number }) {
  switch (type) {
    case "router":
      return <RouterIcon x={x} y={y} />;
    case "switch":
      return <SwitchIcon x={x} y={y} />;
    case "firewall":
      return <FirewallIcon x={x} y={y} />;
    case "server":
      return <ServerIcon x={x} y={y} />;
    case "pc":
      return <PcIcon x={x} y={y} />;
    case "access-point":
      return <AccessPointIcon x={x} y={y} />;
    case "cloud":
      return <CloudIcon x={x} y={y} />;
  }
}

/* ------------------------------------------------------------------ */
/*  Main TopologyDiagram                                               */
/* ------------------------------------------------------------------ */

interface TopologyDiagramProps {
  devices: TopoDevice[];
  connections: TopoConnection[];
  diagramTitle: string;
  selectedDeviceId: string | null;
  touchedDeviceIds: Set<string>;
  onDeviceClick: (deviceId: string) => void;
}

export function TopologyDiagram({
  devices,
  connections,
  diagramTitle,
  selectedDeviceId,
  touchedDeviceIds,
  onDeviceClick,
}: TopologyDiagramProps) {
  // Build position lookup
  const posMap = new Map<string, { x: number; y: number }>();
  for (const d of devices) {
    posMap.set(d.id, { x: d.position.x * 10, y: d.position.y * 6 });
  }

  return (
    <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
      {/* Diagram title */}
      <div className="px-4 py-2 border-b border-border-light">
        <span className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">
          {diagramTitle}
        </span>
      </div>

      <svg
        viewBox="0 0 1000 600"
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        style={{ maxHeight: "460px" }}
      >
        {/* Connection lines */}
        {connections.map((conn, i) => {
          const from = posMap.get(conn.from);
          const to = posMap.get(conn.to);
          if (!from || !to) return null;

          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;

          return (
            <g key={i}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#b0b0b8"
                strokeWidth={2}
                strokeDasharray="none"
              />
              {conn.label && (
                <>
                  <rect
                    x={midX - conn.label.length * 3.5 - 4}
                    y={midY - 8}
                    width={conn.label.length * 7 + 8}
                    height={16}
                    rx={3}
                    fill="white"
                    stroke="#e2e2e6"
                    strokeWidth={1}
                  />
                  <text
                    x={midX}
                    y={midY + 4}
                    textAnchor="middle"
                    className="text-[10px] fill-[#8a8a95]"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px" }}
                  >
                    {conn.label}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Devices */}
        {devices.map((device) => {
          const pos = posMap.get(device.id);
          if (!pos) return null;

          const isSelected = device.id === selectedDeviceId;
          const isTouched = touchedDeviceIds.has(device.id);
          const hasFields = device.fields.length > 0;

          return (
            <g
              key={device.id}
              onClick={() => hasFields && onDeviceClick(device.id)}
              className={hasFields ? "cursor-pointer" : "cursor-default"}
              role={hasFields ? "button" : undefined}
              tabIndex={hasFields ? 0 : undefined}
              onKeyDown={(e) => {
                if (hasFields && (e.key === "Enter" || e.key === " ")) {
                  onDeviceClick(device.id);
                }
              }}
            >
              {/* Selection ring */}
              {isSelected && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={32}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth={3}
                  strokeDasharray="6 3"
                  className="animate-pulse"
                />
              )}

              {/* Hover highlight (for clickable devices) */}
              {hasFields && !isSelected && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={30}
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth={2}
                  className="hover:stroke-[#2563eb]/30 transition-all"
                />
              )}

              {/* Device icon */}
              <DeviceIcon type={device.type} x={pos.x} y={pos.y} />

              {/* Touched indicator (small blue dot) */}
              {isTouched && !isSelected && (
                <circle
                  cx={pos.x + 20}
                  cy={pos.y - 18}
                  r={4}
                  fill="#2563eb"
                />
              )}

              {/* Pre-configured checkmark */}
              {device.preConfigured && !isTouched && (
                <g transform={`translate(${pos.x + 16}, ${pos.y - 22})`}>
                  <circle cx={0} cy={0} r={7} fill="#16a34a" />
                  <path
                    d="M -3 0 L -1 2 L 3 -2"
                    fill="none"
                    stroke="white"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              )}

              {/* Label */}
              <text
                x={pos.x}
                y={pos.y + 34}
                textAnchor="middle"
                className={`text-[12px] font-medium ${
                  isSelected ? "fill-[#2563eb]" : "fill-[#1a1a1f]"
                }`}
                style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: "12px" }}
              >
                {device.label}
              </text>

              {/* Device type subtitle */}
              <text
                x={pos.x}
                y={pos.y + 47}
                textAnchor="middle"
                className="fill-[#8a8a95]"
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px" }}
              >
                {device.type.replace("-", " ")}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-border-light flex items-center gap-4 text-[11px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
          Pre-configured (leave alone)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
          Modified
        </span>
        <span className="text-text-muted">Click a device to configure it</span>
      </div>
    </div>
  );
}
