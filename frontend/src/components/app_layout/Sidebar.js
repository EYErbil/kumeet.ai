import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    FaHome, 
    FaVideo, 
    FaClipboardList, 
    FaListAlt, 
    FaTag, 
    FaChartBar,
    FaUsers,
    FaPuzzlePiece,
    FaCog,
    FaSignOutAlt
} from 'react-icons/fa';
import { logout } from '../../services/api/auth';
import ROUTES from '../../constants/routes';

const NavItem = ({ to, icon, label, active, onClick }) => {
    if (onClick) {
        return (
            <li className="mb-1">
                <button 
                    onClick={onClick}
                    className={`w-full flex items-center py-2 px-4 text-sm text-gray-700 hover:bg-purple-50`}
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
                        ? "bg-purple-100 text-purple-600 font-medium border-l-4 border-purple-600" 
                        : "text-gray-700 hover:bg-purple-50"
                }`}
            >
                {icon}
                <span className="ml-3">{label}</span>
            </Link>
        </li>
    );
};

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const path = location.pathname;
    
    const handleLogout = async () => {
        try {
            await logout();
            navigate(ROUTES.AUTH.LOGIN);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };
    
    return (
        <div className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto flex flex-col">
            <div className="p-4 flex items-center">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mr-2">
                    <span className="text-white text-xs">K</span>
                </div>
                <span className="text-xl font-semibold text-gray-800">kumeet.ai</span>
            </div>
            
            <nav className="flex-1 px-2 py-4">
                <ul>
                    <NavItem to={ROUTES.DASHBOARD} icon={<FaHome size={16} />} label="Home" active={path === ROUTES.DASHBOARD} />
                    <NavItem to={ROUTES.MEETINGS.LIST} icon={<FaVideo size={16} />} label="Meetings" active={path.includes('/meetings')} />
                    <NavItem to={ROUTES.SNIPPETS} icon={<FaClipboardList size={16} />} label="Snippets" active={path.includes('/snippets')} />
                    <NavItem to={ROUTES.ACTION_ITEMS} icon={<FaListAlt size={16} />} label="Action Items" active={path.includes('/action-items')} />
                    <NavItem to={ROUTES.AI_TAGS} icon={<FaTag size={16} />} label="AI tags" active={path.includes('/ai-tags')} />
                    <NavItem to={ROUTES.ANALYTICS} icon={<FaChartBar size={16} />} label="Analytics" active={path.includes('/analytics')} />
                </ul>
                
                <div className="mt-8 mb-2">
                    <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        WORKSPACE
                    </h3>
                </div>
                
                <ul>
                    <NavItem to={ROUTES.MEMBERS} icon={<FaUsers size={16} />} label="Members" active={path.includes('/members')} />
                    <NavItem to={ROUTES.INTEGRATIONS} icon={<FaPuzzlePiece size={16} />} label="Integrations" active={path.includes('/integrations')} />
                    <NavItem to={ROUTES.SETTINGS} icon={<FaCog size={16} />} label="Settings" active={path.includes('/settings')} />
                </ul>
            </nav>

            {/* Logout button at the bottom */}
            <div className="p-4 border-t border-gray-200">
                <NavItem 
                    icon={<FaSignOutAlt size={16} />} 
                    label="Logout" 
                    onClick={handleLogout}
                />
            </div>
        </div>
    );
};

export default Sidebar;