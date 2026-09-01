/**
 * src/components/ui/Select.tsx — accessible custom dropdown (no native <select>).
 * The menu renders in a portal at a fixed position so it never gets hidden
 * behind other elements (which can happen with backdrop-filter stacking contexts).
 */
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  /** Compact rounded-full trigger (topbar / filter pills). */
  pill?: boolean;
  /** Full-width trigger like an input (default). */
  fullWidth?: boolean;
  align?: 'left' | 'right';
  className?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  ariaLabel,
  pill,
  fullWidth,
  align = 'left',
  className = '',
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  // Position the portal menu under the trigger, then close on any outside
  // interaction, scroll, or resize.
  const openMenu = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = rect.left;
    if (align === 'right') left = rect.right - rect.width;
    setCoords({ top: rect.bottom + 6, left, width: rect.width });
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => setOpen(false);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);
  const label = current?.label ?? placeholder;

  return (
    <>
      <div className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? setOpen(false) : openMenu())}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={[
            'flex items-center gap-2 text-sm font-medium text-text-primary transition-colors',
            pill
              ? 'py-1.5 pl-3 pr-2 rounded-full bg-glass/[0.05] border border-glass/[0.1] hover:bg-glass/[0.08] hover:border-glass/[0.16]'
              : 'py-2 px-3 rounded-[10px] bg-glass/[0.05] border border-glass/[0.12] hover:border-glass/[0.2]',
            fullWidth ? 'w-full' : '',
          ].join(' ')}
        >
          <span className="flex-1 truncate text-left">{label}</span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 9999,
            }}
            className="rounded-xl bg-bg-elevated border border-glass/[0.14] p-1 shadow-lg"
          >
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-start justify-between gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    selected
                      ? 'bg-accent/15 text-accent font-medium'
                      : 'text-text-secondary hover:bg-glass/[0.06] hover:text-text-primary'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{o.label}</span>
                    {o.sublabel && (
                      <span className="block text-xs text-text-muted truncate">{o.sublabel}</span>
                    )}
                  </span>
                  {selected && <Check className="w-4 h-4 shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
