import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TrendingUp, Plus, X, AlertTriangle, CheckCircle, ArrowUp, ArrowDown, DollarSign, BarChart3, Target, Calendar, Eye, Edit2, Trash2, Zap } from 'lucide-react';
import { format, subDays, parseISO, isWithinInterval, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, differenceInDays } from 'date-fns';
import { getHoursWorked, getInitials, getEffectiveRate } from '../utils/helpers';
import TimeframeSelector, { calculateRange } from '../components/TimeframeSelector';
import './Labour.css';

export default function Labour() {
  const { state, dispatch } = useApp();
  const { employees, shifts, salesEntries, locations, currentLocationId } = state;

  const currentLocation = locations.find((l) => l.id === currentLocationId);
  const targetPercent = currentLocation?.targetLaborPercent || 30;
  const budgetWarning = currentLocation?.laborBudgetWarning ?? targetPercent;
  const budgetMax = currentLocation?.laborBudgetMax ?? targetPercent + 5;

  const locationEmployees = useMemo(() => employees.filter((e) => (e.locationIds || [e.locationId]).includes(currentLocationId)), [employees, currentLocationId]);
  const locationEmpIds = useMemo(() => new Set(locationEmployees.map((e) => e.id)), [locationEmployees]);

  const [timeframe, setTimeframe] = useState(() => {
    const range = calculateRange('weekly');
    return { preset: 'weekly', startDate: format(range.start, 'yyyy-MM-dd'), endDate: format(range.end, 'yyyy-MM-dd') };
  });
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [salesModalMode, setSalesModalMode] = useState('single'); // 'single' | 'bulk' | 'projected'
  const [salesForm, setSalesForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), amount: '' });
  const [bulkSales, setBulkSales] = useState({});
  const [projectedSales, setProjectedSales] = useState({});
  const [projectionRule, setProjectionRule] = useState('historical_avg');
  const [projectionAdjustment, setProjectionAdjustment] = useState(20);

  const rangeStart = parseISO(timeframe.startDate);
  const rangeEnd = parseISO(timeframe.endDate);
  const rangeDaysCount = Math.max(1, differenceInDays(rangeEnd, rangeStart) + 1);
  const rangeDaysList = useMemo(() => Array.from({ length: rangeDaysCount }, (_, i) => addDays(rangeStart, i)), [rangeStart, rangeDaysCount]);

  // Calculate weekly labour cost
  const weeklyLabor = useMemo(() => {
    const weekShifts = shifts.filter((s) => {
      if (!locationEmpIds.has(s.employeeId)) return false;
      const d = parseISO(s.start);
      return isWithinInterval(d, { start: rangeStart, end: rangeEnd });
    });
    let totalCost = 0;
    let totalHours = 0;
    const byEmployee = {};
    weekShifts.forEach((s) => {
      const emp = locationEmployees.find((e) => e.id === s.employeeId);
      if (emp) {
        const hrs = getHoursWorked(s.start, s.end);
        const rate = getEffectiveRate(emp, s.position);
        totalHours += hrs;
        totalCost += hrs * rate;
        if (!byEmployee[emp.id]) byEmployee[emp.id] = { hours: 0, cost: 0, name: emp.preferredName || emp.name, rate };
        byEmployee[emp.id].hours += hrs;
        byEmployee[emp.id].cost += hrs * rate;
      }
    });
    return { totalCost, totalHours, shiftCount: weekShifts.length, byEmployee };
  }, [shifts, locationEmpIds, locationEmployees, rangeStart, rangeEnd]);

  // Weekly actual sales
  const weeklySalesActual = useMemo(() => {
    return salesEntries
      .filter((s) => s.locationId === currentLocationId && (s.type || 'actual') === 'actual')
      .filter((s) => { const d = parseISO(s.date); return isWithinInterval(d, { start: rangeStart, end: rangeEnd }); })
      .reduce((sum, s) => sum + s.amount, 0);
  }, [salesEntries, currentLocationId, rangeStart, rangeEnd]);

  // Weekly projected sales
  const weeklySalesProjected = useMemo(() => {
    return salesEntries
      .filter((s) => s.locationId === currentLocationId && s.type === 'projected')
      .filter((s) => { const d = parseISO(s.date); return isWithinInterval(d, { start: rangeStart, end: rangeEnd }); })
      .reduce((sum, s) => sum + s.amount, 0);
  }, [salesEntries, currentLocationId, rangeStart, rangeEnd]);

  // Use actual if available, otherwise projected
  const effectiveSales = weeklySalesActual || weeklySalesProjected;
  const isUsingProjected = weeklySalesActual === 0 && weeklySalesProjected > 0;

  const laborPercentActual = weeklySalesActual > 0 ? (weeklyLabor.totalCost / weeklySalesActual) * 100 : 0;
  const laborPercentProjected = weeklySalesProjected > 0 ? (weeklyLabor.totalCost / weeklySalesProjected) * 100 : 0;
  const laborPercent = effectiveSales > 0 ? (weeklyLabor.totalCost / effectiveSales) * 100 : 0;

  const laborDiff = laborPercent - targetPercent;
  const isOverBudgetMax = laborPercent >= budgetMax;
  const isOverTarget = isOverBudgetMax || laborDiff > 2;
  const isUnderTarget = laborDiff < -5;
  const isOnTarget = !isOverTarget && !isUnderTarget && effectiveSales > 0;

  // Historical data (last 8 weeks)
  const historicalData = useMemo(() => {
    const weeks = [];
    for (let w = 1; w <= 8; w++) {
      const ws = subWeeks(rangeStart, w);
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      const actual = salesEntries
        .filter((s) => s.locationId === currentLocationId && (s.type || 'actual') === 'actual')
        .filter((s) => { const d = parseISO(s.date); return isWithinInterval(d, { start: ws, end: we }); })
        .reduce((sum, s) => sum + s.amount, 0);
      const projected = salesEntries
        .filter((s) => s.locationId === currentLocationId && s.type === 'projected')
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
        if (emp) labor += getHoursWorked(s.start, s.end) * getEffectiveRate(emp, s.position);
      });
      const sales = actual || projected;
      const pct = sales > 0 ? (labor / sales) * 100 : 0;
      const accuracy = actual > 0 && projected > 0 ? ((actual / projected) * 100).toFixed(0) : null;
      weeks.push({ weekStart: ws, actual, projected, labor, percent: pct, accuracy });
    }
    return weeks;
  }, [salesEntries, shifts, currentLocationId, locationEmpIds, locationEmployees, rangeStart]);

  // Averages
  const avgWeeklySales = useMemo(() => {
    const totals = historicalData.filter((w) => w.actual > 0);
    return totals.length > 0 ? totals.reduce((s, w) => s + w.actual, 0) / totals.length : 0;
  }, [historicalData]);

  const avgLabourPct = useMemo(() => {
    const totals = historicalData.filter((w) => w.percent > 0);
    return totals.length > 0 ? totals.reduce((s, w) => s + w.percent, 0) / totals.length : 0;
  }, [historicalData]);

  const requiredRevenue = targetPercent > 0 ? (weeklyLabor.totalCost / targetPercent) * 100 : 0;

  // Daily sales breakdown (both actual and projected)
  const dailySales = useMemo(() => {
    return rangeDaysList.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const actual = salesEntries.find((s) => s.locationId === currentLocationId && s.date === dateStr && (s.type || 'actual') === 'actual');
      const projected = salesEntries.find((s) => s.locationId === currentLocationId && s.date === dateStr && s.type === 'projected');
      return { date: dateStr, dayLabel: format(day, 'EEE'), actual: actual?.amount || 0, projected: projected?.amount || 0, actualId: actual?.id, projectedId: projected?.id };
    });
  }, [salesEntries, currentLocationId, rangeDaysList]);

  // Maximum daily amount for bar scaling
  const maxDailyAmount = Math.max(...dailySales.map((d) => Math.max(d.actual, d.projected)), 1);

  // Employee labour breakdown
  const topEmployees = useMemo(() => {
    return Object.values(weeklyLabor.byEmployee)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 8);
  }, [weeklyLabor.byEmployee]);

  // --- Sales Modal Handlers ---

  function openSingleSales() {
    setSalesModalMode('single');
    setSalesForm({ date: format(new Date(), 'yyyy-MM-dd'), amount: '' });
    setShowSalesModal(true);
  }

  function openBulkSales() {
    setSalesModalMode('bulk');
    const initial = {};
    rangeDaysList.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const existing = salesEntries.find((s) => s.locationId === currentLocationId && s.date === dateStr && (s.type || 'actual') === 'actual');
      initial[dateStr] = existing ? String(existing.amount) : '';
    });
    setBulkSales(initial);
    setShowSalesModal(true);
  }

  function openProjectedSales() {
    setSalesModalMode('projected');
    const initial = {};
    rangeDaysList.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const existing = salesEntries.find((s) => s.locationId === currentLocationId && s.date === dateStr && s.type === 'projected');
      initial[dateStr] = existing ? String(existing.amount) : '';
    });
    setProjectedSales(initial);
    setShowSalesModal(true);
  }

  function handleSingleSave(e) {
    e.preventDefault();
    const existing = salesEntries.find((s) => s.locationId === currentLocationId && s.date === salesForm.date && (s.type || 'actual') === 'actual');
    if (existing) {
      dispatch({ type: 'UPDATE_SALES_ENTRY', payload: { id: existing.id, amount: Number(salesForm.amount) } });
    } else {
      dispatch({ type: 'ADD_SALES_ENTRY', payload: { locationId: currentLocationId, date: salesForm.date, amount: Number(salesForm.amount), type: 'actual' } });
    }
    setShowSalesModal(false);
  }

  function handleBulkSave() {
    const entries = Object.entries(bulkSales)
      .filter(([, amount]) => amount !== '' && Number(amount) >= 0)
      .map(([date, amount]) => ({ locationId: currentLocationId, date, amount: Number(amount), type: 'actual' }));
    if (entries.length > 0) {
      dispatch({ type: 'BULK_UPDATE_SALES', payload: entries });
    }
    setShowSalesModal(false);
  }

  function handleProjectedSave() {
    const entries = Object.entries(projectedSales)
      .filter(([, amount]) => amount !== '' && Number(amount) >= 0)
      .map(([date, amount]) => ({ locationId: currentLocationId, date, amount: Number(amount), type: 'projected' }));
    if (entries.length > 0) {
      dispatch({ type: 'BULK_UPDATE_SALES', payload: entries });
    }
    setShowSalesModal(false);
  }

  function getDayOfWeekAverages() {
    const dayAvg = {};
    historicalData.forEach((week) => {
      for (let d = 0; d < 7; d++) {
        const dayDate = format(addDays(week.weekStart, d), 'yyyy-MM-dd');
        const entry = salesEntries.find((s) => s.locationId === currentLocationId && s.date === dayDate && (s.type || 'actual') === 'actual');
        if (entry) {
          const dow = addDays(week.weekStart, d).getDay();
          if (!dayAvg[dow]) dayAvg[dow] = [];
          dayAvg[dow].push(entry.amount);
        }
      }
    });
    return dayAvg;
  }

  function autofillProjected() {
    const adjustment = projectionRule.endsWith('_adj') ? 1 + (projectionAdjustment / 100) : 1;
    const filled = {};

    if (projectionRule === 'historical_avg' || projectionRule === 'historical_avg_adj') {
      if (avgWeeklySales <= 0) return;
      const dayAvg = getDayOfWeekAverages();
      rangeDaysList.forEach((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dow = day.getDay();
        let amount = (dayAvg[dow] && dayAvg[dow].length > 0)
          ? dayAvg[dow].reduce((a, b) => a + b, 0) / dayAvg[dow].length
          : avgWeeklySales / 7;
        filled[dateStr] = String(Math.round(amount * adjustment));
      });
    } else if (projectionRule === 'last_year' || projectionRule === 'last_year_adj') {
      const dayAvg = getDayOfWeekAverages();
      rangeDaysList.forEach((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const lastYearDate = format(subWeeks(day, 52), 'yyyy-MM-dd');
        const entry = salesEntries.find((s) => s.locationId === currentLocationId && s.date === lastYearDate && (s.type || 'actual') === 'actual');
        let amount;
        if (entry) {
          amount = entry.amount;
        } else {
          // Fallback to day-of-week average if no last year data
          const dow = day.getDay();
          amount = (dayAvg[dow] && dayAvg[dow].length > 0)
            ? dayAvg[dow].reduce((a, b) => a + b, 0) / dayAvg[dow].length
            : (avgWeeklySales > 0 ? avgWeeklySales / 7 : 0);
        }
        filled[dateStr] = String(Math.round(amount * adjustment));
      });
    } else if (projectionRule === 'last_week' || projectionRule === 'last_week_adj') {
      const dayAvg = getDayOfWeekAverages();
      rangeDaysList.forEach((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const lastWeekDate = format(subWeeks(day, 1), 'yyyy-MM-dd');
        const entry = salesEntries.find((s) => s.locationId === currentLocationId && s.date === lastWeekDate && (s.type || 'actual') === 'actual');
        let amount;
        if (entry) {
          amount = entry.amount;
        } else {
          const dow = day.getDay();
          amount = (dayAvg[dow] && dayAvg[dow].length > 0)
            ? dayAvg[dow].reduce((a, b) => a + b, 0) / dayAvg[dow].length : 0;
        }
        filled[dateStr] = String(Math.round(amount * adjustment));
      });
    }
    setProjectedSales(filled);
  }

  const bulkTotal = Object.values(bulkSales).reduce((s, v) => s + (Number(v) || 0), 0);
  const projectedTotal = Object.values(projectedSales).reduce((s, v) => s + (Number(v) || 0), 0);
  const projectedLaborPct = projectedTotal > 0 ? (weeklyLabor.totalCost / projectedTotal) * 100 : 0;

  return (
    <div className="labour-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Labour & Sales</h1>
          <p className="page-subtitle">Track sales, manage projections, and optimize labour costs</p>
        </div>
        <div className="labour-actions">
          <button className="btn btn--secondary" onClick={openBulkSales}>
            <Edit2 size={14} /> Enter Week Sales
          </button>
          <button className="btn btn--primary" onClick={openProjectedSales}>
            <Zap size={14} /> Set Projected Sales
          </button>
        </div>
      </div>

      <TimeframeSelector value={timeframe} onChange={setTimeframe} />

      {/* Summary Cards */}
      <div className="labour-summary">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue"><DollarSign size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__label">Actual Sales</span>
            <span className="stat-card__value">${weeklySalesActual.toLocaleString()}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--cyan"><Zap size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__label">Projected Sales</span>
            <span className="stat-card__value">${weeklySalesProjected.toLocaleString()}</span>
            {weeklySalesActual > 0 && weeklySalesProjected > 0 && (
              <span className="stat-card__sub">{((weeklySalesActual / weeklySalesProjected) * 100).toFixed(0)}% of projection</span>
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple"><DollarSign size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__label">Labour Cost</span>
            <span className="stat-card__value">${weeklyLabor.totalCost.toLocaleString()}</span>
            <span className="stat-card__sub">{weeklyLabor.totalHours}h across {weeklyLabor.shiftCount} shifts</span>
          </div>
        </div>
        <div className={`stat-card ${isOverTarget ? 'stat-card--danger' : isOnTarget ? 'stat-card--success' : ''}`}>
          <div className={`stat-card__icon ${isOverTarget ? 'stat-card__icon--red' : isOnTarget ? 'stat-card__icon--green' : 'stat-card__icon--orange'}`}>
            <Target size={22} />
          </div>
          <div className="stat-card__info">
            <span className="stat-card__label">
              Labour %{isUsingProjected ? ' (vs Projected)' : ''} &middot; Target: {targetPercent}%
            </span>
            <span className="stat-card__value">{laborPercent.toFixed(1)}%</span>
            {isUsingProjected && <span className="stat-card__sub stat-card__sub--projected">Using projected sales</span>}
          </div>
        </div>
      </div>

      {/* Dual Labour % comparison */}
      {weeklySalesActual > 0 && weeklySalesProjected > 0 && (
        <div className="labour-comparison-bar">
          <div className="comparison-item">
            <span className="comparison-label">Labour % vs Actual Sales</span>
            <span className={`comparison-value ${laborPercentActual > budgetMax ? 'comparison-value--danger' : laborPercentActual > budgetWarning ? 'comparison-value--warning' : 'comparison-value--ok'}`}>
              {laborPercentActual.toFixed(1)}%
            </span>
            <div className="comparison-bar-track">
              <div className="comparison-bar-fill comparison-bar-fill--actual" style={{ width: `${Math.min(100, (laborPercentActual / (budgetMax + 5)) * 100)}%` }} />
              <div className="comparison-bar-target" style={{ left: `${(targetPercent / (budgetMax + 5)) * 100}%` }} />
              <div className="comparison-bar-max" style={{ left: `${(budgetMax / (budgetMax + 5)) * 100}%` }} />
            </div>
          </div>
          <div className="comparison-item">
            <span className="comparison-label">Labour % vs Projected Sales</span>
            <span className={`comparison-value ${laborPercentProjected > budgetMax ? 'comparison-value--danger' : laborPercentProjected > budgetWarning ? 'comparison-value--warning' : 'comparison-value--ok'}`}>
              {laborPercentProjected.toFixed(1)}%
            </span>
            <div className="comparison-bar-track">
              <div className="comparison-bar-fill comparison-bar-fill--projected" style={{ width: `${Math.min(100, (laborPercentProjected / (budgetMax + 5)) * 100)}%` }} />
              <div className="comparison-bar-target" style={{ left: `${(targetPercent / (budgetMax + 5)) * 100}%` }} />
              <div className="comparison-bar-max" style={{ left: `${(budgetMax / (budgetMax + 5)) * 100}%` }} />
            </div>
          </div>
          <div className="comparison-legend">
            <span className="legend-item"><span className="legend-dot legend-dot--target" /> Target {targetPercent}%</span>
            <span className="legend-item"><span className="legend-dot legend-dot--max" /> Max {budgetMax}%</span>
          </div>
        </div>
      )}

      {/* Alerts */}
      {effectiveSales > 0 && (isOverTarget || isUnderTarget) && (
        <div className={`labour-alert ${isOverTarget ? 'labour-alert--danger' : 'labour-alert--warning'}`}>
          <AlertTriangle size={20} />
          <div>
            {isOverTarget ? (
              <>
                <strong>Labour is {laborDiff.toFixed(1)}% above target{isOverBudgetMax ? ` (exceeds ${budgetMax}% max)` : ''}.</strong>{' '}
                ${weeklyLabor.totalCost.toLocaleString()} labour / ${effectiveSales.toLocaleString()} {isUsingProjected ? 'projected ' : ''}sales = {laborPercent.toFixed(1)}%
                {isOverBudgetMax ? '. Scheduling blocked until reduced.' : '. Reduce hours or increase sales.'}
              </>
            ) : (
              <>
                <strong>Labour is {Math.abs(laborDiff).toFixed(1)}% below target.</strong> You may be understaffed ({laborPercent.toFixed(1)}% vs {targetPercent}% target).
              </>
            )}
          </div>
        </div>
      )}

      {isOnTarget && (
        <div className="labour-alert labour-alert--success">
          <CheckCircle size={20} />
          <div><strong>Labour is on target.</strong> {laborPercent.toFixed(1)}% is within the {targetPercent}% goal{isUsingProjected ? ' (based on projected sales)' : ''}.</div>
        </div>
      )}

      <div className="labour-grid">
        {/* Daily Sales Breakdown - Actual vs Projected */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title"><DollarSign size={18} /> Daily Sales: Actual vs Projected</h2>
            <button className="btn btn--secondary btn--sm" onClick={openSingleSales}><Plus size={12} /> Add</button>
          </div>
          <div className="card__body">
            <div className="daily-sales">
              <div className="daily-sales-header">
                <span className="dsh-day">Day</span>
                <span className="dsh-bars">Sales</span>
                <span className="dsh-actual">Actual</span>
                <span className="dsh-projected">Projected</span>
              </div>
              {dailySales.map((day) => (
                <div key={day.date} className="daily-sale-row">
                  <div className="daily-sale-left">
                    <span className="daily-sale-day">{day.dayLabel}</span>
                  </div>
                  <div className="daily-sale-bars">
                    {day.actual > 0 && (
                      <div className="daily-bar daily-bar--actual" style={{ width: `${(day.actual / maxDailyAmount) * 100}%` }}>
                        <span className="daily-bar-label">${day.actual.toLocaleString()}</span>
                      </div>
                    )}
                    {day.projected > 0 && (
                      <div className="daily-bar daily-bar--projected" style={{ width: `${(day.projected / maxDailyAmount) * 100}%` }}>
                        <span className="daily-bar-label">${day.projected.toLocaleString()}</span>
                      </div>
                    )}
                    {day.actual === 0 && day.projected === 0 && (
                      <span className="daily-sale-empty">—</span>
                    )}
                  </div>
                  <span className="daily-sale-actual">{day.actual > 0 ? `$${day.actual.toLocaleString()}` : '—'}</span>
                  <span className="daily-sale-projected">{day.projected > 0 ? `$${day.projected.toLocaleString()}` : '—'}</span>
                </div>
              ))}
              <div className="daily-sale-row daily-sale-row--total">
                <div className="daily-sale-left">
                  <span className="daily-sale-day">Total</span>
                </div>
                <div className="daily-sale-bars" />
                <span className="daily-sale-actual daily-sale-total">${weeklySalesActual.toLocaleString()}</span>
                <span className="daily-sale-projected daily-sale-total">${weeklySalesProjected.toLocaleString()}</span>
              </div>
            </div>
            <div className="daily-sales-legend">
              <span className="legend-item"><span className="legend-dot legend-dot--actual" /> Actual</span>
              <span className="legend-item"><span className="legend-dot legend-dot--projected-fill" /> Projected</span>
            </div>
          </div>
        </div>

        {/* Forecasting & Analysis */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title"><TrendingUp size={18} /> Forecasting & Analysis</h2>
          </div>
          <div className="card__body">
            {/* Revenue Required */}
            <div className="forecast-section">
              <h3 className="forecast-label">Revenue Required for Current Labour</h3>
              <p className="forecast-desc">To hit {targetPercent}% target with ${weeklyLabor.totalCost.toLocaleString()} in labour:</p>
              <div className="forecast-value">${requiredRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              {weeklySalesProjected > 0 && (
                <div className={`forecast-indicator ${weeklySalesProjected >= requiredRevenue ? 'forecast-indicator--good' : 'forecast-indicator--bad'}`}>
                  {weeklySalesProjected >= requiredRevenue ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                  <span>
                    Projected sales ${weeklySalesProjected >= requiredRevenue ? 'covers' : 'falls short of'} required revenue by ${Math.abs(weeklySalesProjected - requiredRevenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
              {avgWeeklySales > 0 && (
                <div className={`forecast-indicator ${avgWeeklySales >= requiredRevenue ? 'forecast-indicator--good' : 'forecast-indicator--bad'}`}>
                  {avgWeeklySales >= requiredRevenue ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                  <span>
                    Avg historical (${avgWeeklySales.toLocaleString(undefined, { maximumFractionDigits: 0 })}) is ${Math.abs(avgWeeklySales - requiredRevenue).toLocaleString(undefined, { maximumFractionDigits: 0 })} {avgWeeklySales >= requiredRevenue ? 'above' : 'below'}
                  </span>
                </div>
              )}
            </div>

            {/* Key Metrics */}
            <div className="forecast-section">
              <h3 className="forecast-label">Key Metrics</h3>
              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="metric-value">${avgWeeklySales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span className="metric-label">Avg Weekly Sales (8wk)</span>
                </div>
                <div className="metric-card">
                  <span className="metric-value">{avgLabourPct.toFixed(1)}%</span>
                  <span className="metric-label">Avg Labour % (8wk)</span>
                </div>
                <div className="metric-card">
                  <span className="metric-value">{weeklyLabor.totalHours}h</span>
                  <span className="metric-label">Total Hours</span>
                </div>
                <div className="metric-card">
                  <span className="metric-value">${weeklyLabor.totalHours > 0 ? (weeklyLabor.totalCost / weeklyLabor.totalHours).toFixed(2) : '0'}</span>
                  <span className="metric-label">Avg $/Hour</span>
                </div>
              </div>
            </div>

            {/* Labour by Employee */}
            {topEmployees.length > 0 && (
              <div className="forecast-section">
                <h3 className="forecast-label">Labour Cost by Employee</h3>
                <div className="emp-labour-list">
                  {topEmployees.map((emp, i) => (
                    <div key={i} className="emp-labour-row">
                      <span className="emp-labour-name">{emp.name}</span>
                      <span className="emp-labour-hours">{emp.hours}h</span>
                      <div className="emp-labour-bar-wrap">
                        <div className="emp-labour-bar" style={{ width: `${(emp.cost / (topEmployees[0]?.cost || 1)) * 100}%` }} />
                      </div>
                      <span className="emp-labour-cost">${emp.cost.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historical Trends */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card__header">
          <h2 className="card__title"><BarChart3 size={18} /> 8-Week History</h2>
        </div>
        <div className="card__body">
          <div className="history-table">
            <div className="history-row history-row--header">
              <span className="history-week">Week</span>
              <span className="history-actual">Actual Sales</span>
              <span className="history-projected-col">Projected</span>
              <span className="history-accuracy">Accuracy</span>
              <span className="history-labor">Labour Cost</span>
              <span className="history-pct">Labour %</span>
            </div>
            {historicalData.map((w, i) => (
              <div key={i} className="history-row">
                <span className="history-week">{format(w.weekStart, 'MMM d')}</span>
                <span className="history-actual">{w.actual > 0 ? `$${w.actual.toLocaleString()}` : '—'}</span>
                <span className="history-projected-col">{w.projected > 0 ? `$${w.projected.toLocaleString()}` : '—'}</span>
                <span className={`history-accuracy ${w.accuracy ? (Number(w.accuracy) >= 95 && Number(w.accuracy) <= 105 ? 'history-accuracy--good' : 'history-accuracy--off') : ''}`}>
                  {w.accuracy ? `${w.accuracy}%` : '—'}
                </span>
                <span className="history-labor">{w.labor > 0 ? `$${w.labor.toLocaleString()}` : '—'}</span>
                <span className={`history-pct ${w.percent > targetPercent + 2 ? 'history-pct--over' : w.percent > 0 ? 'history-pct--ok' : ''}`}>
                  {w.percent > 0 ? `${w.percent.toFixed(1)}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== SALES MODALS ===== */}
      {showSalesModal && (
        <div className="modal-overlay" onClick={() => setShowSalesModal(false)}>
          <div className={`modal ${salesModalMode !== 'single' ? 'modal--wide' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">
                {salesModalMode === 'single' && 'Add Sales Entry'}
                {salesModalMode === 'bulk' && 'Enter Weekly Sales (Actual)'}
                {salesModalMode === 'projected' && 'Set Projected Sales'}
              </h2>
              <button className="btn btn--icon" onClick={() => setShowSalesModal(false)}><X size={18} /></button>
            </div>

            {/* Single Entry */}
            {salesModalMode === 'single' && (
              <form onSubmit={handleSingleSave}>
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
            )}

            {/* Bulk Weekly Entry */}
            {salesModalMode === 'bulk' && (
              <>
                <div className="modal__body">
                  <p className="modal__desc">Enter actual sales for each day ({format(rangeStart, 'MMM d')} - {format(rangeEnd, 'MMM d')}).</p>
                  <div className="bulk-sales-grid">
                    {rangeDaysList.map((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      return (
                        <div key={dateStr} className="bulk-sales-row">
                          <span className="bulk-sales-day">{format(day, 'EEEE')}</span>
                          <span className="bulk-sales-date">{format(day, 'MMM d')}</span>
                          <div className="bulk-sales-input-wrap">
                            <span className="bulk-sales-dollar">$</span>
                            <input type="number" className="form-input bulk-sales-input" value={bulkSales[dateStr] || ''} onChange={(e) => setBulkSales({ ...bulkSales, [dateStr]: e.target.value })} placeholder="0" min="0" step="0.01" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="bulk-sales-total">
                    <span>Week Total:</span>
                    <strong>${bulkTotal.toLocaleString()}</strong>
                    {bulkTotal > 0 && weeklyLabor.totalCost > 0 && (
                      <span className={`bulk-labor-pct ${(weeklyLabor.totalCost / bulkTotal) * 100 > budgetMax ? 'bulk-labor-pct--danger' : (weeklyLabor.totalCost / bulkTotal) * 100 <= targetPercent + 2 ? 'bulk-labor-pct--ok' : 'bulk-labor-pct--warning'}`}>
                        Labour: {((weeklyLabor.totalCost / bulkTotal) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="modal__footer">
                  <div className="modal__footer-right">
                    <button type="button" className="btn btn--secondary" onClick={() => setShowSalesModal(false)}>Cancel</button>
                    <button type="button" className="btn btn--primary" onClick={handleBulkSave}>Save Actual Sales</button>
                  </div>
                </div>
              </>
            )}

            {/* Projected Sales */}
            {salesModalMode === 'projected' && (
              <>
                <div className="modal__body">
                  <p className="modal__desc">Set projected/estimated sales for each day. These are used to calculate expected labour % when scheduling.</p>
                  <div className="bulk-sales-grid">
                    {rangeDaysList.map((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      return (
                        <div key={dateStr} className="bulk-sales-row">
                          <span className="bulk-sales-day">{format(day, 'EEEE')}</span>
                          <span className="bulk-sales-date">{format(day, 'MMM d')}</span>
                          <div className="bulk-sales-input-wrap">
                            <span className="bulk-sales-dollar">$</span>
                            <input type="number" className="form-input bulk-sales-input" value={projectedSales[dateStr] || ''} onChange={(e) => setProjectedSales({ ...projectedSales, [dateStr]: e.target.value })} placeholder="0" min="0" step="0.01" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="bulk-sales-total">
                    <span>Projected Total:</span>
                    <strong>${projectedTotal.toLocaleString()}</strong>
                    {projectedTotal > 0 && weeklyLabor.totalCost > 0 && (
                      <span className={`bulk-labor-pct ${projectedLaborPct > budgetMax ? 'bulk-labor-pct--danger' : projectedLaborPct <= targetPercent + 2 ? 'bulk-labor-pct--ok' : 'bulk-labor-pct--warning'}`}>
                        Projected Labour: {projectedLaborPct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="projection-rules">
                    <h4 className="projection-rules__title">Auto-fill Projections</h4>
                    <div className="projection-rules__row">
                      <select className="form-input projection-rules__select" value={projectionRule} onChange={(e) => setProjectionRule(e.target.value)}>
                        <option value="historical_avg">Historical Average (8-week)</option>
                        <option value="historical_avg_adj">Historical Average + Adjustment %</option>
                        <option value="last_week">Last Week's Sales</option>
                        <option value="last_week_adj">Last Week + Adjustment %</option>
                        <option value="last_year">Same Period Last Year</option>
                        <option value="last_year_adj">Same Period Last Year + Adjustment %</option>
                      </select>
                      {projectionRule.endsWith('_adj') && (
                        <div className="projection-adj-wrap">
                          <input type="number" className="form-input projection-adj-input" value={projectionAdjustment} onChange={(e) => setProjectionAdjustment(Number(e.target.value))} />
                          <span className="projection-adj-label">%</span>
                        </div>
                      )}
                      <button type="button" className="btn btn--secondary btn--sm" onClick={autofillProjected}>
                        <Zap size={12} /> Apply
                      </button>
                    </div>
                    {projectionRule.endsWith('_adj') && (
                      <p className="projection-rules__hint">
                        {projectionAdjustment > 0 ? '+' : ''}{projectionAdjustment}% adjustment to{' '}
                        {projectionRule.startsWith('last_year') ? "last year's" : projectionRule.startsWith('last_week') ? "last week's" : 'historical average'} sales
                      </p>
                    )}
                    {projectionRule.startsWith('last_year') && (
                      <p className="projection-rules__hint projection-rules__hint--info">
                        Uses sales from 52 weeks ago. Falls back to historical average if no data.
                      </p>
                    )}
                  </div>
                </div>
                <div className="modal__footer">
                  <div className="modal__footer-right">
                    <button type="button" className="btn btn--secondary" onClick={() => setShowSalesModal(false)}>Cancel</button>
                    <button type="button" className="btn btn--primary" onClick={handleProjectedSave}>Save Projections</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
