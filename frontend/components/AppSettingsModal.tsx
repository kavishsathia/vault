'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/contexts/auth-context';
import { useCategories, useUpdateAppPermissions } from '../lib/hooks/api';

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

interface AppSettingsModalProps {
  app: App;
  onClose: () => void;
  onSave: (app: App) => void;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  preference_count: number;
}

function PermissionToggle({ 
  enabled, 
  onChange, 
  type,
  disabled = false 
}: { 
  enabled: boolean; 
  onChange: (enabled: boolean) => void;
  type: 'read' | 'write';
  disabled?: boolean;
}) {
  const bgColor = type === 'read' ? 'var(--success)' : 'var(--purple-primary)';
  
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`
        relative w-10 h-6 rounded-full transition-all duration-200 
        ${enabled ? 'opacity-100' : 'opacity-40'} 
        ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
      `}
      style={{
        backgroundColor: enabled ? bgColor : 'var(--surface-light)'
      }}
    >
      <div
        className={`
          absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200
          ${enabled ? 'translate-x-5' : 'translate-x-1'}
        `}
      />
    </button>
  );
}

function CategoryRow({ 
  category, 
  permission, 
  onPermissionChange,
  hasWriteAccess,
  onWriteAccessChange 
}: {
  category: Category;
  permission: { category_id: string; category_name: string; can_read: boolean; can_write: boolean } | undefined;
  onPermissionChange: (categoryId: string, type: 'read' | 'write', enabled: boolean) => void;
  hasWriteAccess: boolean;
  onWriteAccessChange: (hasAccess: boolean) => void;
}) {
  const canRead = permission?.can_read || false;
  const canWrite = permission?.can_write || false;

  return (
    <div className="grid grid-cols-12 gap-4 items-center py-3 px-4 hover:bg-[var(--surface-light)]/50 rounded-lg group">
      {/* Category Info */}
      <div className="col-span-5">
        <h4 className="text-sm font-medium text-white group-hover:text-[var(--purple-light)] transition-colors">
          {category.name}
        </h4>
        <p className="text-xs text-[var(--foreground-muted)] line-clamp-1">
          {category.description}
        </p>
      </div>

      {/* Preference Count */}
      <div className="col-span-2 text-center">
        <span className="text-sm font-bold text-[var(--foreground-light)]">
          {category.preference_count || 0}
        </span>
        <p className="text-xs text-[var(--foreground-muted)]">prefs</p>
      </div>

      {/* Read Permission */}
      <div className="col-span-2 flex justify-center">
        <PermissionToggle
          enabled={canRead}
          onChange={(enabled) => onPermissionChange(category.id, 'read', enabled)}
          type="read"
        />
      </div>

      {/* Write Permission */}
      <div className="col-span-2 flex justify-center">
        <PermissionToggle
          enabled={canWrite}
          onChange={(enabled) => {
            onPermissionChange(category.id, 'write', enabled);
            // Update write access tracking
            onWriteAccessChange(enabled || hasWriteAccess);
          }}
          type="write"
          disabled={!canRead} // Can't write without read access
        />
      </div>

      {/* Status Indicator */}
      <div className="col-span-1 flex justify-center">
        {canWrite ? (
          <div className="w-2 h-2 bg-[var(--purple-primary)] rounded-full" title="Full Access" />
        ) : canRead ? (
          <div className="w-2 h-2 bg-[var(--success)] rounded-full" title="Read Only" />
        ) : (
          <div className="w-2 h-2 bg-[var(--surface)] rounded-full" title="No Access" />
        )}
      </div>
    </div>
  );
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
    <div className={`w-16 h-16 bg-gradient-to-br ${colorClass} rounded-xl flex items-center justify-center`}>
      <span className="text-white text-lg font-bold">{initials}</span>
    </div>
  );
}

