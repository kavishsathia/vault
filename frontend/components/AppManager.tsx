'use client';

import { useState } from 'react';
import { useAuth } from '../lib/contexts/auth-context';
import { useIntegratedApps, usePendingApps } from '../lib/hooks/api';
import AppSettingsModal from './AppSettingsModal';

interface App {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  trust_score?: number;
  queries_made: number;
  preferences_contributed: number;
  last_query_at?: string;
  permissions?: {
    category_id: string;
    category_name: string;
    can_read: boolean;
    can_write: boolean;
  }[];
}

interface PendingApp {
  id: string;
  name: string;
  description: string;
  requested_permissions: string[];
  requested_at: string;
}

function AppIcon({ name }: { name: string }) {
  const colors: Record<string, string> = {
    'SpotifyAI': 'from-green-500 to-green-600',
    'FoodieApp': 'from-orange-500 to-orange-600',
    'WorkFlow': 'from-blue-500 to-blue-600',
    'GameRec': 'from-purple-500 to-purple-600',
    'GitHelper': 'from-gray-500 to-gray-600',
    'TravelTracker': 'from-cyan-500 to-cyan-600',
    'ShopBot': 'from-pink-500 to-pink-600',
    'FitnessTracker': 'from-emerald-500 to-emerald-600',
    'LearningHub': 'from-indigo-500 to-indigo-600'
  };
  
  const colorClass = colors[name] || 'from-gray-500 to-gray-600';
  const initials = name.slice(0, 2).toUpperCase();
  
  return (
    <div className={`w-12 h-12 bg-gradient-to-br ${colorClass} rounded-lg flex items-center justify-center`}>
      <span className="text-white text-sm font-bold">{initials}</span>
    </div>
  );
}

function StatusIndicator({ isActive, trustScore }: { isActive: boolean; trustScore: number }) {
  if (!isActive) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-[var(--foreground-muted)] rounded-full"></div>
          <div className="w-2 h-2 bg-[var(--surface)] rounded-full"></div>
          <div className="w-2 h-2 bg-[var(--surface)] rounded-full"></div>
        </div>
        <span className="text-xs text-[var(--foreground-muted)]">Restricted</span>
      </div>
    );
  }
  
  if (trustScore >= 8) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-[var(--success)] rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-[var(--success)] rounded-full"></div>
          <div className="w-2 h-2 bg-[var(--success)] rounded-full"></div>
        </div>
        <span className="text-xs text-[var(--success)]">Active</span>
      </div>
    );
  }
  
  if (trustScore >= 6) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-[var(--warning)] rounded-full"></div>
          <div className="w-2 h-2 bg-[var(--warning)] rounded-full"></div>
          <div className="w-2 h-2 bg-[var(--surface)] rounded-full"></div>
        </div>
        <span className="text-xs text-[var(--warning)]">Limited</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center space-x-2">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-[var(--error)] rounded-full"></div>
        <div className="w-2 h-2 bg-[var(--surface)] rounded-full"></div>
        <div className="w-2 h-2 bg-[var(--surface)] rounded-full"></div>
      </div>
      <span className="text-xs text-[var(--error)]">Restricted</span>
    </div>
  );
}

