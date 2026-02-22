import { useState, useMemo } from 'react';
import { CreditCard, Check, Star, Zap, Building2, ArrowUpRight, Users, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/helpers';
import './Subscriptions.css';

const PLANS = [
  { id: 'basic', name: 'Basic', price: 29, period: 'month', features: ['Up to 10 employees', '1 location', 'Basic scheduling', 'Time clock', 'Email support'], icon: Star, color: '#64748b' },
  { id: 'professional', name: 'Professional', price: 79, period: 'month', features: ['Up to 50 employees', '3 locations', 'Advanced scheduling', 'Time clock + geofencing', 'Payroll integration', 'Reports & analytics', 'Priority support'], icon: Zap, color: '#2563eb', popular: true },
  { id: 'enterprise', name: 'Enterprise', price: 199, period: 'month', features: ['Unlimited employees', 'Unlimited locations', 'All features included', 'Custom integrations', 'API access', 'Dedicated account manager', '24/7 phone support', 'SLA guarantee'], icon: Building2, color: '#7c3aed' },
];

export default function Subscriptions() {
  const { state, dispatch } = useApp();
  const customers = state.customers || [];
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeCustomerId, setUpgradeCustomerId] = useState(null);

  const planDistribution = useMemo(() => {
    const dist = { basic: 0, professional: 0, enterprise: 0 };
    customers.forEach((c) => { if (dist[c.plan] !== undefined) dist[c.plan]++; });
    return dist;
  }, [customers]);

  const mrr = useMemo(() => {
    return customers.filter((c) => c.status === 'active').reduce((sum, c) => {
      const plan = PLANS.find((p) => p.id === c.plan);
      return sum + (plan?.price || 0);
    }, 0);
  }, [customers]);

  const handleUpgrade = (customerId, newPlan) => {
    dispatch({ type: 'UPDATE_CUSTOMER', payload: { id: customerId, plan: newPlan } });
    dispatch({ type: 'ADD_AUDIT_LOG', payload: { action: 'plan_change', entityType: 'customer', entityId: customerId, details: `Plan changed to ${newPlan}`, userId: state.currentUserId } });
    setShowUpgradeModal(false);
  };

  return (
    <div className="subscriptions-page">
      {/* MRR Overview */}
      <div className="sub-overview">
        <div className="sub-overview__card sub-overview__card--main">
          <CreditCard size={24} />
          <div>
            <div className="sub-overview__value">${mrr.toLocaleString()}</div>
            <div className="sub-overview__label">Monthly Recurring Revenue</div>
          </div>
        </div>
        <div className="sub-overview__card">
          <Users size={20} />
          <div>
            <div className="sub-overview__value">{customers.filter((c) => c.status === 'active').length}</div>
            <div className="sub-overview__label">Active Subscribers</div>
          </div>
        </div>
        <div className="sub-overview__card">
          <Calendar size={20} />
          <div>
            <div className="sub-overview__value">${(mrr * 12).toLocaleString()}</div>
            <div className="sub-overview__label">Projected ARR</div>
          </div>
        </div>
      </div>

      {/* Plans */}
      <h3 className="section-title">Plans</h3>
      <div className="plans-grid">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <div key={plan.id} className={`plan-card ${plan.popular ? 'plan-card--popular' : ''}`}>
              {plan.popular && <div className="plan-card__badge">Most Popular</div>}
              <div className="plan-card__icon" style={{ background: plan.color + '15', color: plan.color }}>
                <Icon size={24} />
              </div>
              <h3 className="plan-card__name">{plan.name}</h3>
              <div className="plan-card__price">
                <span className="plan-card__amount">${plan.price}</span>
                <span className="plan-card__period">/{plan.period}</span>
              </div>
              <ul className="plan-card__features">
                {plan.features.map((f, i) => (
                  <li key={i}><Check size={14} /> {f}</li>
                ))}
              </ul>
              <div className="plan-card__count">
                <span className="plan-card__count-value">{planDistribution[plan.id]}</span> customers
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Subscriptions Table */}
      <h3 className="section-title" style={{ marginTop: 32 }}>Customer Subscriptions</h3>
      <div className="sub-table-wrap">
        <table className="table sub-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Monthly</th>
              <th>Since</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-secondary">No customers yet. Add customers from the Customers page.</td></tr>
            ) : (
              customers.map((c) => {
                const plan = PLANS.find((p) => p.id === c.plan);
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="sub-customer">
                        <strong>{c.name}</strong>
                        {c.company && <span className="text-secondary"> ({c.company})</span>}
                      </div>
                    </td>
                    <td>
                      <span className="plan-tag" style={{ background: (plan?.color || '#64748b') + '15', color: plan?.color || '#64748b' }}>
                        {plan?.name || c.plan}
                      </span>
                    </td>
                    <td>
                      <span className={`status-dot status-dot--${c.status}`} />
                      {c.status}
                    </td>
                    <td className="sub-amount">${plan?.price || 0}</td>
                    <td>{formatDate(c.createdDate)}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setUpgradeCustomerId(c.id); setShowUpgradeModal(true); }}>
                        <ArrowUpRight size={14} /> Change Plan
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Change Plan</h2>
              <button className="btn-icon" onClick={() => setShowUpgradeModal(false)}>×</button>
            </div>
            <div className="modal__body">
              <p className="text-secondary" style={{ marginBottom: 16 }}>Select a new plan for {customers.find((c) => c.id === upgradeCustomerId)?.name}:</p>
              <div className="upgrade-options">
                {PLANS.map((plan) => {
                  const current = customers.find((c) => c.id === upgradeCustomerId)?.plan === plan.id;
                  return (
                    <div key={plan.id} className={`upgrade-option ${current ? 'upgrade-option--current' : ''}`} onClick={() => !current && handleUpgrade(upgradeCustomerId, plan.id)}>
                      <div className="upgrade-option__header">
                        <strong>{plan.name}</strong>
                        <span>${plan.price}/mo</span>
                      </div>
                      {current && <span className="upgrade-current-badge">Current Plan</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
