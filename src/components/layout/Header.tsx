'use client';

import { useState, useEffect } from 'react';
import { Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/NoAuthContext';

interface HeaderProps {
  title: string;
  status?: {
    message: string;
    isHealthy: boolean;
  };
}

export default function Header({ title, status }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState('16'); // Default collapsed width
  const { signOut, user } = useAuth();

  useEffect(() => {
    // Function to check sidebar width
    const checkSidebarWidth = () => {
      const sidebar = document.querySelector('aside');
      if (sidebar) {
        const width = getComputedStyle(sidebar).width;
        // Convert width to number and check if it's expanded (280px = 70 in Tailwind)
        const isExpanded = parseInt(width) > 100; // Threshold between collapsed and expanded
        setSidebarWidth(isExpanded ? '70' : '16');
      }
    };

    // Check initially
    checkSidebarWidth();

    // Set up a mutation observer to watch for sidebar width changes
    const observer = new MutationObserver(checkSidebarWidth);
    const sidebar = document.querySelector('aside');

    if (sidebar) {
      observer.observe(sidebar, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    // Also check on mouse events (for hover-based expansion)
    const handleMouseMove = () => {
      setTimeout(checkSidebarWidth, 150); // Small delay to let transition complete
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      observer.disconnect();
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = () => {
    signOut();
    setIsDropdownOpen(false);
  };

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-6 transition-all duration-300 ease-in-out`}
      style={{ left: `${sidebarWidth === '70' ? '280px' : '64px'}` }}
    >
      {/* Left Section - Empty (Logo removed) */}
      <div className="flex items-center">
        {/* Empty space - logo removed */}
      </div>

      {/* Center Section - Empty (Status moved to right) */}
      <div className="flex items-center">
        {/* Center space - status moved to right */}
      </div>

      {/* Right Section - System Status, Notifications, and User Actions */}
      <div className="flex items-center space-x-4">
        {/* System Status */}
        {status && (
          <div className="flex items-center space-x-2">
            <div
              className={`h-2 w-2 rounded-full ${
                status.isHealthy ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></div>
            <span className="text-sm font-medium text-gray-600">
              {status.message}
            </span>
          </div>
        )}

        {/* Notifications */}
        <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200">
          <Bell className="h-5 w-5" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={toggleDropdown}
            className="flex items-center space-x-2 p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <span className="text-sm font-medium">
              {user?.email?.split('@')[0] || 'User'}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </button>
              <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
              <hr className="my-2 border-gray-200" />
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
