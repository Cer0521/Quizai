export const PLAN = {
  FREE: 'FREE',
  PRO: 'PRO',
  TEAM: 'TEAM',
}

export const PLAN_LABELS = {
  [PLAN.FREE]: 'Free',
  [PLAN.PRO]: 'Pro',
  [PLAN.TEAM]: 'Team',
}

export const PLAN_UI = {
  [PLAN.FREE]: {
    price: '\u20b10/month',
    description: 'Max 5 quizzes every 2 weeks',
  },
  [PLAN.PRO]: {
    price: '\u20b1280/month',
    description: 'Unlimited quizzes + advanced features',
  },
  [PLAN.TEAM]: {
    price: '\u20b128,000/year',
    description: 'Best for schools and organizations',
  },
}

const PLAN_FEATURES = {
  [PLAN.FREE]: {
    analytics_dashboard: false,
    blueprinting: false,
    all_quiz_formats: false,
    team_management: false,
    lms_export: false,
  },
  [PLAN.PRO]: {
    analytics_dashboard: true,
    blueprinting: true,
    all_quiz_formats: true,
    team_management: false,
    lms_export: false,
  },
  [PLAN.TEAM]: {
    analytics_dashboard: true,
    blueprinting: true,
    all_quiz_formats: true,
    team_management: true,
    lms_export: true,
  },
}

export const BASIC_QUIZ_FORMATS = ['multiple_choice', 'true_false']

export function normalizePlan(plan) {
  const upper = String(plan || '').toUpperCase()
  return PLAN[upper] ? upper : PLAN.FREE
}

export function hasFeature(plan, featureKey) {
  const normalized = normalizePlan(plan)
  return Boolean(PLAN_FEATURES[normalized]?.[featureKey])
}

export function isBasicQuizFormat(questionType) {
  return BASIC_QUIZ_FORMATS.includes(String(questionType || '').toLowerCase())
}
