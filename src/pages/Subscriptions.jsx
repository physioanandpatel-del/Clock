import { useState, useMemo } from 'react';
import { CreditCard, Check, Star, Zap, Building2, ArrowUpRight, Users, Calendar, Settings, X, ToggleLeft, ToggleRight, MapPin, Shield, Palette, Code, DollarSign, Radar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/helpers';
import './Subscriptions.css';

const PLANS = [
  { id: 'basic', name: 'Basic', price: 29, period: 'month', features: ['Up to 10 employees', '1 location', 'Basic scheduling', 'Time clock', 'Email support'], icon: Star, color: '#64748b' },
  { id: 'professional', name: 'Professional', price: 79, period: 'month', features: ['Up to 50 employees', '3 locations', 'Advanced scheduling', 'Time clock + geofencing', 'Payroll integration', 'Reports & analytics', 'Priority support'], icon: Zap, color: '#2563eb', popular: true },
  { id: 'enterprise', name: 'Enterprise', price: 199, period: 'month', features: ['Unlimited employees', 'Unlimited locations', 'All features included', 'Custom integrations', 'API access', 'Dedicated account manager', '24/7 phone support', 'SLA guarantee'], icon: Building2, color: '#7c3aed' },
];

const FEATURE_DEFS = [
  { key: 'multiLocation', label: 'Multi-Location', icon: MapPin, type: 'toggle', description: 'Allow multiple locations' },
  { key: 'maxLocations', label: 'Max Locations', icon: MapPin, type: 'number', min: 1, max: 999, description: 'Maximum number of locations', dependsOn: 'multiLocation' },
  { key: 'maxEmployees', label: 'Max Employees', icon: Users, type: 'number', min: 1, max: 999, description: 'Maximum employee count' },
  { key: 'geofencing', label: 'Geofencing', icon: Radar, type: 'toggle', description: 'GPS-based clock in/out' },
  { key: 'payrollIntegration', label: 'Payroll Integration', icon: DollarSign, type: 'toggle', description: 'External payroll sync' },
  { key: 'apiAccess', label: 'API Access', icon: Code, type: 'toggle', description: 'REST API access' },
  { key: 'customBranding', label: 'Custom Branding', icon: Palette, type: 'toggle', description: 'Custom logo & colors' },
];

export default function Subscriptions() {
  const { state, dispatch } = useApp();
  const customers = state.customers || [];
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeCustomerId, setUpgradeCustomerId] = useState(null);
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [featuresCustomerId, setFeaturesCustomerId] = useState(null);

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
    // Auto-update features based on plan defaults
    const defaults = getDefaultFeatures(newPlan);
    dispatch({ type: 'UPDATE_CUSTOMER_FEATURES', payload: { id: customerId, features: defaults } });
    dispatch({ type: 'ADD_AUDIT_LOG', payload: { action: 'plan_change', entityType: 'customer', entityId: customerId, details: `Plan changed to ${newPlan}`, userId: state.currentUserId } });
    setShowUpgradeModal(false);
  };

  const featuresCustomer = customers.find((c) => c.id === featuresCustomerId);

  const handleFeatureToggle = (key, value) => {
    const updates = { [key]: value };
    // If disabling multi-location, reset maxLocations to 1
    if (key === 'multiLocation' && !value) {
      updates.maxLocations = 1;
    }
    // If enabling multi-location and maxLocations is 1, bump to plan default
    if (key === 'multiLocation' && value && featuresCustomer) {
      const currentMax = featuresCustomer.features?.maxLocations || 1;
      if (currentMax <= 1) {
        updates.maxLocations = featuresCustomer.plan === 'enterprise' ? 999 : featuresCustomer.plan === 'professional' ? 3 : 2;
      }
    }
    dispatch({ type: 'UPDATE_CUSTOMER_FEATURES', payload: { id: featuresCustomerId, features: updates } });
    dispatch({ type: 'ADD_AUDIT_LOG', payload: { action: 'feature_update', entityType: 'customer', entityId: featuresCustomerId, details: `Feature "${key}" updated to ${value}`, userId: state.currentUserId } });
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
              <th>Features</th>
              <th>Since</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-secondary">No customers yet. Add customers from the Customers page.</td></tr>
            ) : (
              customers.map((c) => {
                const plan = PLANS.find((p) => p.id === c.plan);
                const features = c.features || {};
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
                    <td>
                      <div className="sub-features-summary">
                        {features.multiLocation ? (
                          <span className="feature-pill feature-pill--on"><MapPin size={10} /> {features.maxLocations === 999 ? 'Unlimited' : features.maxLocations} loc</span>
                        ) : (
                          <span className="feature-pill feature-pill--off"><MapPin size={10} /> 1 loc</span>
                        )}
                        <span className="feature-pill">{features.maxEmployees === 999 ? 'Unlimited' : features.maxEmployees || 10} emp</span>
                      </div>
                    </td>
                    <td>{formatDate(c.createdDate)}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => { setUpgradeCustomerId(c.id); setShowUpgradeModal(true); }}>
                          <ArrowUpRight size={14} /> Plan
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setFeaturesCustomerId(c.id); setShowFeaturesModal(true); }}>
                          <Settings size={14} /> Features
                        </button>
                      </div>
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
              <button className="btn-icon" onClick={() => setShowUpgradeModal(false)}><X size={20} /></button>
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
              <p className="text-secondary" style={{ marginTop: 12, fontSize: 12 }}>Changing a plan will reset features to the plan defaults. You can customize features afterwards.</p>
            </div>
          </div>
        </div>
      )}

      {/* Features Modal */}
      {showFeaturesModal && featuresCustomer && (
        <div className="modal-overlay" onClick={() => setShowFeaturesModal(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Feature Controls</h2>
              <button className="btn-icon" onClick={() => setShowFeaturesModal(false)}><X size={20} /></button>
            </div>
            <div className="modal__body">
              <div className="features-modal-header">
                <div>
                  <strong>{featuresCustomer.name}</strong>
                  <span className="plan-tag" style={{ marginLeft: 8, background: (PLANS.find((p) => p.id === featuresCustomer.plan)?.color || '#64748b') + '15', color: PLANS.find((p) => p.id === featuresCustomer.plan)?.color || '#64748b' }}>
                    {PLANS.find((p) => p.id === featuresCustomer.plan)?.name || featuresCustomer.plan}
                  </span>
                </div>
              </div>
              <div className="features-list">
                {FEATURE_DEFS.map((feat) => {
                  const Icon = feat.icon;
                  const value = featuresCustomer.features?.[feat.key];
                  const disabled = feat.dependsOn && !featuresCustomer.features?.[feat.dependsOn];
                  return (
                    <div key={feat.key} className={`feature-row ${disabled ? 'feature-row--disabled' : ''}`}>
                      <div className="feature-row__info">
                        <Icon size={16} />
                        <div>
                          <div className="feature-row__label">{feat.label}</div>
                          <div className="feature-row__desc">{feat.description}</div>
                        </div>
                      </div>
                      <div className="feature-row__control">
                        {feat.type === 'toggle' ? (
                          <button
                            className={`feature-toggle ${value ? 'feature-toggle--on' : ''}`}
                            onClick={() => !disabled && handleFeatureToggle(feat.key, !value)}
                            disabled={disabled}
                          >
                            {value ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                            <span>{value ? 'On' : 'Off'}</span>
                          </button>
                        ) : feat.type === 'number' ? (
                          <div className="feature-number">
                            <input
                              type="number"
                              min={feat.min}
                              max={feat.max}
                              value={value || feat.min}
                              disabled={disabled}
                              onChange={(e) => {
                                const v = Math.max(feat.min, Math.min(feat.max, parseInt(e.target.value) || feat.min));
                                handleFeatureToggle(feat.key, v);
                              }}
                            />
                            {value >= 999 && <span className="feature-unlimited-badge">Unlimited</span>}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn-secondary" onClick={() => setShowFeaturesModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getDefaultFeatures(plan) {
  switch (plan) {
    case 'enterprise':
      return { multiLocation: true, maxLocations: 999, maxEmployees: 999, geofencing: true, payrollIntegration: true, apiAccess: true, customBranding: true };
    case 'professional':
      return { multiLocation: true, maxLocations: 3, maxEmployees: 50, geofencing: true, payrollIntegration: true, apiAccess: false, customBranding: false };
    default:
      return { multiLocation: false, maxLocations: 1, maxEmployees: 10, geofencing: false, payrollIntegration: false, apiAccess: false, customBranding: false };
  }
}
