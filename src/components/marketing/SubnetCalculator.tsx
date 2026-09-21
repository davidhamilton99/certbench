"use client";

import { useMemo, useState } from "react";
import { calculateSubnet } from "@/lib/tools/subnet-calculator";
import { Input } from "@/components/ui/input";

/** /0–/32 with the dotted mask precomputed for the prefix dropdown. */
const PREFIX_OPTIONS = Array.from({ length: 33 }, (_, p) => ({
  p,
  mask: calculateSubnet("0.0.0.0", p)!.mask,
}));

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-lg border bg-background/40 p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

function Row({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={
          mono ? "text-right font-mono text-sm tabular-nums" : "text-right text-sm"
        }
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Live IPv4 subnet calculator. Type an address, pick a prefix, and every
 * subnet fact updates instantly — the query "subnet calculator" is pure tool
 * intent, so the tool is the whole page.
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
    <div className="grid gap-5 rounded-xl border bg-card p-6">
      <div className="grid gap-2">
        <span className="text-sm font-medium">IP address &amp; prefix</span>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={ip}
            onChange={(e) => onIpChange(e.target.value)}
            placeholder="192.168.1.0"
            inputMode="decimal"
            aria-label="IP address"
            className="w-44 font-mono"
          />
          <select
            value={prefix}
            onChange={(e) => setPrefix(Number(e.target.value))}
            aria-label="CIDR prefix"
            className="h-9 rounded-md border bg-background px-3 font-mono text-sm"
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
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Tile label="Usable hosts" value={result.usableHosts.toLocaleString()} />
            <Tile label="Network address" value={result.network} />
            <Tile label="Broadcast address" value={result.broadcast} />
          </div>
          <div className="rounded-lg border bg-background/40 px-4">
            <Row label="Usable host range" value={result.hostRange} />
            <Row label="Subnet mask" value={result.mask} />
            <Row label="Wildcard mask" value={result.wildcard} />
            <Row label="CIDR notation" value={result.cidr} />
            <Row
              label="Total addresses"
              value={result.totalAddresses.toLocaleString()}
            />
            <Row label="IP class" value={result.ipClass} />
            <Row label="Address type" value={result.addressType} mono={false} />
            <Row label="Mask (binary)" value={result.maskBinary} />
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-muted-foreground">
          Enter a valid IPv4 address — e.g.{" "}
          <span className="font-mono text-foreground">192.168.1.0</span>.
        </p>
      )}
    </div>
  );
}