export default function AppSettingsModal({ app, onClose, onSave }: AppSettingsModalProps) {
  const [permissions, setPermissions] = useState(app.permissions || []);
  const [isActive, setIsActive] = useState(app.is_active);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { user } = useAuth();
  const { data: categories } = useCategories(user?.id);
  const updatePermissionsMutation = useUpdateAppPermissions();

  // Track if app has any write permissions
  const hasWriteAccess = permissions.some(p => p.can_write);

  useEffect(() => {
    const hasChanges = 
      isActive !== app.is_active ||
      JSON.stringify(permissions) !== JSON.stringify(app.permissions || []);
    setHasUnsavedChanges(hasChanges);
  }, [permissions, isActive, app]);

  const handlePermissionChange = (categoryId: string, type: 'read' | 'write', enabled: boolean) => {
    setPermissions(prev => {
      const existing = prev.find(p => p.category_id === categoryId);
      const categoryName = categories?.categories.find(c => c.id === categoryId)?.name || '';
      
      if (existing) {
        return prev.map(p => 
          p.category_id === categoryId 
            ? { 
                ...p, 
                [type === 'read' ? 'can_read' : 'can_write']: enabled,
                // If disabling read, also disable write
                ...(type === 'read' && !enabled ? { can_write: false } : {})
              }
            : p
        );
      } else if (enabled) {
        return [...prev, {
          category_id: categoryId,
          category_name: categoryName,
          can_read: type === 'read',
          can_write: type === 'write'
        }];
      }
      return prev;
    });
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      // Update each permission individually using the API structure
      for (const permission of permissions) {
        await updatePermissionsMutation.mutateAsync({
          userId: user.id,
          data: {
            app_id: app.id,
            category_id: permission.category_id,
            can_read: permission.can_read,
            can_write: permission.can_write
          }
        });
      }
      
      const updatedApp = {
        ...app,
        is_active: isActive,
        permissions: permissions
      };
      
      onSave(updatedApp);
      onClose();
    } catch (error) {
      console.error('Failed to save permissions:', error);
      // You could add a toast notification here
    } finally {
      setIsSaving(false);
    }
  };

  const readCount = permissions.filter(p => p.can_read).length;
  const writeCount = permissions.filter(p => p.can_write).length;
  const totalCategories = categories?.categories.length || 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--background)] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--surface)]">
          <div className="flex items-center space-x-4">
            <AppIcon name={app.name} />
            <div>
              <h2 className="font-heading text-2xl font-bold text-white">
                {app.name}
              </h2>
              <p className="text-[var(--foreground-muted)]">{app.description}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <span className="text-[var(--foreground-light)]">
                  Trust Score: <span className={`font-bold ${
                    (app.trust_score || 0) >= 8 ? 'text-[var(--success)]' :
                    (app.trust_score || 0) >= 6 ? 'text-[var(--warning)]' :
                    'text-[var(--error)]'
                  }`}>{(app.trust_score || 0).toFixed(1)}/10</span>
                </span>
                <span className="text-[var(--foreground-muted)]">•</span>
                <span className="text-[var(--foreground-light)]">
                  {app.queries_made || 0} queries made
                </span>
                <span className="text-[var(--foreground-muted)]">•</span>
                <span className="text-[var(--foreground-light)]">
                  {app.preferences_contributed || 0} contributions
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-[var(--surface)] hover:bg-[var(--surface-light)] rounded-lg flex items-center justify-center transition-colors"
          >
            <div className="w-4 h-4 relative">
              <div className="absolute inset-0 bg-[var(--foreground-muted)] rounded-sm transform rotate-45"></div>
              <div className="absolute inset-0 bg-[var(--foreground-muted)] rounded-sm transform -rotate-45"></div>
            </div>
          </button>
        </div>

        {/* App Status Toggle */}
        <div className="p-6 border-b border-[var(--surface)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-lg font-semibold text-white mb-2">
                App Status
              </h3>
              <p className="text-sm text-[var(--foreground-muted)]">
                {isActive ? 'App can query preferences and contribute data' : 'App access is restricted'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-sm font-medium ${isActive ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                {isActive ? 'Active' : 'Restricted'}
              </span>
              <PermissionToggle
                enabled={isActive}
                onChange={setIsActive}
                type="read"
              />
            </div>
          </div>
        </div>

        {/* Permission Matrix */}
        <div className="p-6 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-heading text-lg font-semibold text-white mb-2">
                Permission Matrix
              </h3>
              <p className="text-sm text-[var(--foreground-muted)]">
                Control which preference categories this app can read from and write to
              </p>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-[var(--success)] rounded-full"></div>
                <span className="text-[var(--foreground-light)]">
                  {readCount}/{totalCategories} Read
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-[var(--purple-primary)] rounded-full"></div>
                <span className="text-[var(--foreground-light)]">
                  {writeCount}/{totalCategories} Write
                </span>
              </div>
            </div>
          </div>

          {/* Column Headers */}
          <div className="grid grid-cols-12 gap-4 items-center pb-3 mb-3 border-b border-[var(--surface)]">
            <div className="col-span-5">
              <span className="text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wide">
                Category
              </span>
            </div>
            <div className="col-span-2 text-center">
              <span className="text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wide">
                Count
              </span>
            </div>
            <div className="col-span-2 text-center">
              <span className="text-xs font-medium text-[var(--success)] uppercase tracking-wide">
                Read
              </span>
            </div>
            <div className="col-span-2 text-center">
              <span className="text-xs font-medium text-[var(--purple-primary)] uppercase tracking-wide">
                Write
              </span>
            </div>
            <div className="col-span-1 text-center">
              <span className="text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wide">
                Status
              </span>
            </div>
          </div>

          {/* Permission Rows */}
          <div className="flex-1 overflow-y-auto">
            {categories?.categories.map((category) => {
              const permission = permissions.find(p => p.category_id === category.id);
              return (
                <CategoryRow
                  key={category.id}
                  category={category}
                  permission={permission}
                  onPermissionChange={handlePermissionChange}
                  hasWriteAccess={hasWriteAccess}
                  onWriteAccessChange={() => {}} // This gets handled in the permission change
                />
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-[var(--surface)] flex-shrink-0">
            <div className="flex space-x-2">
              <button 
                onClick={() => {
                  // Grant read access to all categories
                  if (categories?.categories) {
                    const allReadPermissions = categories.categories.map(cat => ({
                      category_id: cat.id,
                      category_name: cat.name,
                      can_read: true,
                      can_write: permissions.find(p => p.category_id === cat.id)?.can_write || false
                    }));
                    setPermissions(allReadPermissions);
                  }
                }}
                className="px-3 py-2 text-xs bg-[var(--success)]/20 text-[var(--success)] rounded-lg hover:bg-[var(--success)] hover:text-white transition-colors"
              >
                Grant All Read
              </button>
              <button 
                onClick={() => {
                  // Remove all permissions
                  setPermissions([]);
                }}
                className="px-3 py-2 text-xs bg-[var(--error)]/20 text-[var(--error)] rounded-lg hover:bg-[var(--error)] hover:text-white transition-colors"
              >
                Revoke All
              </button>
            </div>
            
            {hasWriteAccess && (
              <div className="flex items-center space-x-2 text-xs text-[var(--warning)]">
                <div className="w-3 h-3 border border-[var(--warning)] rounded-sm"></div>
                <span>This app can modify your preferences</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[var(--surface)] bg-[var(--surface)]/20">
          <div className="text-sm text-[var(--foreground-muted)]">
            {hasUnsavedChanges && (
              <span className="text-[var(--warning)]">● Unsaved changes</span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-[var(--surface)] text-[var(--foreground-light)] rounded-lg hover:bg-[var(--surface-light)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className="px-4 py-2 text-sm bg-[var(--purple-primary)] text-white rounded-lg hover:bg-[var(--purple-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}