'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  Monitor,
  Brain,
  Users,
  Calendar,
  Lightbulb,
  Boxes,
  Wrench,
  Factory,
  TrendingUp,
  Camera,
} from 'lucide-react';

const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/',
    icon: Monitor,
    category: 'MAIN',
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    href: '/dashboard/scheduling',
    icon: Calendar,
    category: 'OPERATIONS',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    href: '/dashboard/maintenance',
    icon: Wrench,
    category: 'OPERATIONS',
  },
  {
    id: 'factory',
    label: 'Factory',
    href: '/dashboard/factory',
    icon: Factory,
    category: 'OPERATIONS',
  },
  {
    id: 'executive',
    label: 'Executive',
    href: '/dashboard/executive',
    icon: TrendingUp,
    category: 'MANAGEMENT',
  },
  {
    id: 'ai-agents',
    label: 'AI Agents',
    href: '/dashboard/ai-agents',
    icon: Brain,
    category: 'AI & ANALYTICS',
  },
  {
    id: 'device-fleet',
    label: 'Device Fleet',
    href: '/dashboard/device-fleet',
    icon: Boxes,
    category: 'AI & ANALYTICS',
  },
  {
    id: 'users',
    label: 'Users',
    href: '/dashboard/users',
    icon: Users,
    category: 'ADMINISTRATION',
  },
  {
    id: 'image-library',
    label: 'Image Library',
    href: '/dashboard/image-library',
    icon: Camera,
    category: 'ADMINISTRATION',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    href: '/dashboard/integrations',
    icon: Lightbulb,
    category: 'ADMINISTRATION',
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  // Group navigation items by category
  const groupedItems = navigationItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, typeof navigationItems>
  );

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-500 ease-out z-40 ${
        isHovered ? 'w-70' : 'w-16'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo Area - Integrated into sidebar flow */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          {/* Logo Icon - Always visible */}
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
            <Image
              src="/Pntar_AI_Icon.png"
              alt="Pntar AI Icon"
              width={32}
              height={32}
              className="w-8 h-8"
              priority
            />
          </div>

          {/* Logo Text - Only visible when expanded */}
          {isHovered && (
            <div className="transition-opacity duration-300 opacity-100">
              <div className="whitespace-nowrap">
                <h1 className="text-lg font-bold text-gray-900">
                  Pntar Digital Hub
                </h1>
                <p className="text-xs text-gray-600">Smart Manufacturing</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Content */}
      <nav className="h-full overflow-y-auto">
        <div className="p-4">
          {/* Navigation Items */}
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category}>
                {/* Category Heading - Smooth height and opacity transitions */}
                <div
                  className={`transition-all duration-500 ease-out ${
                    isHovered && category !== 'MAIN'
                      ? 'opacity-100 max-h-8'
                      : 'opacity-0 max-h-0'
                  }`}
                  style={{
                    overflow: 'hidden',
                    willChange: 'max-height, opacity',
                  }}
                >
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                    {category}
                  </h3>
                </div>

                {/* Items in Category */}
                <div className="space-y-1">
                  {items.map(item => {
                    const IconComponent = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={`group flex items-center px-3 py-3 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-orange-50 border-l-4 border-orange-500 text-orange-700'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {/* Icon Container - Always visible, fixed position */}
                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                          <IconComponent
                            className={`h-5 w-5 transition-colors duration-200 ${
                              isActive
                                ? 'text-orange-600'
                                : 'text-gray-500 group-hover:text-gray-700'
                            }`}
                          />
                        </div>

                        {/* Text Content - Smooth transform-based transitions with proper spacing */}
                        <div
                          className={`transition-all duration-500 ease-out ${
                            isHovered
                              ? 'opacity-100 translate-x-0 scale-100 ml-3'
                              : 'opacity-0 -translate-x-2 scale-95 ml-0'
                          }`}
                          style={{
                            transformOrigin: 'left center',
                            willChange: 'transform, opacity',
                          }}
                        >
                          <div className="font-medium text-sm whitespace-nowrap">
                            {item.label}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}
