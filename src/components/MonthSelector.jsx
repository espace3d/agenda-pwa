import { useEffect, useRef } from 'react';
import { getMonthLabel, getMonthsList } from '../utils/dateUtils';

const months = getMonthsList();

export default function MonthSelector({ selectedMonth, onSelectMonth }) {
  const scrollRef = useRef(null);
  const now = new Date();
  const currentMonth = { year: now.getFullYear(), month: now.getMonth() };

  useEffect(() => {
    if (!scrollRef.current) return;
    const active = scrollRef.current.querySelector('.month-chip.active');
    if (active) {
      active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedMonth]);

  const goToToday = () => {
    onSelectMonth(currentMonth);
  };

  return (
    <div className="month-selector">
      <div className="month-chips" ref={scrollRef}>
        {months.map(m => {
          const isActive = m.year === selectedMonth.year && m.month === selectedMonth.month;
          return (
            <button
              key={`${m.year}-${m.month}`}
              className={`month-chip${isActive ? ' active' : ''}`}
              onClick={() => onSelectMonth(m)}
            >
              {getMonthLabel(m.year, m.month)}
            </button>
          );
        })}
      </div>
      <button className="today-btn" onClick={goToToday}>
        Aujourd'hui
      </button>
    </div>
  );
}
