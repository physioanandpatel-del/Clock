import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TrendingUp, Plus, X, AlertTriangle, CheckCircle, ArrowUp, ArrowDown, DollarSign, BarChart3, Target } from 'lucide-react';
import { format, subDays, parseISO, isWithinInterval, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { getHoursWorked, getInitials } from '../utils/helpers';
import './Labour.css';

export default function Labour() {
  const { state, dispatch } = useApp();
  const { employees, shifts, salesEntries, locations, currentLocationId } = state;

  const currentLocation = locations.find((l) => l.id === currentLocationId);
  const targetPercent = currentLocation?.targetLaborPercent || 30;

  const locationEmployees = useMemo(() => employees.filter((e) => e.locationId === currentLocationId), [employees, currentLocationId]);
  const locationEmpIds = useMemo(() => new Set(locationEmployees.map((e) => e.id)), [locationEmployees]);

  const [weekOffset, setWeekOffset] = useState(0);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [salesForm, setSalesForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), amount: '' });

  const currentWeekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addWeeks(base, weekOffset);
  }, [weekOffset]);
  const currentWeekEnd = useMemo(() => endOfWeek(currentWeekStart, { weekStartsOn: 1 }), [currentWeekStart]);

  // Calculate weekly labour cost
  const weeklyLabor = useMemo(() => {
    const weekShifts = shifts.filter((s) => {
      if (!locationEmpIds.has(s.employeeId)) return false;
      const d = parseISO(s.start);
      return isWithinInterval(d, { start: currentWeekStart, end: currentWeekEnd });
    });
    let totalCost = 0;
    let totalHours = 0;
    weekShifts.forEach((s) => {
      const emp = locationEmployees.find((e) => e.id === s.employeeId);
      if (emp) {
        const hrs = getHoursWorked(s.start, s.end);
        totalHours += hrs;
        totalCost += hrs * emp.hourlyRate;
      }
    });
    return { totalCost, totalHours, shiftCount: weekShifts.length };
  }, [shifts, locationEmpIds, locationEmployees, currentWeekStart, currentWeekEnd]);

  // Weekly sales
  const weeklySales = useMemo(() => {
    return salesEntries
      .filter((s) => s.locationId === currentLocationId)
      .filter((s) => {
        const d = parseISO(s.date);
        return isWithinInterval(d, { start: currentWeekStart, end: currentWeekEnd });
      })
      .reduce((sum, s) => sum + s.amount, 0);
  }, [salesEntries, currentLocationId, currentWeekStart, currentWeekEnd]);

  const laborPercent = weeklySales > 0 ? (weeklyLabor.totalCost / weeklySales) * 100 : 0;
  const laborDiff = laborPercent - targetPercent;
  const isOverTarget = laborDiff > 2;
  const isUnderTarget = laborDiff < -5;
  const isOnTarget = !isOverTarget && !isUnderTarget;

  // Historical data for forecasting (last 4 weeks)
  const historicalData = useMemo(() => {
    const weeks = [];
    for (let w = 1; w <= 4; w++) {
      const ws = subWeeks(currentWeekStart, w);
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      const sales = salesEntries
        .filter((s) => s.locationId === currentLocationId)
        .filter((s) => { const d = parseISO(s.date); return isWithinInterval(d, { start: ws, end: we }); })
        .reduce((sum, s) => sum + s.amount, 0);
      const wShifts = shifts.filter((s) => {
        if (!locationEmpIds.has(s.employeeId)) return false;
        const d = parseISO(s.start);
        return isWithinInterval(d, { start: ws, end: we });
      });
      let labor = 0;
      wShifts.forEach((s) => {
        const emp = locationEmployees.find((e) => e.id === s.employeeId);
        if (emp) labor += getHoursWorked(s.start, s.end) * emp.hourlyRate;
      });
      const pct = sales > 0 ? (labor / sales) * 100 : 0;
      weeks.push({ weekStart: ws, sales, labor, percent: pct });
    }
    return weeks;
  }, [salesEntries, shifts, currentLocationId, locationEmpIds, locationEmployees, currentWeekStart]);

  // Forecasting: average historical sales => required revenue for current labor
  const avgWeeklySales = useMemo(() => {
    const totals = historicalData.filter((w) => w.sales > 0);
    if (totals.length === 0) return 0;
    return totals.reduce((s, w) => s + w.sales, 0) / totals.length;
  }, [historicalData]);

  const requiredRevenue = targetPercent > 0 ? (weeklyLabor.totalCost / targetPercent) * 100 : 0;
  const revenueDiff = avgWeeklySales - requiredRevenue;

  // Daily sales data for the week
  const dailySales = useMemo(() => {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = format(addWeeks(currentWeekStart, 0), 'yyyy-MM-dd').slice(0, 8) + String(parseISO(format(currentWeekStart, 'yyyy-MM-dd')).getDate() + d).padStart(2, '0');
      const dayDate = new Date(currentWeekStart);
      dayDate.setDate(dayDate.getDate() + d);
      const dateStr = format(dayDate, 'yyyy-MM-dd');
      const entry = salesEntries.find((s) => s.locationId === currentLocationId && s.date === dateStr);
      days.push({ date: dateStr, dayLabel: format(dayDate, 'EEE'), amount: entry?.amount || 0, entryId: entry?.id });
    }
    return days;
  }, [salesEntries, currentLocationId, currentWeekStart]);

  function handleAddSales(e) {
    e.preventDefault();
    const existing = salesEntries.find((s) => s.locationId === currentLocationId && s.date === salesForm.date);
    if (existing) {
      dispatch({ type: 'UPDATE_SALES_ENTRY', payload: { id: existing.id, amount: Number(salesForm.amount) } });
    } else {
      dispatch({ type: 'ADD_SALES_ENTRY', payload: { locationId: currentLocationId, date: salesForm.date, amount: Number(salesForm.amount) } });
    }
    setShowSalesModal(false);
  }

  return (
    <div className="labour-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Labour & Forecasting</h1>
          <p className="page-subtitle">Sales data, labour efficiency, and forecasting</p>
        </div>
        <button className="btn btn--primary" onClick={() => { setSalesForm({ date: format(new Date(), 'yyyy-MM-dd'), amount: '' }); setShowSalesModal(true); }}>
          <Plus size={16} /> Add Sales Data
        </button>
      </div>

      {/* Week Navigation */}
      <div className="labour-nav">
        <button className="btn btn--icon" onClick={() => setWeekOffset((o) => o - 1)}>&larr;</button>
        <span className="labour-nav__label">{format(currentWeekStart, 'MMM d')} - {format(currentWeekEnd, 'MMM d, yyyy')}</span>
        <button className="btn btn--icon" onClick={() => setWeekOffset((o) => o + 1)}>&rarr;</button>
      </div>

      {/* Summary Cards */}
      <div className="labour-summary">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue"><DollarSign size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__label">Weekly Sales</span>
            <span className="stat-card__value">${weeklySales.toLocaleString()}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple"><DollarSign size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__label">Labour Cost</span>
            <span className="stat-card__value">${weeklyLabor.totalCost.toLocaleString()}</span>
          </div>
        </div>
        <div className={`stat-card ${isOverTarget ? 'stat-card--danger' : isOnTarget ? 'stat-card--success' : ''}`}>
          <div className={`stat-card__icon ${isOverTarget ? 'stat-card__icon--red' : isOnTarget ? 'stat-card__icon--green' : 'stat-card__icon--orange'}`}>
            <Target size={22} />
          </div>
          <div className="stat-card__info">
            <span className="stat-card__label">Labour % (Target: {targetPercent}%)</span>
            <span className="stat-card__value">{laborPercent.toFixed(1)}%</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green"><BarChart3 size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__label">Total Hours</span>
            <span className="stat-card__value">{weeklyLabor.totalHours}</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {weeklySales > 0 && (isOverTarget || isUnderTarget) && (
        <div className={`labour-alert ${isOverTarget ? 'labour-alert--danger' : 'labour-alert--warning'}`}>
          <AlertTriangle size={20} />
          <div>
            {isOverTarget ? (
              <>
                <strong>Labour is {laborDiff.toFixed(1)}% above target.</strong> Your labour cost is ${weeklyLabor.totalCost.toLocaleString()} against ${weeklySales.toLocaleString()} in sales ({laborPercent.toFixed(1)}% vs {targetPercent}% target). Consider reducing scheduled hours or increasing sales.
              </>
            ) : (
              <>
                <strong>Labour is {Math.abs(laborDiff).toFixed(1)}% below target.</strong> You may be understaffed. Current labour is {laborPercent.toFixed(1)}% vs {targetPercent}% target.
              </>
            )}
          </div>
        </div>
      )}

      {weeklySales > 0 && isOnTarget && (
        <div className="labour-alert labour-alert--success">
          <CheckCircle size={20} />
          <div><strong>Labour is on target.</strong> Current labour efficiency is {laborPercent.toFixed(1)}%, within the target range of {targetPercent}%.</div>
        </div>
      )}

      <div className="labour-grid">
        {/* Daily Sales Breakdown */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title"><DollarSign size={18} /> Daily Sales</h2>
          </div>
          <div className="card__body">
            <div className="daily-sales">
              {dailySales.map((day) => (
                <div key={day.date} className="daily-sale-row">
                  <span className="daily-sale-day">{day.dayLabel}</span>
                  <span className="daily-sale-date">{day.date}</span>
                  <div className="daily-sale-bar-wrap">
                    <div className="daily-sale-bar" style={{ width: `${weeklySales > 0 ? (day.amount / (weeklySales / 3)) * 100 : 0}%` }} />
                  </div>
                  <span className="daily-sale-amount">${day.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Forecasting */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title"><TrendingUp size={18} /> Forecasting</h2>
          </div>
          <div className="card__body">
            <div className="forecast-section">
              <h3 className="forecast-label">Revenue Required for Current Labour</h3>
              <p className="forecast-desc">Based on your target of {targetPercent}% labour, you need:</p>
              <div className="forecast-value">${requiredRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <p className="forecast-desc">in weekly sales to sustain ${weeklyLabor.totalCost.toLocaleString()} in labour costs.</p>
            </div>

            <div className="forecast-section">
              <h3 className="forecast-label">Historical Avg Weekly Sales</h3>
              <div className="forecast-value">${avgWeeklySales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              {avgWeeklySales > 0 && (
                <div className={`forecast-indicator ${revenueDiff >= 0 ? 'forecast-indicator--good' : 'forecast-indicator--bad'}`}>
                  {revenueDiff >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                  <span>
                    {revenueDiff >= 0
                      ? `$${revenueDiff.toLocaleString(undefined, { maximumFractionDigits: 0 })} above required revenue`
                      : `$${Math.abs(revenueDiff).toLocaleString(undefined, { maximumFractionDigits: 0 })} below required revenue`
                    }
                  </span>
                </div>
              )}
            </div>

            <div className="forecast-section">
              <h3 className="forecast-label">4-Week History</h3>
              <div className="history-table">
                {historicalData.map((w, i) => (
                  <div key={i} className="history-row">
                    <span className="history-week">{format(w.weekStart, 'MMM d')}</span>
                    <span className="history-sales">${w.sales.toLocaleString()}</span>
                    <span className="history-labor">${w.labor.toLocaleString()}</span>
                    <span className={`history-pct ${w.percent > targetPercent + 2 ? 'history-pct--over' : w.percent > 0 ? 'history-pct--ok' : ''}`}>
                      {w.percent > 0 ? `${w.percent.toFixed(1)}%` : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSalesModal && (
        <div className="modal-overlay" onClick={() => setShowSalesModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Add Sales Data</h2>
              <button className="btn btn--icon" onClick={() => setShowSalesModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddSales}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={salesForm.date} onChange={(e) => setSalesForm({ ...salesForm, date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Sales Amount ($)</label>
                  <input type="number" className="form-input" value={salesForm.amount} onChange={(e) => setSalesForm({ ...salesForm, amount: e.target.value })} placeholder="3500" min="0" step="0.01" required />
                </div>
              </div>
              <div className="modal__footer">
                <div className="modal__footer-right">
                  <button type="button" className="btn btn--secondary" onClick={() => setShowSalesModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--primary">Save</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
