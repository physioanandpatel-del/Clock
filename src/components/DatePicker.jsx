import { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, eachDayOfInterval, isSameMonth, isSameDay, isToday
} from 'date-fns';
import './DatePicker.css';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    try { return value ? parseISO(value) : new Date(); } catch { return new Date(); }
  });
  const ref = useRef(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Sync viewDate when value changes externally
  useEffect(() => {
    try {
      if (value) setViewDate(parseISO(value));
    } catch { /* ignore */ }
  }, [value]);

  const selectedDate = value ? parseISO(value) : null;

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const handleSelect = useCallback((day) => {
    onChange(format(day, 'yyyy-MM-dd'));
    setOpen(false);
  }, [onChange]);

  const displayText = selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select date';

  return (
    <div className="datepicker" ref={ref}>
      <button className="datepicker__trigger" type="button" onClick={() => setOpen(!open)}>
        <Calendar size={14} className="datepicker__icon" />
        <span>{displayText}</span>
      </button>

      {open && (
        <div className="datepicker__dropdown">
          <div className="datepicker__header">
            <button type="button" className="datepicker__nav" onClick={() => setViewDate(subMonths(viewDate, 1))}>
              <ChevronLeft size={16} />
            </button>
            <span className="datepicker__month-label">{format(viewDate, 'MMMM yyyy')}</span>
            <button type="button" className="datepicker__nav" onClick={() => setViewDate(addMonths(viewDate, 1))}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="datepicker__weekdays">
            {DAYS.map((d) => <span key={d} className="datepicker__weekday">{d}</span>)}
          </div>

          <div className="datepicker__grid">
            {days.map((day) => {
              const inMonth = isSameMonth(day, viewDate);
              const selected = selectedDate && isSameDay(day, selectedDate);
              const todayDay = isToday(day);
              let cls = 'datepicker__day';
              if (!inMonth) cls += ' datepicker__day--outside';
              if (selected) cls += ' datepicker__day--selected';
              if (todayDay && !selected) cls += ' datepicker__day--today';
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={cls}
                  onClick={() => handleSelect(day)}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
