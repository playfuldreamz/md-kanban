import { useState, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  label: string;
  placement?: 'top' | 'bottom';
  children: ReactNode;
}

/** Custom portal-based tooltip — matches the priority indicator tooltip style. */
export default function Tooltip({ label, placement = 'bottom', children }: TooltipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const translate = placement === 'top'
    ? 'translate(-50%, -100%)'
    : 'translate(-50%, 8px)';

  const calcY = placement === 'top'
    ? (rect: DOMRect) => rect.top - 6
    : (rect: DOMRect) => rect.bottom + 2;

  return (
    <>
      <div
        ref={ref}
        onMouseEnter={() => {
          if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setPos({ x: rect.left + rect.width / 2, y: calcY(rect) });
          }
        }}
        onMouseLeave={() => setPos(null)}
        className="inline-flex"
      >
        {children}
      </div>
      {pos && createPortal(
        <div
          className="fixed z-[9999] px-1.5 py-0.5 rounded text-[10px] font-medium bg-background-inverse text-foreground-inverse shadow pointer-events-none whitespace-nowrap"
          style={{ left: pos.x, top: pos.y, transform: translate }}
        >
          {label}
        </div>,
        document.body,
      )}
    </>
  );
}
