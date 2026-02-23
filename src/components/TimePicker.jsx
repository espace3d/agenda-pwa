import { useRef, useEffect, useCallback } from 'react';

const ITEM_HEIGHT = 38;
const VISIBLE_COUNT = 3;
const HALF = Math.floor(VISIBLE_COUNT / 2);

function WheelColumn({ items, value, onChange }) {
  const ref = useRef(null);
  const isScrollingRef = useRef(false);
  const timeoutRef = useRef(null);

  const selectedIndex = items.indexOf(value);

  useEffect(() => {
    if (!ref.current || isScrollingRef.current) return;
    ref.current.scrollTop = selectedIndex * ITEM_HEIGHT;
  }, [selectedIndex]);

  const snapToNearest = useCallback(() => {
    if (!ref.current) return;
    const scrollTop = ref.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    ref.current.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: 'smooth' });
    if (items[clamped] !== value) {
      onChange(items[clamped]);
    }
  }, [items, value, onChange]);

  const handleScroll = () => {
    isScrollingRef.current = true;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      snapToNearest();
    }, 80);
  };

  return (
    <div className="wheel-column">
      <div
        className="wheel-scroll"
        ref={ref}
        onScroll={handleScroll}
        style={{ height: ITEM_HEIGHT * VISIBLE_COUNT }}
      >
        <div style={{ height: ITEM_HEIGHT * HALF }} />
        {items.map((item, i) => (
          <div
            key={i}
            className={`wheel-item${item === value ? ' active' : ''}`}
            style={{ height: ITEM_HEIGHT }}
            onClick={() => {
              onChange(item);
              if (ref.current) {
                ref.current.scrollTo({ top: i * ITEM_HEIGHT, behavior: 'smooth' });
              }
            }}
          >
            {item}
          </div>
        ))}
        <div style={{ height: ITEM_HEIGHT * HALF }} />
      </div>
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

export default function TimePicker({ value, onChange }) {
  const [h, m] = (value || '12:00').split(':');

  return (
    <div className="time-picker">
      <WheelColumn
        items={HOURS}
        value={h}
        onChange={(newH) => onChange(`${newH}:${m}`)}
      />
      <div className="time-picker-sep">:</div>
      <WheelColumn
        items={MINUTES}
        value={m}
        onChange={(newM) => onChange(`${h}:${newM}`)}
      />
    </div>
  );
}
