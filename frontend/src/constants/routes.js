/**
 * Application routes
 */

const ROUTES = {
    HOME: '/',
    AUTH: {
      REGISTER: '/register',
      LOGIN: '/login'
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