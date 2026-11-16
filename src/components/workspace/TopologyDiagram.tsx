"use client";

import { AlertTriangle, Check, X } from "lucide-react";
import type { TopoDevice, TopoConnection, TopoDeviceType } from "@/data/pbq/types";
import { cn } from "@/lib/utils";

/**
 * Where each device stands in a topology lab: one to fix, the one being
 * fixed, fixed (right, partly or wrong), or one that checks out as it is.
 */
export type DeviceMark = "fix" | "active" | "right" | "partly" | "wrong" | "ok";

const MARK_WORDS: Record<DeviceMark, string> = {
  fix: "needs fixing",
  active: "being fixed",
  right: "fixed",
  partly: "partly fixed",
  wrong: "not fixed",
  ok: "checks out",
};

/* ------------------------------------------------------------------ */
/*  Device icons, in the theme's colours                               */
/* ------------------------------------------------------------------ */

// Every shape takes its colour from the theme, so the map reads in dark mode
// (the default) as well as light: a near-black label on a dark card vanished.
const BODY = "fill-card stroke-foreground";
const INK = "stroke-foreground";
const SOLID = "fill-foreground";

function RouterIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 20}, ${y - 20})`}>
      <circle cx={20} cy={20} r={18} className={BODY} strokeWidth={2} />
      <line x1={8} y1={20} x2={32} y2={20} className={INK} strokeWidth={1.5} />
      <line x1={20} y1={8} x2={20} y2={32} className={INK} strokeWidth={1.5} />
      <polygon points="30,20 26,17 26,23" className={SOLID} />
      <polygon points="10,20 14,17 14,23" className={SOLID} />
      <polygon points="20,10 17,14 23,14" className={SOLID} />
      <polygon points="20,30 17,26 23,26" className={SOLID} />
    </g>
  );
}

function SwitchIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 22}, ${y - 14})`}>
      <rect x={0} y={0} width={44} height={28} rx={3} className={BODY} strokeWidth={2} />
      <line x1={10} y1={10} x2={22} y2={10} className={INK} strokeWidth={1.5} />
      <polygon points="20,10 16,7 16,13" className={SOLID} />
      <line x1={34} y1={18} x2={22} y2={18} className={INK} strokeWidth={1.5} />
      <polygon points="24,18 28,15 28,21" className={SOLID} />
    </g>
  );
}

function FirewallIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 18}, ${y - 20})`}>
      <rect x={0} y={0} width={36} height={40} rx={3} className={BODY} strokeWidth={2} />
      {[10, 20, 30].map((ly) => (
        <line key={ly} x1={0} y1={ly} x2={36} y2={ly} className={INK} strokeWidth={1} />
      ))}
      <line x1={18} y1={0} x2={18} y2={10} className={INK} strokeWidth={1} />
      <line x1={9} y1={10} x2={9} y2={20} className={INK} strokeWidth={1} />
      <line x1={27} y1={10} x2={27} y2={20} className={INK} strokeWidth={1} />
      <line x1={18} y1={20} x2={18} y2={30} className={INK} strokeWidth={1} />
      <line x1={9} y1={30} x2={9} y2={40} className={INK} strokeWidth={1} />
      <line x1={27} y1={30} x2={27} y2={40} className={INK} strokeWidth={1} />
    </g>
  );
}

function ServerIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 16}, ${y - 22})`}>
      <rect x={0} y={0} width={32} height={44} rx={3} className={BODY} strokeWidth={2} />
      {[11, 22, 33].map((ly) => (
        <line key={ly} x1={4} y1={ly} x2={28} y2={ly} className={INK} strokeWidth={1} />
      ))}
      {[6, 17, 28].map((cy) => (
        <circle key={cy} cx={8} cy={cy} r={2} className="fill-success" />
      ))}
    </g>
  );
}

function PcIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 16}, ${y - 18})`}>
      <rect x={2} y={0} width={28} height={22} rx={2} className={BODY} strokeWidth={2} />
      <rect x={5} y={3} width={22} height={14} rx={1} className="fill-muted" />
      <line x1={16} y1={22} x2={16} y2={30} className={INK} strokeWidth={2} />
      <line x1={8} y1={30} x2={24} y2={30} className={INK} strokeWidth={2} />
    </g>
  );
}

function AccessPointIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 16}, ${y - 18})`}>
      <ellipse cx={16} cy={22} rx={14} ry={8} className={BODY} strokeWidth={2} />
      <line x1={16} y1={14} x2={16} y2={4} className={INK} strokeWidth={2} />
      <circle cx={16} cy={3} r={2} className={SOLID} />
      <path d="M 8 8 A 10 10 0 0 1 24 8" fill="none" className={INK} strokeWidth={1.5} />
      <path d="M 11 11 A 6 6 0 0 1 21 11" fill="none" className={INK} strokeWidth={1.5} />
    </g>
  );
}

function CloudIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 28}, ${y - 16})`}>
      <path
        d="M 14 30 A 10 10 0 0 1 8 16 A 12 12 0 0 1 28 8 A 10 10 0 0 1 48 16 A 8 8 0 0 1 42 30 Z"
        className={BODY}
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

/** A device's badge on the map: "!" to fix, a tick or a cross once it's done, a tick if it checks out. */
function MapBadge({ mark, x, y }: { mark: DeviceMark; x: number; y: number }) {
  const big = mark !== "ok";
  const r = big ? 10 : 8;
  const fill =
    mark === "fix" || mark === "active" || mark === "partly"
      ? "fill-amber-500"
      : mark === "wrong"
        ? "fill-destructive"
        : "fill-success";
  return (
    <g transform={`translate(${x + 20}, ${y - 24})`} aria-hidden>
      <circle cx={0} cy={0} r={r} className={cn(fill, (mark === "fix" || mark === "active") && "animate-pulse")} />
      {mark === "fix" || mark === "active" ? (
        <text x={0} y={5} textAnchor="middle" className="fill-white font-bold" style={{ fontSize: "15px" }}>
          !
        </text>
      ) : mark === "wrong" ? (
        <path d="M -4 -4 L 4 4 M 4 -4 L -4 4" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" />
      ) : (
        <path
          d={big ? "M -4.5 0 L -1.5 3 L 4.5 -3" : "M -3.5 0 L -1 2.5 L 3.5 -2"}
          fill="none"
          stroke="white"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

/** The same mark, as an icon for the device chips under the map. */
function ChipMark({ mark }: { mark: DeviceMark | undefined }) {
  if (!mark) return <span aria-hidden className="size-2 rounded-full bg-muted-foreground/40" />;
  const tone =
    mark === "fix" || mark === "active" || mark === "partly"
      ? "bg-amber-500"
      : mark === "wrong"
        ? "bg-destructive"
        : "bg-success";
  return (
    <span aria-hidden className={cn("flex size-4 items-center justify-center rounded-full text-white", tone)}>
      {mark === "fix" || mark === "active" ? (
        <AlertTriangle className="size-2.5" strokeWidth={3} />
      ) : mark === "wrong" ? (
        <X className="size-2.5" strokeWidth={3.5} />
      ) : (
        <Check className="size-2.5" strokeWidth={3.5} />
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  The map                                                            */
/* ------------------------------------------------------------------ */

interface TopologyDiagramProps {
  devices: TopoDevice[];
  connections: TopoConnection[];
  diagramTitle: string;
  marks: Readonly<Record<string, DeviceMark | undefined>>;
  /** The device being fixed. */
  activeId: string | null;
  /** The device whose config is showing, when it isn't the one being fixed. */
  viewingId: string | null;
  onDeviceClick: (deviceId: string) => void;
}

/**
 * A topology lab's network as a map: devices to fix carry a "!", fixed ones a
 * tick or a cross, and the one being fixed a ring. Tapping a device (on the
 * map, or its chip underneath, which is the easier target on a phone) shows
 * its config.
 */
export function TopologyDiagram({
  devices,
  connections,
  diagramTitle,
  marks,
  activeId,
  viewingId,
  onDeviceClick,
}: TopologyDiagramProps) {
  const posMap = new Map<string, { x: number; y: number }>();
  for (const d of devices) {
    posMap.set(d.id, { x: d.position.x * 10, y: d.position.y * 6 });
  }
  const shownId = viewingId ?? activeId;
  const canOpen = (d: TopoDevice) => d.fields.length > 0 || !!d.currentConfig;
  const toFix = devices.filter((d) => {
    const m = marks[d.id];
    return m === "fix" || m === "active";
  }).length;

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <span className="min-w-0 truncate font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {diagramTitle}
        </span>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-amber-700 dark:text-amber-300">
          {toFix > 0 ? `${toFix} to fix` : ""}
        </span>
      </div>

      <svg viewBox="0 0 1000 600" className="h-auto w-full" preserveAspectRatio="xMidYMid meet" style={{ maxHeight: "460px" }}>
        {connections.map((conn, i) => {
          const from = posMap.get(conn.from);
          const to = posMap.get(conn.to);
          if (!from || !to) return null;
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className="stroke-muted-foreground/40"
              strokeWidth={2}
            />
          );
        })}

        {devices.map((device) => {
          const pos = posMap.get(device.id);
          if (!pos) return null;
          const mark = marks[device.id];
          const isActive = device.id === activeId;
          const isViewing = device.id === viewingId;
          const clickable = canOpen(device);
          return (
            <g
              key={device.id}
              onClick={() => clickable && onDeviceClick(device.id)}
              className={clickable ? "cursor-pointer" : "cursor-default"}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-label={`${device.label} (${device.type.replace("-", " ")})${mark ? `, ${MARK_WORDS[mark]}` : ""}`}
              aria-pressed={clickable ? device.id === shownId : undefined}
              onKeyDown={(e) => {
                if (clickable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onDeviceClick(device.id);
                }
              }}
            >
              {isActive && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={34}
                  fill="none"
                  className="animate-pulse stroke-primary"
                  strokeWidth={3}
                  strokeDasharray="6 3"
                />
              )}
              {isViewing && !isActive && (
                <circle cx={pos.x} cy={pos.y} r={34} fill="none" className="stroke-muted-foreground/70" strokeWidth={2} />
              )}
              {clickable && !isActive && !isViewing && (
                <circle cx={pos.x} cy={pos.y} r={32} className="fill-transparent stroke-transparent transition-colors hover:stroke-primary/40" strokeWidth={2} />
              )}
              <DeviceIcon type={device.type} x={pos.x} y={pos.y} />
              {mark && <MapBadge mark={mark} x={pos.x} y={pos.y} />}
              <text
                x={pos.x}
                y={pos.y + 38}
                textAnchor="middle"
                className={cn("font-semibold", isActive ? "fill-primary" : "fill-foreground")}
                style={{ fontSize: "17px" }}
              >
                {device.label}
              </text>
              <text
                x={pos.x}
                y={pos.y + 56}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "13px" }}
              >
                {device.type.replace("-", " ")}
              </text>
            </g>
          );
        })}

        {/* Link labels last, so a label's box sits on top of any device text it meets. */}
        {connections.map((conn, i) => {
          const from = posMap.get(conn.from);
          const to = posMap.get(conn.to);
          if (!from || !to || !conn.label) return null;
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          return (
            <g key={`label-${i}`} aria-hidden className="pointer-events-none">
              <rect
                x={midX - conn.label.length * 5 - 8}
                y={midY - 13}
                width={conn.label.length * 10 + 16}
                height={26}
                rx={4}
                className="fill-card stroke-border"
                strokeWidth={1}
              />
              <text
                x={midX}
                y={midY + 5}
                textAnchor="middle"
                className="fill-foreground font-semibold"
                style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "15px" }}
              >
                {conn.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="grid gap-2 border-t border-border px-3 py-2.5">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Devices">
          {devices.map((d) => {
            const mark = marks[d.id];
            const clickable = canOpen(d);
            const shown = d.id === shownId;
            return (
              <button
                key={d.id}
                type="button"
                disabled={!clickable}
                aria-pressed={shown}
                aria-label={`${d.label}${mark ? `, ${MARK_WORDS[mark]}` : ""}`}
                onClick={() => onDeviceClick(d.id)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
                  shown
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  !clickable && "opacity-50"
                )}
              >
                <ChipMark mark={mark} />
                {d.label}
              </button>
            );
          })}
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Tap a device to see its config</p>
      </div>
    </div>
  );
}
