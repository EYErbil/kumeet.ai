/**
 * Application routes
 */

const ROUTES = {
    HOME: '/',
    DASHBOARD: '/dashboard',
    AUTH: {
      REGISTER: '/register',
      LOGIN: '/login',
      VERIFY_EMAIL: '/verify-email',
      FORGOT_PASSWORD: '/forgot-password',
      RESET_PASSWORD: '/reset-password'
    },
    MEETINGS: {
      LIST: '/meetings',
      DETAIL: (id = ':id') => `/meetings/${id}`,
      NEW: '/new-meeting',
    },
    ACTION_ITEMS: '/action-items',
    SNIPPETS: '/snippets',
    AI_TAGS: '/ai-tags',
    ANALYTICS: '/analytics',
    SETTINGS: '/settings',
    MEMBERS: '/members',
    INTEGRATIONS: '/integrations',
  };
  
  export default ROUTES;