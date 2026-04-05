const { getSubscriptionState, normalizePlan, upgradeSubscription } = require('../services/subscription');

async function getCurrentSubscription(req, res) {
  try {
    const subscription = await getSubscriptionState(req.user.id, { includeTeamMembers: true });
    if (!subscription) return res.status(404).json({ message: 'User not found.' });
    return res.json({ subscription });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

async function upgradePlan(req, res) {
  try {
    const plan = normalizePlan(req.body?.plan);
    const subscription = await upgradeSubscription(req.user.id, plan);
    return res.json({
      message: `Subscription upgraded to ${plan}.`,
      subscription,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

async function getAdsVisibility(req, res) {
  return res.json({
    ads_visible: req.adsVisible,
    plan: req.subscription?.effective_plan || req.subscription?.plan || 'FREE',
  });
}

module.exports = {
  getCurrentSubscription,
  upgradePlan,
  getAdsVisibility,
};
