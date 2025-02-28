import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/app_layout/MainLayout';
import {
  Dashboard,
  MeetingList,
  MeetingDetail,
  NewMeeting
} from './pages';
import ROUTES from './constants/routes';

// Import CSS
import './index.css';

function App() {
    return (
        <Router>
            <MainLayout>
                <Routes>
                    <Route path={ROUTES.HOME} element={<Dashboard />} />
                    <Route path={ROUTES.MEETINGS.LIST} element={<MeetingList />} />
                    <Route path={ROUTES.MEETINGS.DETAIL()} element={<MeetingDetail />} />
                    <Route path={ROUTES.MEETINGS.NEW} element={<NewMeeting />} />
                    {/* Add more routes as needed */}
                </Routes>
            </MainLayout>
        </Router>
    );
}

export default App;