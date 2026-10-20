"use client";

import { useEffect, useRef } from "react";
import { Button } from "./Button";

/**
 * Native <dialog> confirm box: showModal() makes the page inert and traps
 * focus; Escape and the backdrop close it; focus returns to whatever opened it.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onClose = () => {
      const o = opener.current;
      if (o && document.contains(o)) o.focus();
      onCancel();
    };
    const onClick = (e: MouseEvent) => {
      if (e.target === d) d.close();
    };
    d.addEventListener("close", onClose);
    d.addEventListener("click", onClick);
    return () => {
      d.removeEventListener("close", onClose);
      d.removeEventListener("click", onClick);
    };
  }, [onCancel]);

  return (
    <dialog ref={ref} aria-labelledby="confirm-title" className="sheet">
      <div className="p-6">
        <h2 id="confirm-title" className="font-display text-3xl font-extrabold uppercase tracking-wide">
          {title}
        </h2>
        <p className="mt-2 text-muted">{body}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => ref.current?.close()}>
            Keep it
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
