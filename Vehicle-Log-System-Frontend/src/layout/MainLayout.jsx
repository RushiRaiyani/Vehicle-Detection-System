import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, Navbar } from './Navigation.jsx';

const MainLayout = () => {
  return (
    <div className="flex min-h-screen bg-[#F9FAFB] text-gray-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
