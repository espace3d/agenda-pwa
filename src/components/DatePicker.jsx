import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

function formatDisplay(dateStr) {
  if (!dateStr) return 'Sélectionner';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][date.getDay()];
  return `${dayName} ${d} ${MONTHS[m - 1]} ${y}`;
}

export default function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [y, m, d] = (value || '2026-01-01').split('-').map(Number);
  const [viewYear, setViewYear] = useState(y);
  const [viewMonth, setViewMonth] = useState(m - 1);
  const [tempDate, setTempDate] = useState(value);

  const grid = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    let startDay = first.getDay() - 1;
    if (startDay < 0) startDay = 6;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];
    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({ day: daysInPrev - i, inMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ day: i, inMonth: true });
    }
    while (cells.length < 42) {
      cells.push({ day: cells.length - (startDay + daysInMonth) + 1, inMonth: false });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const handleOpen = () => {
    const [cy, cm] = (value || '2026-01-01').split('-').map(Number);
    setViewYear(cy);
    setViewMonth(cm - 1);
    setTempDate(value);
    setOpen(true);
  };

  const handleSelect = (day) => {
    const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setTempDate(ds);
  };

  const handleConfirm = () => {
    if (tempDate) onChange(tempDate);
    setOpen(false);
  };

  const handleClear = () => {
    const now = new Date();
    const ds = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    onChange(ds);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const isSelected = (day) => {
    if (!tempDate) return false;
    const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return ds === tempDate;
  };

  const today = new Date();
  const isToday = (day) => {
    return day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  };

  return (
    <>
      <button type="button" className="date-display" onClick={handleOpen}>
        {formatDisplay(value)}
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="datepicker-modal" onClick={e => e.stopPropagation()}>
            <div className="datepicker-header">
              <span className="datepicker-header-label">
                {tempDate ? formatDisplay(tempDate) : 'Sélectionner une date'}
              </span>
            </div>

            <div className="datepicker-nav">
              <button type="button" onClick={prevMonth}><ChevronLeft size={18} /></button>
              <span>{MONTHS[viewMonth]} {viewYear}</span>
              <button type="button" onClick={nextMonth}><ChevronRight size={18} /></button>
            </div>

            <div className="datepicker-days-header">
              {DAYS.map(d => <div key={d} className="datepicker-day-name">{d}</div>)}
            </div>

            <div className="datepicker-grid">
              {grid.map((cell, i) => (
                <button
                  key={i}
                  type="button"
                  className={`datepicker-cell${!cell.inMonth ? ' out' : ''}${cell.inMonth && isSelected(cell.day) ? ' selected' : ''}${cell.inMonth && isToday(cell.day) ? ' today' : ''}`}
                  onClick={() => cell.inMonth && handleSelect(cell.day)}
                  disabled={!cell.inMonth}
                >
                  {cell.day}
                </button>
              ))}
            </div>

            <div className="datepicker-actions">
              <button type="button" className="datepicker-btn" onClick={handleClear}>Effacer</button>
              <button type="button" className="datepicker-btn" onClick={() => setOpen(false)}>Annuler</button>
              <button type="button" className="datepicker-btn primary" onClick={handleConfirm}>Définir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