function ConnectedAppCard({ app, onSettings }: { app: App; onSettings: (app: App) => void }) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const readPermissions = app.permissions?.filter(p => p.can_read) || [];
  const writePermissions = app.permissions?.filter(p => p.can_write) || [];

  return (
    <div className="bg-[var(--surface)] rounded-xl p-6 hover:bg-[var(--surface-light)] transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          <AppIcon name={app.name} />
          <div className="flex-1">
            <h3 className="font-heading text-lg font-normal text-white mb-1">
              {app.name}
            </h3>
            <p className="text-sm text-[var(--foreground-muted)] mb-2">
              {app.description}
            </p>
            <div className="flex items-center space-x-4 text-xs text-[var(--foreground-muted)]">
              <span>Last query: {app.last_query_at ? formatTime(app.last_query_at) : 'Never'}</span>
              <span>Contributed: {app.preferences_contributed || 0} preferences</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-2">
          <StatusIndicator isActive={app.is_active} trustScore={app.trust_score || 0} />
          <div className="flex items-center space-x-1">
            <span className="text-xs text-[var(--foreground-muted)]">Trust:</span>
            <span className={`text-xs font-bold ${
              (app.trust_score || 0) >= 8 ? 'text-[var(--success)]' :
              (app.trust_score || 0) >= 6 ? 'text-[var(--warning)]' :
              'text-[var(--error)]'
            }`}>
              {(app.trust_score || 0).toFixed(1)}/10
            </span>
            {(app.trust_score || 0) < 7 && <span className="text-[var(--warning)]">⚠️</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="text-sm font-semibold text-[var(--foreground-light)] mb-2 uppercase tracking-wide">
            Read Access
          </h4>
          <div className="flex flex-wrap gap-1">
            {readPermissions.length > 0 ? (
              readPermissions.slice(0, 3).map((perm) => (
                <span 
                  key={perm.category_id} 
                  className="text-xs bg-[var(--success)]/20 text-[var(--success)] px-2 py-1 rounded-full border border-[var(--success)]/20"
                >
                  ✓ {perm.category_name}
                </span>
              ))
            ) : (
              <span className="text-xs text-[var(--foreground-muted)]">No access</span>
            )}
            {readPermissions.length > 3 && (
              <span className="text-xs text-[var(--foreground-muted)]">+{readPermissions.length - 3} more</span>
            )}
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold text-[var(--foreground-light)] mb-2 uppercase tracking-wide">
            Write Access
          </h4>
          <div className="flex flex-wrap gap-1">
            {writePermissions.length > 0 ? (
              writePermissions.slice(0, 3).map((perm) => (
                <span 
                  key={perm.category_id} 
                  className="text-xs bg-[var(--purple-primary)]/20 text-[var(--purple-primary)] px-2 py-1 rounded-full border border-[var(--purple-primary)]/20"
                >
                  ✓ {perm.category_name}
                </span>
              ))
            ) : (
              <span className="text-xs text-[var(--foreground-muted)]">No access</span>
            )}
            {writePermissions.length > 3 && (
              <span className="text-xs text-[var(--foreground-muted)]">+{writePermissions.length - 3} more</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[var(--surface-light)]">
        <div className="flex items-center space-x-4 text-xs text-[var(--foreground-muted)]">
          <span>{app.queries_made} queries</span>
        </div>
        
        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onSettings(app)}
            className="px-3 py-1.5 text-xs bg-[var(--surface-light)] text-[var(--foreground-light)] rounded-lg hover:bg-[var(--purple-primary)] hover:text-white transition-colors"
          >
            Settings
          </button>
          <button className="px-3 py-1.5 text-xs bg-[var(--error)]/20 text-[var(--error)] rounded-lg hover:bg-[var(--error)] hover:text-white transition-colors">
            Revoke
          </button>
        </div>
      </div>
    </div>
  );
}

function PendingAppCard({ app, onApprove, onReject }: { 
  app: PendingApp; 
  onApprove: (app: PendingApp) => void;
  onReject: (app: PendingApp) => void;
}) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--warning)]/20">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          <AppIcon name={app.name} />
          <div>
            <h4 className="font-heading text-base font-normal text-white mb-1">
              {app.name}
            </h4>
            <p className="text-sm text-[var(--foreground-muted)] mb-2">
              {app.description}
            </p>
            <div className="text-xs text-[var(--foreground-muted)]">
              Requested {formatTime(app.requested_at)}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <h5 className="text-sm font-semibold text-[var(--foreground-light)] mb-2 uppercase tracking-wide">
          Wants Access To
        </h5>
        <div className="flex flex-wrap gap-1">
          {app.requested_permissions.map((perm) => (
            <span 
              key={perm} 
              className="text-xs bg-[var(--warning)]/20 text-[var(--warning)] px-2 py-1 rounded-full border border-[var(--warning)]/20"
            >
              {perm}
            </span>
          ))}
        </div>
      </div>

      <div className="flex space-x-2">
        <button 
          onClick={() => onApprove(app)}
          className="flex-1 px-3 py-2 text-xs bg-[var(--success)] text-white rounded-lg hover:bg-[var(--success)]/80 transition-colors"
        >
          Approve
        </button>
        <button 
          onClick={() => onReject(app)}
          className="flex-1 px-3 py-2 text-xs bg-[var(--error)] text-white rounded-lg hover:bg-[var(--error)]/80 transition-colors"
        >
          Reject
        </button>
        <button className="px-3 py-2 text-xs bg-[var(--surface-light)] text-[var(--foreground-light)] rounded-lg hover:bg-[var(--purple-primary)] hover:text-white transition-colors">
          View Details
        </button>
      </div>
    </div>
  );
}

