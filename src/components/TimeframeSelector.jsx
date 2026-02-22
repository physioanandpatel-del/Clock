import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears, parseISO } from 'date-fns';
import './TimeframeSelector.css';

const PRESETS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'biweekly', label: 'Bi-weekly' },
  { key: 'semimonthly', label: 'Semi-monthly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'annually', label: 'Annually' },
  { key: 'custom', label: 'Custom' },
];

function getQuarterStart(date) {
  const month = date.getMonth();
  const quarterStartMonth = month - (month % 3);
  return new Date(date.getFullYear(), quarterStartMonth, 1);
}

function getQuarterEnd(date) {
  const month = date.getMonth();
  const quarterEndMonth = month - (month % 3) + 2;
  return new Date(date.getFullYear(), quarterEndMonth + 1, 0);
}

function getSemiMonthlyRange(date) {
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.getMonth();
  if (day <= 15) {
    return { start: new Date(year, month, 1), end: new Date(year, month, 15) };
  }
  return { start: new Date(year, month, 16), end: new Date(year, month + 1, 0) };
}

export function calculateRange(preset, referenceDate = new Date()) {
  const d = referenceDate;
  switch (preset) {
    case 'daily':
      return { start: d, end: d };
    case 'weekly':
      return { start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }) };
    case 'biweekly': {
      const ws = startOfWeek(d, { weekStartsOn: 1 });
      return { start: subDays(ws, 7), end: endOfWeek(d, { weekStartsOn: 1 }) };
    }
    case 'semimonthly': {
      const sm = getSemiMonthlyRange(d);
      return { start: sm.start, end: sm.end };
    }
    case 'monthly':
      return { start: startOfMonth(d), end: endOfMonth(d) };
    case 'quarterly':
      return { start: getQuarterStart(d), end: getQuarterEnd(d) };
    case 'annually':
      return { start: startOfYear(d), end: endOfYear(d) };
    default:
      return { start: d, end: d };
  }
}

function navigatePreset(preset, referenceDate, direction) {
  const d = referenceDate;
  const dir = direction === 'next' ? 1 : -1;
  switch (preset) {
    case 'daily': return dir > 0 ? addDays(d, 1) : subDays(d, 1);
    case 'weekly': return dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1);
    case 'biweekly': return dir > 0 ? addWeeks(d, 2) : subWeeks(d, 2);
    case 'semimonthly': {
      const day = d.getDate();
      if (dir > 0) return day <= 15 ? new Date(d.getFullYear(), d.getMonth(), 16) : new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return day <= 15 ? new Date(d.getFullYear(), d.getMonth() - 1, 16) : new Date(d.getFullYear(), d.getMonth(), 1);
    }
    case 'monthly': return dir > 0 ? addMonths(d, 1) : subMonths(d, 1);
    case 'quarterly': return dir > 0 ? addMonths(d, 3) : subMonths(d, 3);
    case 'annually': return dir > 0 ? addYears(d, 1) : subYears(d, 1);
    default: return d;
  }
}

function formatRangeLabel(start, end, preset) {
  const s = typeof start === 'string' ? parseISO(start) : start;
  const e = typeof end === 'string' ? parseISO(end) : end;
  if (preset === 'daily') return format(s, 'EEE, MMM d, yyyy');
  if (preset === 'annually') return format(s, 'yyyy');
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${format(s, 'MMM d')} - ${format(e, 'd, yyyy')}`;
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${format(s, 'MMM d')} - ${format(e, 'MMM d, yyyy')}`;
  }
  return `${format(s, 'MMM d, yyyy')} - ${format(e, 'MMM d, yyyy')}`;
}

export default function TimeframeSelector({ value, onChange }) {
  const { preset, startDate, endDate } = value;
  const [refDate, setRefDate] = useState(new Date());

  const handlePresetChange = useCallback((newPreset) => {
    if (newPreset === 'custom') {
      onChange({ preset: 'custom', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd') });
      return;
    }
    const range = calculateRange(newPreset, new Date());
    setRefDate(new Date());
    onChange({ preset: newPreset, startDate: format(range.start, 'yyyy-MM-dd'), endDate: format(range.end, 'yyyy-MM-dd') });
  }, [onChange]);

  const handleNav = useCallback((direction) => {
    const newRef = navigatePreset(preset, refDate, direction);
    setRefDate(newRef);
    const range = calculateRange(preset, newRef);
    onChange({ preset, startDate: format(range.start, 'yyyy-MM-dd'), endDate: format(range.end, 'yyyy-MM-dd') });
  }, [preset, refDate, onChange]);

  const handleCustomDate = useCallback((field, val) => {
    onChange({ ...value, [field]: val });
  }, [value, onChange]);

  const label = useMemo(() => formatRangeLabel(startDate, endDate, preset), [startDate, endDate, preset]);

  return (
    <div className="timeframe-selector">
      <div className="timeframe-selector__presets">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            className={`timeframe-selector__preset ${preset === p.key ? 'timeframe-selector__preset--active' : ''}`}
            onClick={() => handlePresetChange(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="timeframe-selector__range">
        {preset !== 'custom' && (
          <button className="timeframe-selector__nav" onClick={() => handleNav('prev')}><ChevronLeft size={16} /></button>
        )}
        {preset === 'custom' ? (
          <div className="timeframe-selector__custom">
            <Calendar size={14} />
            <input type="date" className="timeframe-selector__date-input" value={startDate} onChange={(e) => handleCustomDate('startDate', e.target.value)} />
            <span>to</span>
            <input type="date" className="timeframe-selector__date-input" value={endDate} onChange={(e) => handleCustomDate('endDate', e.target.value)} />
          </div>
        ) : (
          <span className="timeframe-selector__label">{label}</span>
        )}
        {preset !== 'custom' && (
          <button className="timeframe-selector__nav" onClick={() => handleNav('next')}><ChevronRight size={16} /></button>
        )}
      </div>
    </div>
  );
}
