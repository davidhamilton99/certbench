"use client";

import { useId, useMemo, useState } from "react";
import { calculateSubnet } from "@/lib/tools/subnet-calculator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Every prefix from /0 to /32, with its dotted mask worked out once for the list. */
const PREFIX_OPTIONS = Array.from({ length: 33 }, (_, p) => ({
  p,
  mask: calculateSubnet("0.0.0.0", p)!.mask,
}));

/** Figures are set the American way whatever the reader's own settings, as the rest of the site is. */
const count = (n: number) => n.toLocaleString("en-US");

/** One of the three answers people come for. A long address wraps inside its cell and never widens a phone's page. */
function Headline({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn("grid min-w-0 gap-1 rounded-lg border bg-card px-3 py-3 sm:px-4", wide && "col-span-2 sm:col-span-1")}>
      <dt className="cb-label text-muted-foreground">{label}</dt>
      <dd className="font-mono text-small font-semibold tabular-nums [overflow-wrap:anywhere] sm:text-base">{value}</dd>
    </div>
  );
}

function Row({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid gap-0.5 border-t border-border py-2.5 first:border-t-0 sm:flex sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-small text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 text-small [overflow-wrap:anywhere] sm:text-right", mono && "font-mono tabular-nums")}>
        {value}
      </dd>
    </div>
  );
}

/**
 * The IPv4 subnet calculator: an address and a prefix length in, every fact
 * about the subnet out, worked again at each keystroke. It is the first thing
 * on its page, because a visitor who searches for a subnet calculator has come
 * to use one.
 *
 * Each field has a visible label. An address that cannot be read is said in a
 * sentence under the fields, tied to the address field and announced politely
 * (it appears while the visitor is still typing, so it must not interrupt).
 */
export function SubnetCalculator() {
  const [ip, setIp] = useState("192.168.1.0");
  const [prefix, setPrefix] = useState(24);
  const ipId = useId();
  const prefixId = useId();
  const hintId = useId();
  const errorId = useId();

  function onIpChange(v: string) {
    // An address pasted with its prefix ("10.0.0.0/24") fills both fields.
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
  const invalid = result === null;

  return (
    <div className="glass grid min-w-0 gap-6 rounded-lg p-5 sm:p-8">
      <div className="grid gap-2.5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <div className="grid content-start gap-2">
            <Label htmlFor={ipId}>IP address</Label>
            <Input
              id={ipId}
              value={ip}
              onChange={(e) => onIpChange(e.target.value)}
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={invalid ? true : undefined}
              aria-describedby={invalid ? `${hintId} ${errorId}` : hintId}
              className="h-12 font-mono text-lg md:text-lg pointer-coarse:h-12"
            />
          </div>
          <div className="grid content-start gap-2">
            <Label htmlFor={prefixId}>Prefix length</Label>
            <select
              id={prefixId}
              value={prefix}
              onChange={(e) => setPrefix(Number(e.target.value))}
              // The same 18px as the address field. Anything under 16px makes a phone zoom the page when the list opens.
              className="h-12 w-full min-w-0 rounded-md border border-input bg-card px-3 font-mono text-lg transition-colors focus-visible:border-ring sm:w-fit"
            >
              {PREFIX_OPTIONS.map(({ p, mask }) => (
                <option key={p} value={p}>
                  /{p} ({mask})
                </option>
              ))}
            </select>
          </div>
        </div>
        <p id={hintId} className="text-note text-muted-foreground">
          An address pasted with its prefix, such as <span className="font-mono">10.0.0.0/24</span>, fills both fields.
        </p>
        {/* Always in the page, so that the sentence is announced when it appears. */}
        <p id={errorId} role="status" className={invalid ? "text-small text-destructive" : "sr-only"}>
          {invalid && (
            <>
              Enter a valid IPv4 address, for example <span className="font-mono">192.168.1.0</span>.
            </>
          )}
        </p>
      </div>

      {result && (
        <div className="grid min-w-0 gap-4">
          <dl className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3">
            <Headline label="Usable hosts" value={count(result.usableHosts)} wide />
            <Headline label="Network address" value={result.network} />
            <Headline label="Broadcast address" value={result.broadcast} />
          </dl>
          <dl className="min-w-0 rounded-lg border bg-card px-4">
            <Row label="Usable host range" value={result.hostRange} />
            <Row label="Subnet mask" value={result.mask} />
            <Row label="Wildcard mask" value={result.wildcard} />
            <Row label="CIDR notation" value={result.cidr} />
            <Row label="Total addresses" value={count(result.totalAddresses)} />
            <Row label="IP class" value={result.ipClass} />
            <Row label="Address type" value={result.addressType} mono={false} />
            <Row label="Subnet mask in binary" value={result.maskBinary} />
          </dl>
        </div>
      )}
    </div>
  );
}
