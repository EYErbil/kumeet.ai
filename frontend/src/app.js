import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/app_layout/MainLayout';
import {
  Dashboard,
  MeetingList,
  MeetingDetail,
  NewMeeting
} from './pages';
import Register from './pages/Register';
import Login from './pages/Login';
import ROUTES from './constants/routes';

// Import CSS
import './index.css';

function App() {
    return (
        <Router>
            <Routes>
                <Route path={ROUTES.AUTH.REGISTER} element={<Register />} />
                <Route path={ROUTES.AUTH.LOGIN} element={<Login />} />
                <Route element={<MainLayout />}>
                    <Route path={ROUTES.HOME} element={<Dashboard />} />
                    <Route path={ROUTES.MEETINGS.LIST} element={<MeetingList />} />
                    <Route path={ROUTES.MEETINGS.DETAIL()} element={<MeetingDetail />} />
                    <Route path={ROUTES.MEETINGS.NEW} element={<NewMeeting />} />
                    {/* Add more routes as needed */}
                </Route>
            </Routes>
        </Router>
    );
}

export default App;