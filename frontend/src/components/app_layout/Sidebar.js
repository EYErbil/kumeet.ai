import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    FaHome, 
    FaVideo, 
    FaClipboardList, 
    FaListAlt, 
    FaCog,
    FaSignOutAlt,
    FaMoon
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { logout } from '../../services/api/auth';
import ROUTES from '../../constants/routes';

const NavItem = ({ to, icon, label, active, onClick, className = '' }) => {
    if (onClick) {
        return (
            <li className="mb-1">
                <button 
                    onClick={onClick}
                    className={`w-full flex items-center py-2 px-4 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-700 ${className}`}
                >
                    {icon}
                    <span className="ml-3">{label}</span>
                </button>
            </li>
        );
    }

    return (
        <li className="mb-1">
            <Link 
                to={to} 
                className={`flex items-center py-2 px-4 text-sm ${
                    active 
                        ? "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 font-medium border-l-4 border-purple-600" 
                        : "text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-700"
                }`}
            >
                {icon}
                <span className="ml-3">{label}</span>
            </Link>
        </li>
    );
};

const ToggleSwitch = ({ checked, onChange }) => {
    return (
        <label className="relative inline-flex items-center cursor-pointer">
            <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={checked}
                onChange={onChange}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
        </label>
    );
};

const Sidebar = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const path = location.pathname;
    const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));
    
    const handleLogout = async () => {
        try {
            await logout();
            navigate(ROUTES.AUTH.LOGIN);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const handleThemeToggle = () => {
        document.documentElement.classList.toggle('dark');
        setIsDarkMode(!isDarkMode);
    };
    
    return (
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen overflow-y-auto flex flex-col">
            <div className="p-4 flex items-center">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mr-2">
                    <span className="text-white text-xs">K</span>
                </div>
                <span className="text-xl font-semibold text-gray-800 dark:text-white">kumeet.ai</span>
            </div>
            
            <nav className="flex-1 px-2 py-4">
                <ul>
                    <NavItem to={ROUTES.DASHBOARD} icon={<FaHome size={16} />} label={t('sidebar.home')} active={path === ROUTES.DASHBOARD} />
                    <NavItem to={ROUTES.MEETINGS.ROOT} icon={<FaVideo size={16} />} label={t('sidebar.meetings')} active={path.includes('/meetings')} />
                    <NavItem to={ROUTES.SNIPPETS} icon={<FaClipboardList size={16} />} label={t('sidebar.notes')} active={path.includes('/snippets')} />
                    <NavItem to={ROUTES.ACTION_ITEMS} icon={<FaListAlt size={16} />} label={t('sidebar.actionItems')} active={path.includes('/action-items')} />
                    <NavItem to={ROUTES.SETTINGS} icon={<FaCog size={16} />} label={t('sidebar.settings')} active={path.includes('/settings')} />
                </ul>
            </nav>

            {/* Theme toggle and Logout buttons at the bottom */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                <div className="flex items-center justify-between px-4">
                    <div className="flex items-center">
                        <FaMoon size={16} className="text-gray-700 dark:text-gray-300" />
                        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{t('common.darkMode')}</span>
                    </div>
                    <ToggleSwitch checked={isDarkMode} onChange={handleThemeToggle} />
                </div>
                <NavItem 
                    icon={<FaSignOutAlt size={16} />} 
                    label={t('sidebar.logout')} 
                    onClick={handleLogout}
                />
            </div>
        </div>
    );
};

export default Sidebar;