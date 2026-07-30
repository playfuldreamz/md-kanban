import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';

interface VirtualCardListProps<T> {
  items: T[];
  itemKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  estimatedItemHeight?: number;
  overscan?: number;
  threshold?: number; // minimum items before virtualization kicks in
  className?: string;
}

/**
 * Lightweight virtual list — only renders visible items + overscan.
 * Uses ResizeObserver to measure actual heights for precise scroll.
 * Falls back to plain rendering when below threshold.
 */
export default function VirtualCardList<T>({
  items,
  itemKey,
  renderItem,
  estimatedItemHeight = 80,
  overscan = 5,
  threshold = 30,
  className,
}: VirtualCardListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const heightsRef = useRef<Map<string, number>>(new Map());
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // If below threshold, just render everything
  if (items.length <= threshold) {
    return (
      <div className={className}>
        {items.map((item, i) => (
          <div key={itemKey(item, i)}>{renderItem(item, i)}</div>
        ))}
      </div>
    );
  }

  // Measure container on mount/resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Measure item heights
  const measureItem = useCallback((key: string, el: HTMLDivElement | null) => {
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      heightsRef.current.set(key, entries[0].contentRect.height);
    });
    observer.observe(el);
    itemRefs.current.set(key, el);
    return () => observer.disconnect();
  }, []);

  // Calculate visible range
  const totalHeight = items.reduce((sum, item, i) => {
    const key = itemKey(item, i);
    return sum + (heightsRef.current.get(key) || estimatedItemHeight);
  }, 0);

  let offsetY = 0;
  let startIndex = 0;
  for (let i = 0; i < items.length; i++) {
    const h = heightsRef.current.get(itemKey(items[i], i)) || estimatedItemHeight;
    if (offsetY + h > scrollTop - overscan * estimatedItemHeight) {
      startIndex = Math.max(0, i);
      break;
    }
    offsetY += h;
    if (i === items.length - 1) startIndex = items.length;
  }

  const endIndex = Math.min(
    items.length,
    (() => {
      let y = offsetY;
      for (let i = startIndex; i < items.length; i++) {
        y += heightsRef.current.get(itemKey(items[i], i)) || estimatedItemHeight;
        if (y > scrollTop + containerHeight + overscan * estimatedItemHeight) return i + 1;
      }
      return items.length;
    })(),
  );

  const visibleItems = items.slice(startIndex, endIndex);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  return (
    <div ref={containerRef} className={className} onScroll={handleScroll}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div key={itemKey(item, startIndex + i)} ref={(el) => measureItem(itemKey(item, startIndex + i), el)}>
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