export default function AppManager() {
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const { user } = useAuth();
  
  const { data: connectedApps, isLoading: appsLoading } = useIntegratedApps(user?.id || '', { 
    limit: 20 
  });
  const { data: pendingApps, isLoading: pendingLoading } = usePendingApps(user?.id || '');

  const handleAppSettings = (app: App) => {
    setSelectedApp(app);
  };

  const handleApprove = (app: PendingApp) => {
    console.log('Approving app:', app.name);
    // TODO: Implement approval logic
  };

  const handleReject = (app: PendingApp) => {
    console.log('Rejecting app:', app.name);
    // TODO: Implement rejection logic
  };

  const connectedCount = connectedApps?.apps.length || 0;
  const pendingCount = pendingApps?.pending_apps.length || 0;
  const needsReviewCount = connectedApps?.apps.filter(app => (app.trust_score || 0) < 7).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--surface)] to-[var(--surface-light)] rounded-2xl p-8 border border-[var(--surface-light)]">
        <h1 className="font-heading text-3xl font-normal text-white mb-3">
          App Integration Control Center
        </h1>
        <p className="text-[var(--foreground-muted)] mb-4">
          Manage which apps can access your preferences
        </p>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-[var(--success)] rounded-full"></div>
            <span className="text-sm text-[var(--foreground-light)]">{connectedCount} connected</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-[var(--warning)] rounded-full"></div>
            <span className="text-sm text-[var(--foreground-light)]">{pendingCount} pending</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-[var(--error)] rounded-full"></div>
            <span className="text-sm text-[var(--foreground-light)]">{needsReviewCount} need review</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button className="bg-[var(--surface)] rounded-xl p-4 hover:bg-[var(--surface-light)] transition-colors text-left group">
          <div className="w-8 h-8 bg-[var(--purple-primary)]/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-[var(--purple-primary)] transition-colors">
            <div className="w-4 h-4 border-2 border-[var(--purple-primary)] rounded-sm group-hover:border-white"></div>
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">Connect New App</h3>
          <p className="text-xs text-[var(--foreground-muted)]">Browse directory</p>
        </button>

        <button className="bg-[var(--surface)] rounded-xl p-4 hover:bg-[var(--surface-light)] transition-colors text-left group">
          <div className="w-8 h-8 bg-[var(--cyan-primary)]/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-[var(--cyan-primary)] transition-colors">
            <div className="w-4 h-4 border-2 border-[var(--cyan-primary)] rounded-full group-hover:border-white"></div>
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">Permission Analytics</h3>
          <p className="text-xs text-[var(--foreground-muted)]">View usage stats</p>
        </button>

        <button className="bg-[var(--surface)] rounded-xl p-4 hover:bg-[var(--surface-light)] transition-colors text-left group">
          <div className="w-8 h-8 bg-[var(--orange-primary)]/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-[var(--orange-primary)] transition-colors">
            <div className="w-4 h-4 border-2 border-[var(--orange-primary)] rounded-sm group-hover:border-white transform rotate-45"></div>
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">Batch Manager</h3>
          <p className="text-xs text-[var(--foreground-muted)]">Bulk operations</p>
        </button>

        <button className="bg-[var(--surface)] rounded-xl p-4 hover:bg-[var(--surface-light)] transition-colors text-left group">
          <div className="w-8 h-8 bg-[var(--success)]/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-[var(--success)] transition-colors">
            <div className="w-4 h-4 border-2 border-[var(--success)] rounded-lg group-hover:border-white"></div>
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">Export Data</h3>
          <p className="text-xs text-[var(--foreground-muted)]">Download report</p>
        </button>
      </div>

      {/* Pending Requests */}
      {pendingCount > 0 && (
        <div>
          <h2 className="font-heading text-xl font-normal text-white mb-4 flex items-center">
            Pending Requests
            <span className="ml-2 text-xs bg-[var(--warning)] text-white px-2 py-1 rounded-full">
              {pendingCount}
            </span>
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pendingLoading ? (
              [...Array(2)].map((_, i) => (
                <div key={i} className="bg-[var(--surface)] rounded-xl p-4 animate-pulse">
                  <div className="flex space-x-3 mb-3">
                    <div className="w-12 h-12 bg-[var(--surface-light)] rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-[var(--surface-light)] rounded mb-2"></div>
                      <div className="h-3 bg-[var(--surface-light)] rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              pendingApps?.pending_apps.map((app) => (
                <PendingAppCard
                  key={app.id}
                  app={app}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Connected Apps */}
      <div>
        <h2 className="font-heading text-xl font-normal text-white mb-4 flex items-center">
          Connected Apps
          <span className="ml-2 text-xs bg-[var(--success)] text-white px-2 py-1 rounded-full">
            {connectedCount}
          </span>
        </h2>
        <div className="space-y-4">
          {appsLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-[var(--surface)] rounded-xl p-6 animate-pulse">
                <div className="flex space-x-4 mb-4">
                  <div className="w-12 h-12 bg-[var(--surface-light)] rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-[var(--surface-light)] rounded mb-2"></div>
                    <div className="h-4 bg-[var(--surface-light)] rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            connectedApps?.apps.map((app) => (
              <ConnectedAppCard
                key={app.id}
                app={app}
                onSettings={handleAppSettings}
              />
            ))
          )}
        </div>
      </div>

      {/* App Settings Modal */}
      {selectedApp && (
        <AppSettingsModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onSave={(updatedApp) => {
            console.log('Saving app settings:', updatedApp);
            setSelectedApp(null);
          }}
        />
      )}
    </div>
  );
}