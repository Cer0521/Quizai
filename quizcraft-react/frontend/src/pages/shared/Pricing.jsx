import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api';
import './Pricing.css';

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState({});

  const tiers = [
    {
      name: 'Free',
      price: '$0',
      period: '/forever',
      description: 'Perfect for getting started',
      features: [
        '5 quizzes per 2 weeks',
        'Basic question types',
        'Manual grading only',
        'Limited analytics',
        'Community support'
      ],
      cta: 'Get Started',
      highlighted: false,
      tier_id: 'free'
    },
    {
      name: 'Premium',
      price: '$9.99',
      period: '/month',
      description: 'For active educators',
      features: [
        'Unlimited quizzes',
        'All question types',
        'AI-powered grading',
        'Advanced analytics',
        'Email support',
        'Sharable quiz links',
        'Student photo capture',
        'Custom branding'
      ],
      cta: 'Upgrade to Premium',
      highlighted: true,
      tier_id: 'premium'
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For institutions',
      features: [
        'Everything in Premium',
        'Referral program',
        'API access',
        'Custom integrations',
        'Dedicated support',
        'SSO/SAML',
        'Advanced reporting',
        'Priority features'
      ],
      cta: 'Contact Sales',
      highlighted: false,
      tier_id: 'enterprise'
    }
  ];

  const handleUpgrade = async (tierId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (tierId === 'free') {
      navigate('/teacher/dashboard');
      return;
    }

    setLoading(prev => ({ ...prev, [tierId]: true }));
    try {
      const { data } = await api.post('/api/subscriptions/create-checkout', {
        tier: tierId
      });
      
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, [tierId]: false }));
    }
  };

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1>Simple, Transparent Pricing</h1>
        <p>Choose the plan that works for you</p>
      </div>

      <div className="pricing-grid">
        {tiers.map(tier => (
          <div key={tier.tier_id} className={`pricing-card ${tier.highlighted ? 'highlighted' : ''}`}>
            {tier.highlighted && <div className="badge">Most Popular</div>}
            
            <h3 className="tier-name">{tier.name}</h3>
            <div className="price">
              <span className="amount">{tier.price}</span>
              <span className="period">{tier.period}</span>
            </div>
            <p className="tier-description">{tier.description}</p>

            <button
              onClick={() => handleUpgrade(tier.tier_id)}
              disabled={loading[tier.tier_id]}
              className={`cta-button ${tier.highlighted ? 'primary' : 'secondary'}`}
            >
              {loading[tier.tier_id] ? 'Loading...' : tier.cta}
            </button>

            <div className="features">
              {tier.features.map((feature, idx) => (
                <div key={idx} className="feature">
                  <span className="check">✓</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pricing-faq">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-items">
          <div className="faq-item">
            <h4>Can I change my plan anytime?</h4>
            <p>Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
          </div>
          <div className="faq-item">
            <h4>Do you offer refunds?</h4>
            <p>We offer a 30-day money-back guarantee for our Premium tier. If you're not satisfied, we'll refund your purchase.</p>
          </div>
          <div className="faq-item">
            <h4>What payment methods do you accept?</h4>
            <p>We accept all major credit cards, PayPal, and other payment methods through our secure payment processor.</p>
          </div>
          <div className="faq-item">
            <h4>Is there a trial period?</h4>
            <p>Start with our free plan to explore all features. Upgrade anytime when you're ready for unlimited quizzes and AI grading.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
