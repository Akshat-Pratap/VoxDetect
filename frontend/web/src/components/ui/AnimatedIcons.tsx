/**
 * src/components/ui/AnimatedIcons.tsx
 * Reusable animated state icons (framer-motion).
 *
 * Every icon morphs between two meaningful states. Each accepts:
 *  - active:  controlled state — when defined, the icon reflects it directly
 *             (pass `active={loading}` from your component's real state)
 *  - autoToggle: when set (ms), the icon loops both states on a timer (demo
 *             or "alive" UI only — remove for production use)
 *
 * Example:
 *   <DownloadDoneIcon active={exported} size={16} />
 *   <NotificationIcon autoToggle={3000} size={16} color="var(--accent)" />
 */
import { cn } from '@/lib/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface StateIconProps {
  size?: number;
  color?: string;
  className?: string;
  active?: boolean;
  autoToggle?: number;
}

function useStateful(active: boolean | undefined, autoToggle?: number) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (active !== undefined) {
      setOn(active);
      return;
    }
    if (autoToggle) {
      const id = setInterval(() => setOn((v) => !v), autoToggle);
      return () => clearInterval(id);
    }
  }, [active, autoToggle]);
  return on;
}

const spring = [0.32, 0.72, 0, 1] as const;

/* ─── LOADING → SUCCESS ─── spinner morphs into checkmark */
export function SuccessIcon({ size = 16, color = 'currentColor', className, active, autoToggle }: StateIconProps) {
  const done = useStateful(active, autoToggle);
  return (
    <svg viewBox="2 2 36 36" fill="none" className={cn(className)} style={{ width: size, height: size }}>
      <motion.circle cx="20" cy="20" r="16" stroke={color} strokeWidth={2.5}
        animate={done ? { pathLength: 1, opacity: 1 } : { pathLength: 0.7, opacity: 0.4 }}
        transition={{ duration: 0.5 }}
      />
      {!done && (
        <motion.circle cx="20" cy="20" r="16" stroke={color} strokeWidth={2.5}
          strokeLinecap="round" strokeDasharray="25 75"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '50% 50%' }}
        />
      )}
      <motion.path d="M12 20l6 6 10-12" stroke={color} strokeWidth={2.5}
        strokeLinecap="round" strokeLinejoin="round"
        animate={done ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        transition={{ duration: 0.4, delay: done ? 0.2 : 0 }}
      />
    </svg>
  );
}

/* ─── BELL → NOTIFICATION ─── bell rings then a dot appears */
export function NotificationIcon({ size = 16, color = 'currentColor', className, active, autoToggle }: StateIconProps) {
  const notif = useStateful(active, autoToggle);
  return (
    <motion.svg viewBox="7 4 26 31" fill="none" className={cn(className)}
      animate={notif ? { rotate: [0, 8, -8, 6, -6, 3, 0] } : { rotate: 0 }}
      transition={{ duration: 0.6 }}
      style={{ width: size, height: size, transformOrigin: '50% 8%' }}>
      <path d="M28 16a8 8 0 00-16 0c0 8-4 10-4 10h24s-4-2-4-10" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 30a3 3 0 005 0" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <motion.circle cx="28" cy="10" r="4"
        animate={notif ? { scale: [0, 1.3, 1], opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ duration: 0.4, ease: spring }}
      />
    </motion.svg>
  );
}

