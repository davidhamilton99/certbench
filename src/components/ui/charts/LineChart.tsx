"use client";

import { useRef, useState, useEffect } from "react";
import { pickXTicks } from "./chart-utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DataPoint {
  x: number;
  y: number;
}

export interface Series {
  id: string;
  label: string;
  data: DataPoint[];
  color: string;
}

interface Threshold {
  value: number;
  color: string;
  label?: string;
}

interface LineChartProps {
  series: Series[];
  height?: number;
  yDomain?: [number, number];
  thresholds?: Threshold[];
  xFormatter?: (value: number) => string;
  yFormatter?: (value: number) => string;
  showLegend?: boolean;
  showDots?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAD = { top: 12, right: 16, bottom: 32, left: 48 };
const Y_TICKS = [0, 25, 50, 75, 100];
const MAX_X_TICKS = 6;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LineChart({
  series,
  height = 240,
  yDomain = [0, 100],
  thresholds = [],
  xFormatter = (v) => String(v),
  yFormatter = (v) => String(v),
  showLegend = false,
  showDots = true,
}: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [tooltip, setTooltip] = useState<{
    px: number;
    py: number;
    text: string;
    sub: string;
    color: string;
  } | null>(null);

  /* Responsive width via ResizeObserver */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(Math.floor(entry.contentRect.width));
      }
    });
    ro.observe(el);
    setWidth(el.clientWidth);

    return () => ro.disconnect();
  }, []);

  /* Don't render until we know the width */
  if (width === 0) {
    return <div ref={containerRef} style={{ height }} />;
  }

  /* Chart area */
  const cw = width - PAD.left - PAD.right;
  const ch = height - PAD.top - PAD.bottom;

  /* X domain */
  const allX = series.flatMap((s) => s.data.map((d) => d.x));
  if (allX.length === 0) {
    return (
      <div ref={containerRef} className="w-full">
        <p className="text-[13px] text-text-muted py-8 text-center">
          No data to display.
        </p>
      </div>
    );
  }

  const xMin = Math.min(...allX);
  const xMax = Math.max(...allX);
  const xSpan = xMax - xMin || 1; // avoid division by zero for single point

  /* Scale helpers */
  const sx = (v: number) => PAD.left + ((v - xMin) / xSpan) * cw;
  const sy = (v: number) =>
    PAD.top + ch - ((v - yDomain[0]) / (yDomain[1] - yDomain[0])) * ch;

  /* Ticks */
  const yTicks = Y_TICKS.filter((t) => t >= yDomain[0] && t <= yDomain[1]);
  const xTicks = pickXTicks(allX, MAX_X_TICKS);

  /* Polyline path builder */
  const path = (data: DataPoint[]) =>
    data
      .map((d, i) => `${i === 0 ? "M" : "L"}${sx(d.x).toFixed(1)},${sy(d.y).toFixed(1)}`)
      .join(" ");

  return (
    <div ref={containerRef} className="w-full">
      <svg
        width={width}
        height={height}
        className="select-none"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Horizontal grid lines */}
        {yTicks.map((t) => (
          <line
            key={`g-${t}`}
            x1={PAD.left}
            y1={sy(t)}
            x2={width - PAD.right}
            y2={sy(t)}
            stroke="var(--color-border-light)"
            strokeWidth={1}
          />
        ))}

        {/* Threshold lines */}
        {thresholds.map((th, i) => (
          <g key={`th-${i}`}>
            <line
              x1={PAD.left}
              y1={sy(th.value)}
              x2={width - PAD.right}
              y2={sy(th.value)}
              stroke={th.color}
              strokeWidth={1}
              strokeDasharray="6 4"
              opacity={0.5}
            />
            {th.label && (
              <text
                x={width - PAD.right - 4}
                y={sy(th.value) - 5}
                textAnchor="end"
                fill={th.color}
                fontSize={10}
                fontFamily="var(--font-mono)"
                opacity={0.65}
              >
                {th.label}
              </text>
            )}
          </g>
        ))}

        {/* Y-axis labels */}
        {yTicks.map((t) => (
          <text
            key={`yl-${t}`}
            x={PAD.left - 8}
            y={sy(t) + 4}
            textAnchor="end"
            fill="var(--color-text-muted)"
            fontSize={11}
            fontFamily="var(--font-mono)"
          >
            {yFormatter(t)}
          </text>
        ))}

        {/* X-axis labels */}
        {xTicks.map((t) => (
          <text
            key={`xl-${t}`}
            x={sx(t)}
            y={height - 6}
            textAnchor="middle"
            fill="var(--color-text-muted)"
            fontSize={11}
            fontFamily="var(--font-mono)"
          >
            {xFormatter(t)}
          </text>
        ))}

        {/* Data lines + dots */}
        {series.map((s) => {
          if (s.data.length === 0) return null;
          return (
            <g key={s.id}>
              {/* Line */}
              {s.data.length > 1 && (
                <path
                  d={path(s.data)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Dots */}
              {showDots &&
                s.data.map((d, i) => (
                  <circle
                    key={`${s.id}-d${i}`}
                    cx={sx(d.x)}
                    cy={sy(d.y)}
                    r={s.data.length === 1 ? 5 : 3.5}
                    fill={s.color}
                    stroke="white"
                    strokeWidth={1.5}
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setTooltip({
                        px: sx(d.x),
                        py: sy(d.y),
                        text: yFormatter(d.y),
                        sub: xFormatter(d.x),
                        color: s.color,
                      })
                    }
                  />
                ))}
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={Math.max(PAD.left, Math.min(tooltip.px - 50, width - PAD.right - 100))}
              y={tooltip.py - 38}
              width={100}
              height={26}
              rx={4}
              fill="var(--color-text-primary)"
              opacity={0.92}
            />
            <text
              x={Math.max(PAD.left + 50, Math.min(tooltip.px, width - PAD.right - 50))}
              y={tooltip.py - 21}
              textAnchor="middle"
              fill="white"
              fontSize={11}
              fontFamily="var(--font-mono)"
            >
              {tooltip.text} · {tooltip.sub}
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pl-12">
          {series
            .filter((s) => s.data.length > 0)
            .map((s) => (
              <div key={s.id} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-[2px] rounded-full flex-shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-[11px] text-text-muted truncate max-w-[200px]">
                  {s.label}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
