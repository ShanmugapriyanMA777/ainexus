import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { AdminUser } from '../../types';
import { 
  ShieldAlert, ShieldCheck, Users, Search, Trash2, Ban, Shield, AlertTriangle 
} from 'lucide-react';

const AdminPanel: React.FC = () => {
  const { user: currentUser } = useAuth();
  
  // Guard access control
  if (!currentUser?.is_admin) {
    return <ForbiddenGate />;
  }

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching admin user list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBanToggle = async (user: AdminUser) => {
    if (user.id === currentUser.id) {
      alert('You cannot suspend your own administrative session.');
      return;
    }
    
    const nextBan = !user.is_banned;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: nextBan })
        .eq('id', user.id);

      if (error) throw error;
      
      setUsers(prev => 
        prev.map(u => u.id === user.id ? { ...u, is_banned: nextBan } : u)
      );
      triggerBanner(`User "${user.full_name}" is now ${nextBan ? 'suspended' : 'active'}.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdminToggle = async (user: AdminUser) => {
    if (user.id === currentUser.id) {
      alert('You cannot revoke your own admin rights.');
      return;
    }
    
    const nextAdminState = !user.is_admin;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: nextAdminState })
        .eq('id', user.id);

      if (error) throw error;

      setUsers(prev => 
        prev.map(u => u.id === user.id ? { ...u, is_admin: nextAdminState } : u)
      );
      triggerBanner(`Security credentials updated for ${user.full_name}.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (user.id === currentUser.id) {
      alert('You cannot delete your own profile.');
      return;
    }

    if (confirm(`Are you sure you want to permanently delete user "${user.full_name}"? This action will cascade delete all their conversations and settings records.`)) {
      try {
        const { error } = await supabase.from('profiles').delete().eq('id', user.id);
        if (error) throw error;
        
        setUsers(prev => prev.filter(u => u.id !== user.id));
        triggerBanner('Profile record successfully purged.');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const triggerBanner = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const filteredUsers = users.filter(u => 
    (u.full_name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="h-full w-full overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-6 md:p-10 select-none">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Panel Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Admin Command Center</h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">Platform-wide governance metrics, profile registry modifications, and security overrides.</p>
          </div>

          {successMsg && (
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-3.5 py-1.5 text-xs text-violet-500 dark:text-violet-400 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <ShieldCheck size={14} />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Aggregate Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Registered Users</span>
              <span className="block text-2xl font-bold text-zinc-800 dark:text-zinc-150">{users.length}</span>
            </div>
          </div>
          
          <div className="glass-panel rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <Ban size={20} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Suspended Sessions</span>
              <span className="block text-2xl font-bold text-zinc-800 dark:text-zinc-150">
                {users.filter(u => u.is_banned).length}
              </span>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Administrators</span>
              <span className="block text-2xl font-bold text-zinc-800 dark:text-zinc-150">
                {users.filter(u => u.is_admin).length}
              </span>
            </div>
          </div>
        </div>

        {/* User Search & Table Card */}
        <div className="glass-panel rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Security Registry</span>
            
            {/* Search filter input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 text-zinc-400" size={15} />
              <input
                type="text"
                placeholder="Search profiles or email logs..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/40 py-2 pl-9 pr-4 text-xs outline-none text-zinc-800 dark:text-zinc-300 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
              />
            </div>
          </div>

          {/* User profile table list */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-8 text-center text-zinc-400 text-xs flex flex-col items-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Reading directory profiles...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-xs italic">
                No user profiles match the query indices.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-900 text-zinc-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4">Role Access</th>
                    <th className="py-3 px-4">Registration</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 font-medium">
                  {filteredUsers.map((u) => (
                    <tr 
                      key={u.id}
                      className="hover:bg-zinc-100/30 dark:hover:bg-zinc-900/10 transition-colors"
                    >
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        <img 
                          src={u.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg'} 
                          alt="avatar" 
                          className="h-8 w-8 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 object-cover"
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{u.full_name || 'Alex Developer'}</span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{u.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          u.is_admin 
                            ? 'bg-violet-500/10 text-violet-500 border border-violet-500/20' 
                            : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400'
                        }`}>
                          <Shield size={10} />
                          <span>{u.is_admin ? 'Admin' : 'User'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400">
                        {new Date(u.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                          u.is_banned
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${u.is_banned ? 'bg-red-500' : 'bg-emerald-500'}`} />
                          <span>{u.is_banned ? 'Banned' : 'Active'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAdminToggle(u)}
                            className="h-7 px-2 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            title={u.is_admin ? 'Revoke Admin' : 'Grant Admin'}
                          >
                            <Shield size={12} />
                          </button>
                          
                          <button
                            onClick={() => handleBanToggle(u)}
                            className={`h-7 px-2 flex items-center justify-center rounded-lg border transition-all ${
                              u.is_banned 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20' 
                                : 'border-zinc-200 dark:border-zinc-800/40 hover:bg-red-500/10 hover:text-red-500 text-zinc-400'
                            }`}
                            title={u.is_banned ? 'Unban session' : 'Ban session'}
                          >
                            <Ban size={12} />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="h-7 px-2 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800/40 hover:bg-red-500/10 hover:text-red-500 text-zinc-400"
                            title="Delete profile"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// 403 Forbidden Gate screen
const ForbiddenGate: React.FC = () => {
  return (
    <div className="h-full w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="glass-panel max-w-sm rounded-3xl border border-zinc-200/50 dark:border-zinc-800/40 p-8 text-center shadow-lg">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 font-semibold mb-4 text-xl">
          <AlertTriangle size={20} />
        </span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-red-500">Access Restricted</h3>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          This panel is protected by administrative security keys. Your session credentials do not possess the required policies to read this directory database.
        </p>
      </div>
    </div>
  );
};

export default AdminPanel;