/* ─── DOWNLOAD → DONE ─── arrow drops into tray then checks (export/report) */
export function DownloadDoneIcon({ size = 16, color = 'currentColor', className, active, autoToggle }: StateIconProps) {
  const done = useStateful(active, autoToggle);
  return (
    <svg viewBox="5 3 30 35" fill="none" className={cn(className)} style={{ width: size, height: size }}>
      <path d="M8 28v4a2 2 0 002 2h20a2 2 0 002-2v-4" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <AnimatePresence mode="wait">
        {done ? (
          <motion.path key="check" d="M14 22l6 6 8-10" stroke={color} strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            exit={{ pathLength: 0, opacity: 0 }} transition={{ duration: 0.35 }}
          />
        ) : (
          <motion.g key="arrow"
            initial={{ y: -4, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }} transition={{ duration: 0.35, ease: spring }}>
            <line x1="20" y1="6" x2="20" y2="24" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <polyline points="14,18 20,24 26,18" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

/* ─── UPLOAD → DONE ─── arrow rises out of tray then checks */
export function UploadDoneIcon({ size = 16, color = 'currentColor', className, active, autoToggle }: StateIconProps) {
  const done = useStateful(active, autoToggle);
  return (
    <svg viewBox="5 3 30 35" fill="none" className={cn(className)} style={{ width: size, height: size }}>
      <path d="M8 26v4a2 2 0 002 2h20a2 2 0 002-2v-4" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <AnimatePresence mode="wait">
        {done ? (
          <motion.path key="check" d="M15 21l5 5 7-9" stroke={color} strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            exit={{ pathLength: 0, opacity: 0 }} transition={{ duration: 0.35 }}
          />
        ) : (
          <motion.g key="arrow"
            initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }} transition={{ duration: 0.35, ease: spring }}>
            <line x1="20" y1="22" x2="20" y2="4" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <polyline points="14,10 20,4 26,10" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

/* ─── COPY → COPIED ─── clipboard with checkmark flash */
export function CopiedIcon({ size = 16, color = 'currentColor', className, active, autoToggle }: StateIconProps) {
  const copied = useStateful(active, autoToggle);
  return (
    <svg viewBox="6 8 28 28" fill="none" className={cn(className)} style={{ width: size, height: size }}>
      <rect x="12" y="10" width="18" height="22" rx="2" stroke={color} strokeWidth={2.5} />
      <path d="M10 14h-0a2 2 0 00-2 2v18a2 2 0 002 2h14" stroke={color} strokeWidth={2.5} strokeLinecap="round" opacity={0.3} />
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.path key="check" d="M16 21l4 4 6-8" stroke={color} strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            exit={{ pathLength: 0 }} transition={{ duration: 0.3 }}
          />
        ) : (
          <motion.g key="lines" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <line x1="17" y1="18" x2="25" y2="18" stroke={color} strokeWidth={2.5} strokeLinecap="round" opacity={0.4} />
            <line x1="17" y1="23" x2="25" y2="23" stroke={color} strokeWidth={2.5} strokeLinecap="round" opacity={0.4} />
            <line x1="17" y1="28" x2="22" y2="28" stroke={color} strokeWidth={2.5} strokeLinecap="round" opacity={0.4} />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

/* ─── MENU → CLOSE ─── hamburger morphs to X */
export function MenuCloseIcon({ size = 16, color = 'currentColor', className, active, autoToggle }: StateIconProps) {
  const open = useStateful(active, autoToggle);
  return (
    <svg viewBox="8 10 24 20" fill="none" className={cn(className)} style={{ width: size, height: size }}>
      <motion.line x1="10" x2="30" stroke={color} strokeWidth={2.5} strokeLinecap="round"
        animate={open ? { y1: 20, y2: 20, rotate: 45 } : { y1: 12, y2: 12, rotate: 0 }}
        transition={{ duration: 0.35, ease: spring }} style={{ transformOrigin: '50% 50%' }}
      />
      <motion.line x1="10" y1="20" x2="30" y2="20" stroke={color} strokeWidth={2.5} strokeLinecap="round"
        animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.2 }} style={{ transformOrigin: '50% 50%' }}
      />
      <motion.line x1="10" x2="30" stroke={color} strokeWidth={2.5} strokeLinecap="round"
        animate={open ? { y1: 20, y2: 20, rotate: -45 } : { y1: 28, y2: 28, rotate: 0 }}
        transition={{ duration: 0.35, ease: spring }} style={{ transformOrigin: '50% 50%' }}
      />
    </svg>
  );
}

/* ─── PLAY → PAUSE ─── */
export function PlayPauseIcon({ size = 16, color = 'currentColor', className, active, autoToggle }: StateIconProps) {
  const playing = useStateful(active, autoToggle);
  return (
    <svg viewBox="10 8 22 24" fill="none" className={cn(className)} style={{ width: size, height: size }}>
      <AnimatePresence mode="wait">
        {playing ? (
          <motion.g key="pause" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.25 }} style={{ transformOrigin: '50% 50%' }}>
            <rect x="12" y="10" width="5" height="20" rx="1.5" fill={color} />
            <rect x="23" y="10" width="5" height="20" rx="1.5" fill={color} />
          </motion.g>
        ) : (
          <motion.g key="play" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.25 }} style={{ transformOrigin: '50% 50%' }}>
            <polygon points="14,10 30,20 14,30" fill={color} />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

/* ─── TOGGLE ─── switch flips with spring */
export function ToggleIcon({ size = 16, color = 'currentColor', className, active, autoToggle }: StateIconProps) {
  const on = useStateful(active, autoToggle);
  return (
    <svg viewBox="3 11 34 18" fill="none" className={cn(className)} style={{ width: size, height: size }}>
      <motion.rect x="5" y="13" width="30" height="14" rx="7"
        animate={on ? { fill: color, opacity: 0.2 } : { fill: color, opacity: 0.08 }}
        transition={{ duration: 0.3 }}
      />
      <rect x="5" y="13" width="30" height="14" rx="7" stroke={color} strokeWidth={2.5} opacity={on ? 1 : 0.4} />
      <motion.circle cy="20" r="5" fill={color}
        animate={on ? { cx: 28 } : { cx: 12 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      />
    </svg>
  );
}

/* ─── SEND ─── paper plane flies off then resets */
export function SendIcon({ size = 16, color = 'currentColor', className, active, autoToggle }: StateIconProps) {
  const sent = useStateful(active, autoToggle);
  return (
    <svg viewBox="14 4 22 32" fill="none" className={cn(className)} style={{ width: size, height: size }}>
      <motion.g
        animate={sent ? { x: 18, y: -18, opacity: 0, scale: 0.5 } : { x: 0, y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: spring }}>
        <path d="M34 6L16 20l-6-2L34 6z" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
        <path d="M34 6L22 34l-6-14" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
        <line x1="16" y1="20" x2="22" y2="34" stroke={color} strokeWidth={2.5} />
      </motion.g>
    </svg>
  );
}