"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function MobileNavigation({ open, onClose, children }: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) onClose(); };
    desktop.addEventListener("change", closeOnDesktop);
    closeOnDesktop();
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      document.body.style.overflow = previousOverflow;
      dialog.close();
    };
  }, [open, onClose]);

  return (
    <dialog
      ref={ref}
      aria-label="Navigation menu"
      onCancel={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-gray-900 dark:text-gray-100 backdrop:bg-black/50"
    >
      <div className="flex h-full w-72 max-w-[85vw] flex-col bg-white dark:bg-[#030712] shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 dark:border-white/10 p-3">
          <span className="text-sm font-semibold">Navigation</span>
          <button type="button" onClick={onClose} aria-label="Close navigation" className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-white/5">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto" onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) onClose();
        }}>
          {children}
        </div>
      </div>
    </dialog>
  );
}
