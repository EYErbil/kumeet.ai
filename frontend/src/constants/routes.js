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
      ROOT: '/meetings',
      LIST: '/meetings',
      NEW: '/meetings/new',
      DETAIL: (id = ':id') => `/meetings/${id}`,
    },
    ACTION_ITEMS: '/action-items',
    SNIPPETS: '/snippets',
    SETTINGS: '/settings',
    CALENDAR: {
      ROOT: '/calendar',
      GOOGLE_CALLBACK: '/calendar/google/callback',
      OUTLOOK_CALLBACK: '/calendar/outlook/callback'
    }
  };
  
  export default ROUTES;