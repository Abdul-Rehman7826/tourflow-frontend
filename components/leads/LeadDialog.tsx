"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export const leadInput =
  "w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2.5 text-sm text-gray-900 dark:text-white";
export const leadButton =
  "rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed";
export function LeadDialog({
  title,
  onClose,
  children,
  wide = false,
  subtitle,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  subtitle?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={`m-auto w-[calc(100%_-_2rem)] max-h-[90dvh] border border-gray-200 dark:border-white/10 bg-white p-6 text-gray-900 dark:text-white backdrop:bg-black/70 ${wide ? "max-w-4xl overflow-hidden rounded-2xl dark:bg-[#0B0F19] shadow-2xl" : "max-w-xl overflow-y-auto rounded-xl dark:bg-[#030712]"}`}
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="rounded-lg border border-gray-200 dark:border-white/10 px-3 py-1"
        >
          {wide ? <X className="h-4 w-4" /> : "Close"}
        </button>
      </div>
      {children}
    </dialog>
  );
}
