"use client";

import { useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A question that must be answered before anything else: "Leave the lab?".
 *
 * It is a real modal dialog. While it is open the page behind it cannot be
 * reached with Tab, a pointer or a screen reader; Escape and a press outside
 * it both mean the safe answer; and when it closes, focus goes back to the
 * control that opened it, unless the page has already put the focus somewhere
 * else on purpose or the control is gone. It opens with focus on the safe
 * answer (the one that changes nothing), so a stray Enter never discards work.
 * The title is the dialog's name and the message its description.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  // The control that had the focus when the dialog opened. The dialog is opened
  // by its host and has no trigger of the library's own, so the library cannot
  // return the focus by itself: it would focus a trigger that does not exist.
  const openerRef = useRef<HTMLElement | null>(null);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim" />
        <Dialog.Content
          className="glass fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg p-6 text-card-foreground"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            // The opener still has the focus at this moment, before it moves to the safe answer.
            const active = document.activeElement;
            openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
            cancelRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const opener = openerRef.current;
            openerRef.current = null;
            // A page that has already moved the focus (to a row, a heading) keeps it where it put it.
            const active = document.activeElement;
            const unclaimed = active === null || active === document.body;
            if (unclaimed && opener?.isConnected) opener.focus();
          }}
        >
          <Dialog.Title className="text-base font-semibold leading-snug">{title}</Dialog.Title>
          <Dialog.Description className="text-small text-muted-foreground">{message}</Dialog.Description>
          <div className="flex flex-wrap justify-end gap-2">
            <Button ref={cancelRef} variant="outline" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
