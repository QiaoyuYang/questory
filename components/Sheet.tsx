"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** A Done button in the header. A sheet that asks a question has its own buttons instead. */
  done?: boolean;
  children: ReactNode;
};

/** An iOS-style bottom sheet. It is a modal <dialog>, so focus, Escape and the backdrop come for free. */
export function Sheet({ open, onClose, title, done = true, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="sheet"
      // Only a close the player made counts: when the app closes a sheet to open another
      // one, `open` is already false and the new sheet must stay.
      onClose={() => open && onClose()}
      // The sheet's content covers the whole dialog, so a click on the dialog itself is a tap on the backdrop.
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-seam" aria-hidden="true" />
        <header className="flex shrink-0 items-center justify-between gap-4 px-5 pt-2 pb-3">
          <h2 id={titleId} className="min-w-0 truncate font-sign text-xl font-bold">
            {title}
          </h2>
          {done && (
            <button type="button" onClick={onClose} className="-mr-2 min-h-11 shrink-0 rounded-md px-2 font-semibold text-lane">
              Done
            </button>
          )}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </dialog>
  );
}
