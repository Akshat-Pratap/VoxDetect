/**
 * src/components/ui/Tooltip.tsx — Custom hover/focus tooltip
 *
 * Rendering through a portal to <body> with viewport clamping, so tooltips
 * are never clipped by any `overflow` ancestor (e.g. the TopBar header).
 *
 * Usage:
 *   <Tooltip label="Helps in later stages :)">
 *     <button>…</button>
 *   </Tooltip>
 *
 * Find all tooltips by searching for `<Tooltip` in the codebase.
 */
import { useId, useRef, useLayoutEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Side = 'top' | 'bottom' | 'right' | 'left';

export interface TooltipProps {
  label: string;
  side?: Side;
  children: ReactNode;
  className?: string;
}

const GAP = 8;
const EDGE = 8;

export function Tooltip({ label, side = 'top', children, className }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const id = useId();

  useLayoutEffect(() => {
    if (!visible) return;
    const trigger = triggerRef.current;
    const tip = tipRef.current;
    if (!trigger || !tip) return;

    const r = trigger.getBoundingClientRect();
    const t = tip.getBoundingClientRect();

    let x: number;
    let y: number;
    switch (side) {
      case 'top':
        x = r.left + r.width / 2 - t.width / 2;
        y = r.top - t.height - GAP;
        break;
      case 'bottom':
        x = r.left + r.width / 2 - t.width / 2;
        y = r.bottom + GAP;
        break;
      case 'right':
        x = r.right + GAP;
        y = r.top + r.height / 2 - t.height / 2;
        break;
      case 'left':
        x = r.left - t.width - GAP;
        y = r.top + r.height / 2 - t.height / 2;
        break;
    }

    x = Math.max(EDGE, Math.min(x, window.innerWidth - t.width - EDGE));
    y = Math.max(EDGE, Math.min(y, window.innerHeight - t.height - EDGE));
    setAnchor({ x, y });
  }, [visible, side, label]);

  return (
    <span
      ref={triggerRef}
      data-tooltip={label}
      className={`relative inline-flex ${className ?? ''}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible &&
        createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            id={id}
            style={{
              left: anchor ? anchor.x : -9999,
              top: anchor ? anchor.y : -9999,
              opacity: anchor ? 1 : 0,
            }}
            className="fixed z-[100] pointer-events-none select-none whitespace-nowrap rounded-md border border-[rgb(var(--border-subtle))] bg-[rgb(var(--bg-elevated))] px-2 py-1 text-[10px] font-medium text-[rgb(var(--text-primary))] shadow-md transition-opacity duration-150"
          >
            {label}
          </div>,
          document.body
        )}
    </span>
  );
}