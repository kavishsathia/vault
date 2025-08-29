'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/contexts/auth-context';

export default function Header() {
  const pathname = usePathname();
  const { user, signout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  return (
    <header className="border-b border-[var(--surface)] bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-gradient-to-br from-[var(--purple-primary)] to-[var(--purple-light)] rounded-lg flex items-center justify-center">
              <div className="w-3.5 h-3.5 bg-white rounded-sm"></div>
            </div>
            <span className="font-heading text-2xl font-bold text-white">
              vault
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className={`text-sm font-medium transition-colors hover:text-white ${
                pathname === '/' ? 'text-white' : 'text-[var(--foreground-muted)]'
              }`}
            >
              Dashboard
            </Link>
            <Link 
              href="/apps" 
              className={`text-sm font-medium transition-colors hover:text-white ${
                pathname === '/apps' ? 'text-white' : 'text-[var(--foreground-muted)]'
              }`}
            >
              Apps
            </Link>
            <Link 
              href="/categories" 
              className={`text-sm font-medium transition-colors hover:text-white ${
                pathname === '/categories' ? 'text-white' : 'text-[var(--foreground-muted)]'
              }`}
            >
              Categories
            </Link>
            <Link 
              href="/privacy" 
              className={`text-sm font-medium transition-colors hover:text-white ${
                pathname === '/privacy' ? 'text-white' : 'text-[var(--foreground-muted)]'
              }`}
            >
              Privacy
            </Link>
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="p-2 hover:bg-[var(--surface)] rounded-lg transition-colors group">
            <div className="w-5 h-5 relative">
              <div className="w-4 h-4 border-2 border-[var(--foreground-muted)] rounded-sm group-hover:border-[var(--purple-primary)] transition-colors"></div>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--purple-primary)] rounded-full"></div>
            </div>
          </button>
          
          {/* Settings */}
          <button className="p-2 hover:bg-[var(--surface)] rounded-lg transition-colors group">
            <div className="w-5 h-5 border-2 border-[var(--foreground-muted)] rounded-full group-hover:border-[var(--purple-primary)] transition-colors relative">
              <div className="absolute inset-1 border border-[var(--foreground-muted)] rounded-full group-hover:border-[var(--purple-primary)] transition-colors"></div>
            </div>
          </button>
          
          {/* User Profile */}
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 hover:bg-[var(--surface)] rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[var(--purple-primary)] to-[var(--purple-light)] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {user?.name ? user.name.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <span className="text-[var(--foreground-light)] font-medium">
                {user?.name || user?.email || 'User'}
              </span>
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--surface)] border border-[var(--surface-light)] rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-[var(--surface-light)]">
                  <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">{user?.email}</p>
                </div>
                <div className="py-2">
                  <button className="w-full text-left px-3 py-2 text-sm text-[var(--foreground-light)] hover:bg-[var(--surface-light)] transition-colors">
                    Settings
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-[var(--foreground-light)] hover:bg-[var(--surface-light)] transition-colors">
                    Privacy
                  </button>
                  <hr className="my-2 border-[var(--surface-light)]" />
                  <button 
                    onClick={signout}
                    className="w-full text-left px-3 py-2 text-sm text-[var(--error)] hover:bg-[var(--surface-light)] transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}