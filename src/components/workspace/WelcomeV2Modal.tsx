"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";

const SEEN_KEY = "certbench-v2-welcome-seen";

const CHANGES = [
  "The site has a light theme and a dark theme, and you can change between them at any time.",
  "The readiness report shows a score for each exam domain.",
  "The design of the site is plainer.",
];

/**
 * A note shown once to a member whose account is older than the rebuilt site
 * (`enabled`), and once for each browser (a flag in localStorage). It renders
 * nothing on the server and on the first client paint, so hydration never
 * mismatches, and decides after mount.
 *
 * It is a real modal dialog: while it is open the page behind it cannot be
 * reached with Tab, a pointer or a screen reader, Escape closes it, and it
 * opens with the focus on its one button. Nothing moves as it opens: it
 * arrives with the page and not in answer to a press.
 */
export function WelcomeV2Modal({ enabled }: { enabled: boolean }) {
  // Read "already seen" from localStorage without setting state in an effect:
  // getServerSnapshot returns "seen", so the server and the first paint render
  // nothing, and the client then reads the real value.
  const seen = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return window.localStorage.getItem(SEEN_KEY) ? "seen" : "new";
      } catch {
        return "seen";
      }
    },
    () => "seen"
  );
  const [dismissed, setDismissed] = useState(false);
  const open = enabled && seen === "new" && !dismissed;

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Storage is refused: the note is closed for this visit only.
    }
    setDismissed(true);
  }, []);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim" />
        <Dialog.Content className="glass fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-lg p-6 text-card-foreground">
          <Dialog.Title className="cb-statement">CertBench has been rebuilt.</Dialog.Title>
          <Dialog.Description className="text-small text-muted-foreground">
            Your account, your progress and everything that you have studied are where you left them.
          </Dialog.Description>
          <div className="grid gap-2">
            <p className="text-small font-medium">What has changed:</p>
            <ul className="grid list-disc gap-1.5 pl-5 text-small text-muted-foreground">
              {CHANGES.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </div>
          <Button onClick={dismiss} className="justify-self-start">
            Continue
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
