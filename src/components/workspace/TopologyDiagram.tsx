"use client";

import { useId } from "react";
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
  ok: "correct as it is",
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

/**
 * The colours of a mark: its fill and what is drawn on it. Each fill is paired
 * with its own foreground token, never a fixed white: the marks are light in
 * the dark theme, and white on them could not be read there.
 */
type MarkTone = "warning" | "destructive" | "success";

function toneOf(mark: DeviceMark): MarkTone {
  if (mark === "fix" || mark === "active" || mark === "partly") return "warning";
  return mark === "wrong" ? "destructive" : "success";
}

const MAP_TONE: Record<MarkTone, { box: string; text: string; line: string }> = {
  warning: { box: "fill-warning", text: "fill-warning-foreground", line: "stroke-warning-foreground" },
  destructive: { box: "fill-destructive", text: "fill-destructive-foreground", line: "stroke-destructive-foreground" },
  success: { box: "fill-success", text: "fill-success-foreground", line: "stroke-success-foreground" },
};

const CHIP_TONE: Record<MarkTone, string> = {
  warning: "bg-warning text-warning-foreground",
  destructive: "bg-destructive text-destructive-foreground",
  success: "bg-success text-success-foreground",
};

/**
 * A device's mark on the map: "!" to fix, a tick or a cross once it is done, a
 * tick if it is correct as it is. A small square with the corner every mark on
 * the site has. It is drawn still: nothing on the map pulses.
 */
function MapBadge({ mark, x, y }: { mark: DeviceMark; x: number; y: number }) {
  const big = mark !== "ok";
  const r = big ? 10 : 8;
  const tone = MAP_TONE[toneOf(mark)];
  return (
    <g transform={`translate(${x + 20}, ${y - 24})`} aria-hidden>
      <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={3} className={tone.box} />
      {mark === "fix" || mark === "active" ? (
        // The attention mark is drawn, not typed: a character here would count as part of the device's visible name.
        <>
          <path d="M 0 -5.5 L 0 1" fill="none" className={tone.line} strokeWidth={2.4} strokeLinecap="round" />
          <circle cx={0} cy={5.2} r={1.5} className={tone.text} />
        </>
      ) : mark === "wrong" ? (
        <path d="M -4 -4 L 4 4 M 4 -4 L -4 4" fill="none" className={tone.line} strokeWidth={2.2} strokeLinecap="round" />
      ) : (
        <path
          d={big ? "M -4.5 0 L -1.5 3 L 4.5 -3" : "M -3.5 0 L -1 2.5 L 3.5 -2"}
          fill="none"
          className={tone.line}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

/** The same mark, as an icon for the device buttons under the map. */
function ChipMark({ mark }: { mark: DeviceMark | undefined }) {
  if (!mark) return <span aria-hidden className="size-2 rounded-xs bg-muted-foreground/40" />;
  return (
    <span aria-hidden className={cn("flex size-4 shrink-0 items-center justify-center rounded-xs", CHIP_TONE[toneOf(mark)])}>
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
 *
 * The links between the devices, with the port or the name drawn on each, are
 * also listed in words under the map. A screen reader cannot follow a line on
 * a drawing, a question can depend on which port leads where, and on a phone
 * the labels on the map are drawn too small to read.
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
  const linksId = useId();
  const posMap = new Map<string, { x: number; y: number }>();
  for (const d of devices) {
    posMap.set(d.id, { x: d.position.x * 10, y: d.position.y * 6 });
  }
  const labelOf = new Map(devices.map((d) => [d.id, d.label] as const));
  const links = connections.filter((c) => labelOf.has(c.from) && labelOf.has(c.to));
  const shownId = viewingId ?? activeId;
  const canOpen = (d: TopoDevice) => d.fields.length > 0 || !!d.currentConfig;
  const toFix = devices.filter((d) => {
    const m = marks[d.id];
    return m === "fix" || m === "active";
  }).length;

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-border px-4 py-2">
        {/* The map's name wraps: cut short, it could not be read on a phone or at a large zoom. */}
        <span className="cb-label min-w-0 text-muted-foreground">{diagramTitle}</span>
        {toFix > 0 && (
          <span className="shrink-0 text-note tabular-nums text-muted-foreground">
            {toFix === 1 ? "1 device needs fixing." : `${toFix} devices need fixing.`}
          </span>
        )}
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
              // A device with nothing to open is a picture with a name, so its name and its mark are still read.
              role={clickable ? "button" : "img"}
              tabIndex={clickable ? 0 : undefined}
              // The name begins with the words drawn under the device, in their order, so a voice command
              // that says what is seen reaches it; where the device stands follows.
              aria-label={`${device.label} ${device.type.replace("-", " ")}${mark ? `, ${MARK_WORDS[mark]}` : ""}`}
              aria-pressed={clickable ? device.id === shownId : undefined}
              onKeyDown={(e) => {
                if (clickable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onDeviceClick(device.id);
                }
              }}
            >
              {isActive && (
                // The device in hand is outlined, and the outline is still.
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={34}
                  fill="none"
                  className="stroke-primary"
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
              {/* A space between the two lines of the name. It is not drawn; it keeps them two words when the
                  device's text is read as one string (by a checker comparing it with the name above). */}{" "}
              <text x={pos.x} y={pos.y + 56} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: "13px" }}>
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
                  // The same frame and press as an answer; a full-size target on a touch screen.
                  "inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 font-medium transition-[border-color,background-color] duration-100 pointer-coarse:min-h-11",
                  !clickable
                    ? // A device with nothing to open: quieter, and still easy to read.
                      "border-border text-muted-foreground"
                    : shown
                      ? "border-primary bg-tint-selected"
                      : "border-input hover:border-primary hover:bg-tint-hover active:bg-tint-press"
                )}
              >
                <ChipMark mark={mark} />
                <span className="text-note">{d.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-note text-muted-foreground">Choose a device to see its configuration.</p>
      </div>

      {links.length > 0 && (
        <div className="grid gap-1 border-t border-border px-4 py-2.5">
          <p id={linksId} className="cb-label text-muted-foreground">
            Connections
          </p>
          {/* Each link as the map draws it: the two devices, then the label on the line. */}
          <ul aria-labelledby={linksId} className="grid gap-0.5 text-note">
            {links.map((c, i) => (
              <li key={i} className="[overflow-wrap:anywhere]">
                {labelOf.get(c.from)} to {labelOf.get(c.to)}
                {c.label && (
                  <>
                    : <span className="font-mono">{c.label}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
