const { supabaseAdmin } = require('../supabase');
const { v4: uuidv4 } = require('uuid');

// Subscription tier limits
const TIER_LIMITS = {
  free: {
    quizzesPerPeriod: 5,
    periodDays: 14,
    aiGrading: false,
    analytics: false,
    referralSystem: false
  },
  premium: {
    quizzesPerPeriod: -1, // unlimited
    periodDays: 30,
    aiGrading: true,
    analytics: true,
    referralSystem: false
  },
  enterprise: {
    quizzesPerPeriod: -1, // unlimited
    periodDays: 30,
    aiGrading: true,
    analytics: true,
    referralSystem: true
  }
};

// Get current subscription
async function getSubscription(req, res) {
  try {
    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error || !subscription) {
      // Create default free subscription if none exists
      const { data: newSub } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: req.user.id,
          tier: 'free'
        })
        .select()
        .single();

      return res.json({
        subscription: newSub,
        limits: TIER_LIMITS.free
      });
    }

    // Check if period needs reset
    const now = new Date();
    if (now > new Date(subscription.period_end)) {
      const { data: updated } = await supabaseAdmin
        .from('subscriptions')
        .update({
          quiz_count_this_period: 0,
          period_start: now.toISOString(),
          period_end: new Date(now.getTime() + TIER_LIMITS[subscription.tier].periodDays * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('user_id', req.user.id)
        .select()
        .single();

      return res.json({
        subscription: updated,
        limits: TIER_LIMITS[updated.tier]
      });
    }

    return res.json({
      subscription,
      limits: TIER_LIMITS[subscription.tier]
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// Upgrade subscription (for demo - would integrate with Stripe in production)
async function upgradeSubscription(req, res) {
  try {
    const { tier } = req.body;

    if (!['premium', 'enterprise'].includes(tier)) {
      return res.status(422).json({ errors: { tier: ['Invalid tier. Must be premium or enterprise.'] } });
    }

    const now = new Date();
    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        tier,
        period_start: now.toISOString(),
        period_end: new Date(now.getTime() + TIER_LIMITS[tier].periodDays * 24 * 60 * 60 * 1000).toISOString(),
        quiz_count_this_period: 0
      })
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    // Generate referral code for enterprise
    if (tier === 'enterprise' && !subscription.referral_code) {
      const referralCode = `REF${uuidv4().substring(0, 8).toUpperCase()}`;
      await supabaseAdmin
        .from('subscriptions')
        .update({ referral_code: referralCode })
        .eq('user_id', req.user.id);
      
      subscription.referral_code = referralCode;
    }

    return res.json({
      subscription,
      limits: TIER_LIMITS[tier],
      message: `Successfully upgraded to ${tier}!`
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// Apply referral code
async function applyReferral(req, res) {
  try {
    const { referral_code } = req.body;

    if (!referral_code) {
      return res.status(422).json({ errors: { referral_code: ['Referral code is required.'] } });
    }

    // Find the referrer
    const { data: referrer } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, tier')
      .eq('referral_code', referral_code)
      .eq('tier', 'enterprise')
      .single();

    if (!referrer) {
      return res.status(404).json({ message: 'Invalid referral code.' });
    }

    if (referrer.user_id === req.user.id) {
      return res.status(422).json({ message: 'You cannot use your own referral code.' });
    }

    // Check if user already used a referral
    const { data: currentSub } = await supabaseAdmin
      .from('subscriptions')
      .select('referred_by')
      .eq('user_id', req.user.id)
      .single();

    if (currentSub?.referred_by) {
      return res.status(422).json({ message: 'You have already used a referral code.' });
    }

    // Apply referral - give the new user extended free trial
    const now = new Date();
    const { data: updated, error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        referred_by: referrer.user_id,
        period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days instead of 14
        quiz_count_this_period: 0 // Reset count
      })
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      subscription: updated,
      message: 'Referral applied! You now have 30 days of extended free access.'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// Get referral stats (for enterprise users)
async function getReferralStats(req, res) {
  try {
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('referral_code, tier')
      .eq('user_id', req.user.id)
      .single();

    if (subscription?.tier !== 'enterprise') {
      return res.status(403).json({ message: 'Referral system is only available for Enterprise users.' });
    }

    // Count referrals
    const { count } = await supabaseAdmin
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', req.user.id);

    return res.json({
      referral_code: subscription.referral_code,
      total_referrals: count || 0
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// Check usage limits
async function checkLimits(req, res) {
  try {
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (!subscription) {
      return res.json({
        canCreateQuiz: true,
        quizzesUsed: 0,
        quizzesRemaining: 5,
        periodEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    const limits = TIER_LIMITS[subscription.tier];
    const canCreateQuiz = limits.quizzesPerPeriod === -1 || 
      subscription.quiz_count_this_period < limits.quizzesPerPeriod;

    return res.json({
      canCreateQuiz,
      quizzesUsed: subscription.quiz_count_this_period,
      quizzesRemaining: limits.quizzesPerPeriod === -1 ? 'unlimited' : limits.quizzesPerPeriod - subscription.quiz_count_this_period,
      periodEndsAt: subscription.period_end,
      tier: subscription.tier
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = {
  getSubscription,
  upgradeSubscription,
  applyReferral,
  getReferralStats,
  checkLimits,
  TIER_LIMITS
};
