const { dbGet, dbAll, dbRun } = require('../db');

const SUBSCRIPTION_PLANS = {
  FREE: 'FREE',
  PRO: 'PRO',
  TEAM: 'TEAM',
};

const PLAN_DETAILS = {
  [SUBSCRIPTION_PLANS.FREE]: {
    billing: 'monthly',
    monthlyPrice: 0,
    yearlyPrice: 0,
    quizLimit: 5,
    cycleDays: 14,
    features: {
      analytics_dashboard: false,
      blueprinting: false,
      all_quiz_formats: false,
      team_management: false,
      lms_export: false,
      no_ads: false,
      priority_support: false,
    },
  },
  [SUBSCRIPTION_PLANS.PRO]: {
    billing: 'monthly',
    monthlyPrice: 280,
    yearlyPrice: null,
    quizLimit: null,
    cycleDays: 14,
    features: {
      analytics_dashboard: true,
      blueprinting: true,
      all_quiz_formats: true,
      team_management: false,
      lms_export: false,
      no_ads: true,
      priority_support: false,
    },
  },
  [SUBSCRIPTION_PLANS.TEAM]: {
    billing: 'yearly',
    monthlyPrice: null,
    yearlyPrice: 28000,
    quizLimit: null,
    cycleDays: 14,
    features: {
      analytics_dashboard: true,
      blueprinting: true,
      all_quiz_formats: true,
      team_management: true,
      lms_export: true,
      no_ads: true,
      priority_support: true,
    },
  },
};

const BASIC_QUIZ_FORMATS = new Set(['multiple_choice', 'true_false']);
let usersColumnCache = null;

function normalizePlan(plan) {
  const normalized = String(plan || '').toUpperCase();
  if (PLAN_DETAILS[normalized]) return normalized;
  return SUBSCRIPTION_PLANS.FREE;
}

function getPlanDetails(plan) {
  return PLAN_DETAILS[normalizePlan(plan)];
}

function resolveEffectivePlan(plan, teamRole, teamId) {
  const normalizedPlan = normalizePlan(plan);
  const normalizedRole = String(teamRole || 'OWNER').toUpperCase();

  if (teamId && normalizedRole === 'MEMBER') {
    return SUBSCRIPTION_PLANS.PRO;
  }

  return normalizedPlan;
}

function getFeatureAccess(plan, featureKey) {
  const details = getPlanDetails(plan);
  return Boolean(details.features[featureKey]);
}

function isBasicQuizFormat(type) {
  return BASIC_QUIZ_FORMATS.has(String(type || '').toLowerCase());
}

function cycleExpired(billingCycleStart, cycleDays) {
  if (!billingCycleStart) return true;
  const start = new Date(billingCycleStart).getTime();
  if (!Number.isFinite(start)) return true;
  const expiresAt = start + cycleDays * 24 * 60 * 60 * 1000;
  return Date.now() >= expiresAt;
}

