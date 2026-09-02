/**
 * src/components/ui/Select.tsx — accessible custom dropdown (no native <select>).
 * The menu renders in a portal at a fixed position with a guaranteed minimum width
 * and high-contrast typography that works cleanly in both dark and light modes.
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

  const openMenu = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuWidth = Math.max(220, rect.width);
    let left = rect.left;
    if (align === 'right' || left + menuWidth > window.innerWidth - 12) {
      left = rect.right - menuWidth;
    }
    if (left < 12) left = 12;

    setCoords({ top: rect.bottom + 6, left, width: menuWidth });
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
      <div className={`relative ${fullWidth ? 'w-full' : 'inline-block'} ${className}`}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? setOpen(false) : openMenu())}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={[
            'flex items-center gap-2 font-medium text-[rgb(var(--text-primary))] transition-all select-none',
            pill
              ? 'py-1.5 px-3 rounded-lg bg-[var(--hover-bg)] hover:bg-[var(--hover-bg-strong)] text-xs border border-[rgb(var(--border-subtle))]'
              : 'py-2 px-3 rounded-lg bg-[var(--hover-bg)] border border-[rgb(var(--border-subtle))] hover:border-[rgb(var(--border))] text-sm',
            fullWidth ? 'w-full justify-between' : '',
          ].join(' ')}
        >
          <span className="truncate">{label}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 text-[rgb(var(--text-muted))] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
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
            className="rounded-xl bg-[rgb(var(--bg-elevated))] border border-[rgb(var(--border))] p-1.5 shadow-2xl"
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
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left text-xs transition-all ${
                    selected
                      ? 'bg-[rgb(var(--accent))] text-white font-medium shadow-sm'
                      : 'text-[rgb(var(--text-primary))] hover:bg-[var(--hover-bg-strong)]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className={`font-medium ${selected ? 'text-white' : 'text-[rgb(var(--text-primary))]'}`}>
                      {o.label}
                    </div>
                    {o.sublabel && (
                      <div className={`text-[10px] mt-0.5 ${selected ? 'text-white/80' : 'text-[rgb(var(--text-muted))]'}`}>
                        {o.sublabel}
                      </div>
                    )}
                  </div>
                  {selected && <Check className="w-4 h-4 shrink-0 text-white" strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
