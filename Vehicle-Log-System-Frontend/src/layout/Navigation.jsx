import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png'; // adjust path based on file location

import {
  Database,
  Upload,
  Info,
  Home,
  Car,
  ChevronRight,
  LogOut,
  Bell,
  User
} from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, to, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${active
      ? 'bg-blue-50 text-blue-600 font-medium shadow-sm'
      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
  >
    <Icon size={20} />
    <span className="text-sm">{label}</span>
    {active && <ChevronRight size={16} className="ml-auto" />}
  </Link>
);

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const menuItems = [
    { icon: Home, label: 'Home', to: '/' },
    { icon: Upload, label: 'Upload Detection', to: '/upload' },
    // Only show Collections if user is logged in
    ...(user ? [{ icon: Database, label: 'Collections', to: '/collections' }] : []),
    { icon: Info, label: 'About Project', to: '/about' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 border-r border-gray-200 bg-white h-screen sticky top-0 flex flex-col">
      <div className="p-3 flex flex-col items-center border-b border-gray-100">
        <img
          src={logo}   // path to your logo in the public/assets folder
          alt="AutoLog AI Logo"
          className="w-30 h-30 object-contain" // added margin-bottom to separate from text
        />
        <div className="text-center">
          <h1 className="font-bold text-gray-900 tracking-tight leading-none">PlateVision</h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Vehicle Number Plate Detection</p>
        </div>
      </div>


      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-4">Main Menu</p>
        {menuItems.map((item) => (
          <SidebarItem
            key={item.to}
            {...item}
            active={location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))}
          />
        ))}
      </nav>

      {user && (
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-600 cursor-pointer transition-colors w-full"
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export const Navbar = () => {
  const { user } = useAuth();

  return (
    <header className="h-16 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>System Status:</span>
        <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          Operational
        </span>
      </div>

      <div className="flex items-center gap-6">
        {user ? (
          <>
            <button className="text-gray-400 hover:text-gray-600 transition-colors relative">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-[1px] bg-gray-200"></div>
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 leading-none">{user.name}</p>
                <p className="text-xs text-gray-500 mt-1">{user.email}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 border border-gray-200 group-hover:border-blue-200 transition-colors">
                <User size={20} />
              </div>
            </div>
          </>
        ) : (
          <Link
            to="/login"
            className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
