import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
    return (
        <Router>
            <Routes>
                {/* Root redirect */}
                <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />

                {/* Public Routes - wrapped in ProtectedRoute to redirect if user is logged in */}
                <Route path={ROUTES.AUTH.REGISTER} element={<ProtectedRoute><Register /></ProtectedRoute>} />
                <Route path={ROUTES.AUTH.LOGIN} element={<ProtectedRoute><Login /></ProtectedRoute>} />
                <Route path={ROUTES.AUTH.VERIFY_EMAIL} element={<ProtectedRoute><VerifyEmail /></ProtectedRoute>} />
                <Route path={ROUTES.AUTH.FORGOT_PASSWORD} element={<ProtectedRoute><ForgotPassword /></ProtectedRoute>} />
                <Route path={ROUTES.AUTH.RESET_PASSWORD} element={<ProtectedRoute><ResetPassword /></ProtectedRoute>} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                    <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
                    <Route path={ROUTES.MEETINGS.LIST} element={<MeetingList />} />
                    <Route path={ROUTES.MEETINGS.DETAIL()} element={<MeetingDetail />} />
                    <Route path={ROUTES.MEETINGS.NEW} element={<NewMeeting />} />
                    <Route path={ROUTES.SNIPPETS} element={<Notes />} />
                    <Route path={ROUTES.ACTION_ITEMS} element={<ActionItems />} />
                    <Route path={ROUTES.SETTINGS} element={<Settings />} />
                </Route>

                {/* Catch all unknown routes */}
                <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
            </Routes>
        </Router>
    );
}

export default App;