async function getUsersColumnSet() {
  if (usersColumnCache) return usersColumnCache;

  const rows = await dbAll(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'users'`
  );
  usersColumnCache = new Set(rows.map((row) => row.column_name));
  return usersColumnCache;
}

async function hasUsersColumn(columnName) {
  const columns = await getUsersColumnSet();
  return columns.has(columnName);
}

async function loadUserSubscriptionRow(userId) {
  const hasPlan = await hasUsersColumn('plan');
  const hasQuizCount = await hasUsersColumn('quiz_count');
  const hasBillingCycleStart = await hasUsersColumn('billing_cycle_start');
  const hasTeamId = await hasUsersColumn('team_id');
  const hasTeamRole = await hasUsersColumn('team_role');

  const selectCols = [
    'id',
    hasPlan ? 'plan' : `'${SUBSCRIPTION_PLANS.FREE}' AS plan`,
    hasQuizCount ? 'quiz_count' : '0::int AS quiz_count',
    hasBillingCycleStart ? 'billing_cycle_start' : 'NOW() AS billing_cycle_start',
    hasTeamId ? 'team_id' : 'NULL::bigint AS team_id',
    hasTeamRole ? 'team_role' : `'OWNER' AS team_role`,
  ];

  return dbGet(
    `SELECT ${selectCols.join(', ')}
     FROM users
     WHERE id = ?`,
    [userId]
  );
}

async function getSubscriptionState(userId, options = {}) {
  const includeTeamMembers = options.includeTeamMembers === true;
  const row = await loadUserSubscriptionRow(userId);

  if (!row) return null;

  const plan = normalizePlan(row.plan);
  const effectivePlan = resolveEffectivePlan(plan, row.team_role, row.team_id);
  const details = getPlanDetails(effectivePlan);

  let quizCount = Number(row.quiz_count || 0);
  let billingCycleStart = row.billing_cycle_start;

  if (cycleExpired(billingCycleStart, details.cycleDays)) {
    const setClauses = [];
    if (await hasUsersColumn('quiz_count')) setClauses.push('quiz_count = 0');
    if (await hasUsersColumn('billing_cycle_start')) setClauses.push('billing_cycle_start = NOW()');
    if (await hasUsersColumn('updated_at')) setClauses.push('updated_at = NOW()');
    if (setClauses.length) {
      await dbRun(
        `UPDATE users
         SET ${setClauses.join(', ')}
         WHERE id = ?`,
        [userId]
      );
    }
    quizCount = 0;
    billingCycleStart = new Date().toISOString();
  }

  const remaining = details.quizLimit == null ? null : Math.max(0, details.quizLimit - quizCount);

  const state = {
    user_id: row.id,
    plan,
    effective_plan: effectivePlan,
    quiz_count: quizCount,
    billing_cycle_start: billingCycleStart,
    team_id: row.team_id,
    team_role: String(row.team_role || 'OWNER').toUpperCase(),
    cycle_days: details.cycleDays,
    quiz_limit: details.quizLimit,
    quizzes_remaining: remaining,
    features: details.features,
    ads_visible: effectivePlan === SUBSCRIPTION_PLANS.FREE,
    pricing: {
      monthlyPrice: details.monthlyPrice,
      yearlyPrice: details.yearlyPrice,
      currency: 'PHP',
    },
  };

  if (includeTeamMembers && row.team_id) {
    const teamSelectCols = ['id', 'name', 'email'];
    if (await hasUsersColumn('team_role')) teamSelectCols.push('team_role');
    else teamSelectCols.push(`'OWNER' AS team_role`);
    if (await hasUsersColumn('plan')) teamSelectCols.push('plan');
    else teamSelectCols.push(`'${SUBSCRIPTION_PLANS.FREE}' AS plan`);

    let teamMembers = null;
    try {
      teamMembers = await dbAll(
        `SELECT ${teamSelectCols.join(', ')}
         FROM users
         WHERE team_id = ?
         ORDER BY created_at ASC`,
        [row.team_id]
      );
    } catch (err) {
      teamMembers = null;
    }

    if (Array.isArray(teamMembers)) {
      state.team_members = teamMembers;
    }
  }

  return state;
}

async function canCreateQuiz(userId) {
  const subscription = await getSubscriptionState(userId);
  if (!subscription) return { allowed: false, reason: 'USER_NOT_FOUND' };

  if (subscription.quiz_limit == null) {
    return { allowed: true, subscription };
  }

  if (subscription.quiz_count >= subscription.quiz_limit) {
    return {
      allowed: false,
      reason: 'QUIZ_LIMIT_REACHED',
      subscription,
    };
  }

  return { allowed: true, subscription };
}

async function incrementQuizUsage(userId) {
  if (!(await hasUsersColumn('quiz_count'))) return;

  const setClauses = ['quiz_count = COALESCE(quiz_count, 0) + 1'];
  if (await hasUsersColumn('updated_at')) setClauses.push('updated_at = NOW()');

  await dbRun(
    `UPDATE users
     SET ${setClauses.join(', ')}
     WHERE id = ?`,
    [userId]
  );
}

async function upgradeSubscription(userId, plan) {
  const normalizedPlan = normalizePlan(plan);

  if (normalizedPlan === SUBSCRIPTION_PLANS.TEAM) {
    await dbRun(
      `UPDATE users
       SET plan = ?,
           quiz_count = 0,
           billing_cycle_start = NOW(),
           team_id = id,
           team_role = 'OWNER',
           updated_at = NOW()
       WHERE id = ?`,
      [normalizedPlan, userId]
    );
  } else {
    await dbRun(
      `UPDATE users
       SET plan = ?,
           quiz_count = 0,
           billing_cycle_start = NOW(),
           team_id = CASE WHEN team_role = 'MEMBER' THEN team_id ELSE NULL END,
           team_role = CASE WHEN team_role = 'MEMBER' THEN 'MEMBER' ELSE 'OWNER' END,
           updated_at = NOW()
       WHERE id = ?`,
      [normalizedPlan, userId]
    );
  }

  return getSubscriptionState(userId);
}

function canShowAds(subscriptionState) {
  return subscriptionState?.effective_plan === SUBSCRIPTION_PLANS.FREE;
}

module.exports = {
  SUBSCRIPTION_PLANS,
  PLAN_DETAILS,
  BASIC_QUIZ_FORMATS,
  normalizePlan,
  getPlanDetails,
  getFeatureAccess,
  resolveEffectivePlan,
  isBasicQuizFormat,
  getSubscriptionState,
  canCreateQuiz,
  incrementQuizUsage,
  upgradeSubscription,
  canShowAds,
};
