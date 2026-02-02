'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: ReactNode;
  title: string;
  status?: {
    message: string;
    isHealthy: boolean;
  };
}

export default function Layout({ children, title, status }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header title={title} status={status} />

      {/* Main Content Area */}
      <main className="px-0 lg:px-20 pt-16 min-h-screen transition-all duration-200">
        <div className="p-4 xl:p-6 pr-4 lg:pr-20 max-w-none">{children}</div>
      </main>
    </div>
  );
}
