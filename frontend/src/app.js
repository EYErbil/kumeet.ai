import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import MainLayout from './components/app_layout/MainLayout';
import {
  Dashboard,
  MeetingList,
  MeetingDetail,
  NewMeeting,
  VerifyEmail,
  ActionItems,
  Notes,
  Settings
} from './pages';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import ROUTES from './constants/routes';

// Import CSS
import './index.css';

// Loading component for suspense fallback
const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-xl text-gray-600 dark:text-gray-400">Loading...</div>
  </div>
);

const App = () => {
  return (
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={<Loading />}>
        <Router>
          <Routes>
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path={ROUTES.REGISTER} element={<Register />} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
            <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
            <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmail />} />
            
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
              <Route path={ROUTES.MEETINGS.LIST} element={<MeetingList />} />
              <Route path={ROUTES.MEETINGS.DETAIL(':id')} element={<MeetingDetail />} />
              <Route path={ROUTES.MEETINGS.NEW} element={<NewMeeting />} />
              <Route path={ROUTES.ACTION_ITEMS} element={<ActionItems />} />
              <Route path={ROUTES.SNIPPETS} element={<Notes />} />
              <Route path={ROUTES.SETTINGS} element={<Settings />} />
            </Route>
            
            <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          </Routes>
        </Router>
      </Suspense>
    </I18nextProvider>
  );
};

export default App;