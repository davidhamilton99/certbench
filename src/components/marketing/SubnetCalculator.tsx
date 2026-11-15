"use client";

import { useMemo, useState } from "react";
import { calculateSubnet } from "@/lib/tools/subnet-calculator";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** /0–/32 with the dotted mask precomputed for the prefix dropdown. */
const PREFIX_OPTIONS = Array.from({ length: 33 }, (_, p) => ({
  p,
  mask: calculateSubnet("0.0.0.0", p)!.mask,
}));

/** A headline answer, on the path's answer tile. Long addresses wrap rather than widen a phone's page. */
function Tile({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn("grid min-w-0 gap-1 rounded-xl border bg-card px-3 py-3 sm:px-4", wide && "col-span-2 sm:col-span-1")}>
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-semibold tabular-nums [overflow-wrap:anywhere] sm:text-base">
        {value}
      </span>
    </div>
  );
}

function Row({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid gap-0.5 border-t border-border/60 py-2.5 first:border-t-0 sm:flex sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 text-sm [overflow-wrap:anywhere] sm:text-right", mono && "font-mono tabular-nums")}>
        {value}
      </dd>
    </div>
  );
}

/**
 * Live IPv4 subnet calculator. Type an address, pick a prefix, and every
 * subnet fact updates instantly — the query "subnet calculator" is pure tool
 * intent, so the tool is the first screen.
 */
export function SubnetCalculator() {
  const [ip, setIp] = useState("192.168.1.0");
  const [prefix, setPrefix] = useState(24);

  function onIpChange(v: string) {
    // Accept a pasted "10.0.0.0/24" and split the prefix out of it.
    const slash = v.indexOf("/");
    if (slash >= 0) {
      const p = parseInt(v.slice(slash + 1), 10);
      if (Number.isInteger(p) && p >= 0 && p <= 32) setPrefix(p);
      setIp(v.slice(0, slash));
    } else {
      setIp(v);
    }
  }

  const result = useMemo(() => calculateSubnet(ip, prefix), [ip, prefix]);

  return (
    <div className="glass grid min-w-0 gap-6 rounded-3xl p-5 sm:p-8">
      <div className="grid gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          IP address and prefix
        </span>
        <div className="flex flex-wrap items-center gap-2.5">
          <Input
            value={ip}
            onChange={(e) => onIpChange(e.target.value)}
            placeholder="192.168.1.0"
            inputMode="decimal"
            aria-label="IP address"
            autoComplete="off"
            spellCheck={false}
            className="h-12 w-full min-w-0 font-mono text-lg sm:w-56"
          />
          <select
            value={prefix}
            onChange={(e) => setPrefix(Number(e.target.value))}
            aria-label="CIDR prefix"
            className="h-12 w-full min-w-0 rounded-md border bg-background px-3 font-mono text-sm sm:w-auto"
          >
            {PREFIX_OPTIONS.map(({ p, mask }) => (
              <option key={p} value={p}>
                /{p} · {mask}
              </option>
            ))}
          </select>
        </div>
      </div>

      {result ? (
        <div className="grid min-w-0 gap-4">
          <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3">
            <Tile label="Usable hosts" value={result.usableHosts.toLocaleString()} wide />
            <Tile label="Network address" value={result.network} />
            <Tile label="Broadcast address" value={result.broadcast} />
          </div>
          <dl className="min-w-0 rounded-xl border bg-card/60 px-4">
            <Row label="Usable host range" value={result.hostRange} />
            <Row label="Subnet mask" value={result.mask} />
            <Row label="Wildcard mask" value={result.wildcard} />
            <Row label="CIDR notation" value={result.cidr} />
            <Row label="Total addresses" value={result.totalAddresses.toLocaleString()} />
            <Row label="IP class" value={result.ipClass} />
            <Row label="Address type" value={result.addressType} mono={false} />
            <Row label="Mask (binary)" value={result.maskBinary} />
          </dl>
        </div>
      ) : (
        <p className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-muted-foreground">
          Enter a valid IPv4 address, e.g. <span className="font-mono text-foreground">192.168.1.0</span>.
        </p>
      )}
    </div>
  );
}
