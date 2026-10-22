'use client';

import { useEffect, useId, useRef, type FormEventHandler, type ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './TourDrawer.module.css';

export function TourDrawer({ title, subtitle, children, footer, onClose, onSubmit }: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return <dialog
    ref={ref}
    aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    className={`${styles.overlay} fixed inset-0 z-50 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0`}
  >
    <form
      onSubmit={onSubmit ?? (event => event.preventDefault())}
      className={`${styles.panel} fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white text-gray-900 shadow-2xl dark:border-white/10 dark:bg-[#0B0F19] dark:text-white md:max-w-lg lg:max-w-xl`}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 p-5 dark:border-white/10">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          {subtitle && <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>}
        </div>
        <button type="button" onClick={onClose} aria-label={`Close ${title}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-[#7C3AED] dark:bg-white/5 dark:hover:bg-white/10"><X aria-hidden="true" className="h-4 w-4" /></button>
      </header>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-6">{children}</div>
      <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 p-4 dark:border-white/10 dark:bg-[#030712]">{footer}</footer>
    </form>
  </dialog>;
}
