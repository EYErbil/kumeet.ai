import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/app_layout/MainLayout';
import {
  Dashboard,
  MeetingList,
  MeetingDetail,
  NewMeeting,
  VerifyEmail
} from './pages';
import Register from './pages/Register';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import ROUTES from './constants/routes';

// Import CSS
import './index.css';

function App() {
    return (
        <Router>
            <Routes>
                {/* Root redirect */}
                <Route path="/" element={<Navigate to={ROUTES.AUTH.LOGIN} replace />} />

                {/* Public Routes */}
                <Route path={ROUTES.AUTH.REGISTER} element={<Register />} />
                <Route path={ROUTES.AUTH.LOGIN} element={<Login />} />
                <Route path={ROUTES.AUTH.VERIFY_EMAIL} element={<VerifyEmail />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                    <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
                    <Route path={ROUTES.MEETINGS.LIST} element={<MeetingList />} />
                    <Route path={ROUTES.MEETINGS.DETAIL()} element={<MeetingDetail />} />
                    <Route path={ROUTES.MEETINGS.NEW} element={<NewMeeting />} />
                    {/* Add more routes as needed */}
                </Route>

                {/* Catch all unknown routes */}
                <Route path="*" element={<Navigate to={ROUTES.AUTH.LOGIN} replace />} />
            </Routes>
        </Router>
    );
}

export default App;