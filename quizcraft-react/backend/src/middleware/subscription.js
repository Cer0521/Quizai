const {
  canCreateQuiz,
  getFeatureAccess,
  getSubscriptionState,
  canShowAds,
} = require('../services/subscription');

function checkPlanAccess(featureKey) {
  return async (req, res, next) => {
    try {
      const subscription = await getSubscriptionState(req.user.id);
      if (!subscription) return res.status(401).json({ message: 'Unauthenticated.' });

      if (!getFeatureAccess(subscription.effective_plan, featureKey)) {
        return res.status(403).json({
          message: 'This feature is not available on your current plan.',
          code: 'FEATURE_LOCKED',
          feature: featureKey,
          plan: subscription.effective_plan,
        });
      }

      req.subscription = subscription;
      next();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error.' });
    }
  };
}

async function enforceQuizLimit(req, res, next) {
  try {
    const result = await canCreateQuiz(req.user.id);
    if (!result.allowed) {
      if (result.reason === 'QUIZ_LIMIT_REACHED') {
        return res.status(403).json({
          message: 'You have reached your quiz limit for this billing cycle.',
          code: 'QUIZ_LIMIT_REACHED',
          subscription: result.subscription,
        });
      }
      return res.status(404).json({ message: 'User not found.' });
    }

    req.subscription = result.subscription;
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

async function checkAdsVisibility(req, res, next) {
  try {
    const subscription = await getSubscriptionState(req.user.id);
    if (!subscription) return res.status(401).json({ message: 'Unauthenticated.' });

    req.subscription = subscription;
    req.adsVisible = canShowAds(subscription);
    return next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = {
  checkPlanAccess,
  enforceQuizLimit,
  checkAdsVisibility,
  // Backward-compatible aliases
  requirePlanFeature: checkPlanAccess,
  enforceQuizCreationLimit: enforceQuizLimit,
};
