'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

type TabType = 'overview' | 'users' | 'rooms' | 'logs';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, checkAuth, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Stats State
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, totalPads: 0, totalEdits: 0 });
  const [recentPads, setRecentPads] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [usersSearch, setUsersSearch] = useState('');
  const [debouncedUsersSearch, setDebouncedUsersSearch] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);

  // Rooms State
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomsSearch, setRoomsSearch] = useState('');
  const [debouncedRoomsSearch, setDebouncedRoomsSearch] = useState('');
  const [roomsPage, setRoomsPage] = useState(1);
  const [roomsTotalPages, setRoomsTotalPages] = useState(1);

  // Full Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [logsFilter, setLogsFilter] = useState('');
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);

  // Action status/errors
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Debouncing for Users Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsersSearch(usersSearch);
    }, 350);
    return () => clearTimeout(timer);
  }, [usersSearch]);

  // Debouncing for Rooms Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRoomsSearch(roomsSearch);
    }, 350);
    return () => clearTimeout(timer);
  }, [roomsSearch]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/admin/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Fetch Overview Stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentPads(data.recentPads || []);
        setRecentLogs(data.recentLogs || []);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Fetch Users
  const fetchUsers = async (searchVal = debouncedUsersSearch) => {
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(searchVal)}&page=${usersPage}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setUsersTotalPages(data.pagination?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  // Fetch Rooms
  const fetchRooms = async (searchVal = debouncedRoomsSearch) => {
    try {
      const res = await fetch(`/api/admin/rooms?q=${encodeURIComponent(searchVal)}&page=${roomsPage}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
        setRoomsTotalPages(data.pagination?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    }
  };

  // Fetch Logs
  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/admin/logs?action=${logsFilter}&page=${logsPage}&limit=12`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setLogsTotalPages(data.pagination?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  // Tab 1 (Overview) Fetch Trigger
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin' && activeTab === 'overview') {
      fetchStats();
    }
  }, [activeTab, isAuthenticated, user]);

  // Tab 2 (Users) Fetch Trigger
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin' && activeTab === 'users') {
      fetchUsers(debouncedUsersSearch);
    }
  }, [activeTab, isAuthenticated, user, debouncedUsersSearch, usersPage]);

  // Tab 3 (Rooms) Fetch Trigger
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin' && activeTab === 'rooms') {
      fetchRooms(debouncedRoomsSearch);
    }
  }, [activeTab, isAuthenticated, user, debouncedRoomsSearch, roomsPage]);

  // Tab 4 (Logs) Fetch Trigger
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin' && activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab, isAuthenticated, user, logsFilter, logsPage]);

  // User Actions
  const handleUserStatusChange = async (userId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setActionMessage({ text: 'User status updated successfully.', type: 'success' });
        fetchUsers();
      } else {
        const data = await res.json();
        setActionMessage({ text: data.error || 'Failed to update user status.', type: 'error' });
      }
    } catch {
      setActionMessage({ text: 'Error performing user action.', type: 'error' });
    }
  };

  const handleUserDelete = (userId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete User',
      message: 'Are you sure you want to permanently delete this user account? This cannot be undone.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
          if (res.ok) {
            setActionMessage({ text: 'User deleted successfully.', type: 'success' });
            fetchUsers();
          } else {
            const data = await res.json();
            setActionMessage({ text: data.error || 'Failed to delete user.', type: 'error' });
          }
        } catch {
          setActionMessage({ text: 'Error deleting user.', type: 'error' });
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Room Actions
  const handleRoomDelete = (roomId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Purge Room',
      message: `Are you sure you want to delete room ${roomId}? All contents and history will be lost.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/rooms/${roomId}`, { method: 'DELETE' });
          if (res.ok) {
            setActionMessage({ text: 'Room deleted successfully.', type: 'success' });
            fetchRooms();
          } else {
            const data = await res.json();
            setActionMessage({ text: data.error || 'Failed to delete room.', type: 'error' });
          }
        } catch {
          setActionMessage({ text: 'Error deleting room.', type: 'error' });
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  if (isLoading || !isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading secure environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            CodeShare Control Panel
          </span>
          <span className="bg-violet-950/80 text-violet-300 border border-violet-800 text-[10px] px-2 py-0.5 rounded font-mono uppercase">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">{user.username}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-slate-700 text-xs px-3.5 py-2 rounded-lg transition-all"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 bg-slate-900/50 border-r border-slate-800 p-4 space-y-2 lg:block">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-center gap-3 ${
              activeTab === 'overview' ? 'bg-violet-600 text-white font-medium' : 'text-slate-400 hover:bg-slate-850 hover:text-white'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-center gap-3 ${
              activeTab === 'users' ? 'bg-violet-600 text-white font-medium' : 'text-slate-400 hover:bg-slate-850 hover:text-white'
            }`}
          >
            👥 User Management
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-center gap-3 ${
              activeTab === 'rooms' ? 'bg-violet-600 text-white font-medium' : 'text-slate-400 hover:bg-slate-850 hover:text-white'
            }`}
          >
            📂 Rooms & Pads
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-center gap-3 ${
              activeTab === 'logs' ? 'bg-violet-600 text-white font-medium' : 'text-slate-400 hover:bg-slate-850 hover:text-white'
            }`}
          >
            🛡️ Audit Trail
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto relative">
          {/* Action Toast */}
          {actionMessage && (
            <div
              className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border text-sm flex items-center gap-4 animate-fade-in max-w-sm ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-950/90 backdrop-blur-md border-emerald-800 text-emerald-200'
                  : 'bg-red-950/90 backdrop-blur-md border-red-800 text-red-200'
              }`}
            >
              <div className="flex-1">{actionMessage.text}</div>
              <button onClick={() => setActionMessage(null)} className="hover:text-white font-bold opacity-70 hover:opacity-100 transition-opacity">
                ✕
              </button>
            </div>
          )}

          {/* Confirmation Modal */}
          {confirmDialog.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-fade-in">
                <h3 className="text-xl font-bold text-white mb-2">{confirmDialog.title}</h3>
                <p className="text-slate-400 text-sm mb-6">{confirmDialog.message}</p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDialog.onConfirm}
                    className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors shadow-lg shadow-red-900/20"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Stats Card 1 */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
                  <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Total Users</p>
                  <p className="text-3xl font-extrabold mt-2">{stats.totalUsers}</p>
                </div>
                {/* Stats Card 2 */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
                  <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Active Status</p>
                  <p className="text-3xl font-extrabold mt-2 text-emerald-400">{stats.activeUsers}</p>
                </div>
                {/* Stats Card 3 */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
                  <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Shared Pads</p>
                  <p className="text-3xl font-extrabold mt-2">{stats.totalPads}</p>
                </div>
                {/* Stats Card 4 */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
                  <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Total Edits</p>
                  <p className="text-3xl font-extrabold mt-2 text-violet-400">{stats.totalEdits}</p>
                </div>
              </div>

              {/* Grid split */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Recent Pads */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold mb-4">Recent Actively Accessed Pads</h3>
                  <div className="divide-y divide-slate-800">
                    {recentPads.length === 0 ? (
                      <p className="text-sm text-slate-500 py-4">No active rooms found</p>
                    ) : (
                      recentPads.map((rp) => (
                        <div key={rp._id} className="py-3.5 flex justify-between items-center text-sm">
                          <div>
                            <p className="font-mono text-violet-300 font-semibold">{rp.roomId}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Language: {rp.language}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-300">{rp.totalEdits || 0} edits</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Accessed {new Date(rp.lastAccessedAt || rp.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent Audit Logs */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold mb-4">Latest Security Events</h3>
                  <div className="divide-y divide-slate-800">
                    {recentLogs.length === 0 ? (
                      <p className="text-sm text-slate-500 py-4">No logs available</p>
                    ) : (
                      recentLogs.map((log) => (
                        <div key={log._id} className="py-3.5 text-sm">
                          <div className="flex justify-between items-start">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {log.action}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(log.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-slate-300 mt-1.5 text-xs">{log.details}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            IP: {log.ipAddress} | UA: {log.userAgent?.slice(0, 40)}...
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-bold">User Database</h3>
                <input
                  type="text"
                  placeholder="Search user profile..."
                  value={usersSearch}
                  onChange={(e) => {
                    setUsersSearch(e.target.value);
                    setUsersPage(1);
                  }}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:border-violet-500 outline-none w-full sm:max-w-xs"
                />
              </div>

              {/* Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-850 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-xs">
                        <th className="p-4">Username</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Rooms</th>
                        <th className="p-4">Edits</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-500">
                            No users matching filter
                          </td>
                        </tr>
                      ) : (
                        users.map((usr) => (
                          <tr key={usr._id} className="hover:bg-slate-850/35 transition-colors">
                            <td className="p-4 font-semibold">{usr.username}</td>
                            <td className="p-4 text-slate-400">{usr.email}</td>
                            <td className="p-4 capitalize">
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${
                                  usr.role === 'admin' ? 'bg-violet-950 text-violet-300' : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {usr.role}
                              </span>
                            </td>
                            <td className="p-4">
                              <select
                                value={usr.status}
                                onChange={(e) => handleUserStatusChange(usr._id, e.target.value)}
                                className={`bg-slate-950 border border-slate-800 rounded text-xs px-2 py-1 focus:outline-none ${
                                  usr.status === 'active'
                                    ? 'text-emerald-400'
                                    : usr.status === 'suspended'
                                    ? 'text-amber-400'
                                    : 'text-red-400'
                                }`}
                                disabled={usr._id === user.id}
                              >
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                                <option value="banned">Banned</option>
                              </select>
                            </td>
                            <td className="p-4 font-mono">{usr.roomsCreated || 0}</td>
                            <td className="p-4 font-mono">{usr.totalEdits || 0}</td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleUserDelete(usr._id)}
                                className="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1"
                                disabled={usr._id === user.id}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {usersTotalPages > 1 && (
                  <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <button
                      onClick={() => setUsersPage((p) => Math.max(p - 1, 1))}
                      disabled={usersPage === 1}
                      className="bg-slate-850 hover:bg-slate-800 text-xs px-3 py-1.5 rounded disabled:opacity-30 disabled:hover:bg-slate-850 transition-all"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-slate-400">
                      Page {usersPage} of {usersTotalPages}
                    </span>
                    <button
                      onClick={() => setUsersPage((p) => Math.min(p + 1, usersTotalPages))}
                      disabled={usersPage === usersTotalPages}
                      className="bg-slate-850 hover:bg-slate-800 text-xs px-3 py-1.5 rounded disabled:opacity-30 disabled:hover:bg-slate-850 transition-all"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ROOMS & PADS */}
          {activeTab === 'rooms' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-bold">Created Pads</h3>
                <input
                  type="text"
                  placeholder="Search Room ID..."
                  value={roomsSearch}
                  onChange={(e) => {
                    setRoomsSearch(e.target.value);
                    setRoomsPage(1);
                  }}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:border-violet-500 outline-none w-full sm:max-w-xs"
                />
              </div>

              {/* Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-850 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-xs">
                        <th className="p-4">Room ID</th>
                        <th className="p-4">Language</th>
                        <th className="p-4">Views</th>
                        <th className="p-4">Edits</th>
                        <th className="p-4">Last Modified</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {rooms.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-500">
                            No active rooms found
                          </td>
                        </tr>
                      ) : (
                        rooms.map((rm) => (
                          <tr key={rm._id} className="hover:bg-slate-850/35 transition-colors">
                            <td className="p-4 font-mono text-violet-300 font-semibold">{rm.roomId}</td>
                            <td className="p-4 uppercase font-mono text-xs">{rm.language}</td>
                            <td className="p-4 font-mono">{rm.totalViews || 0}</td>
                            <td className="p-4 font-mono">{rm.totalEdits || 0}</td>
                            <td className="p-4 text-slate-400">
                              {new Date(rm.updatedAt).toLocaleString()}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleRoomDelete(rm.roomId)}
                                className="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1"
                              >
                                Purge
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {roomsTotalPages > 1 && (
                  <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <button
                      onClick={() => setRoomsPage((p) => Math.max(p - 1, 1))}
                      disabled={roomsPage === 1}
                      className="bg-slate-850 hover:bg-slate-800 text-xs px-3 py-1.5 rounded disabled:opacity-30 disabled:hover:bg-slate-850 transition-all"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-slate-400">
                      Page {roomsPage} of {roomsTotalPages}
                    </span>
                    <button
                      onClick={() => setRoomsPage((p) => Math.min(p + 1, roomsTotalPages))}
                      disabled={roomsPage === roomsTotalPages}
                      className="bg-slate-850 hover:bg-slate-800 text-xs px-3 py-1.5 rounded disabled:opacity-30 disabled:hover:bg-slate-850 transition-all"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {activeTab === 'logs' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-bold">Comprehensive Security Log</h3>
                <select
                  value={logsFilter}
                  onChange={(e) => {
                    setLogsFilter(e.target.value);
                    setLogsPage(1);
                  }}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:border-violet-500 outline-none w-full sm:max-w-xs"
                >
                  <option value="">All Security Events</option>
                  <option value="user.register">Registration</option>
                  <option value="user.login">Logins</option>
                  <option value="user.logout">Logouts</option>
                  <option value="user.suspend">Suspensions</option>
                  <option value="user.ban">Bans</option>
                  <option value="room.create">Room Creation</option>
                  <option value="room.delete">Room Purges</option>
                </select>
              </div>

              {/* Logs display */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6 space-y-4">
                <div className="divide-y divide-slate-800">
                  {logs.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6 text-center">No logs matching action category</p>
                  ) : (
                    logs.map((log) => (
                      <div key={log._id} className="py-4 text-sm flex flex-col md:flex-row justify-between md:items-center gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-750">
                              {log.action}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-300 text-xs mt-1.5">{log.details}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Client IP: {log.ipAddress} | {log.userAgent}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {logsTotalPages > 1 && (
                  <div className="pt-4 border-t border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <button
                      onClick={() => setLogsPage((p) => Math.max(p - 1, 1))}
                      disabled={logsPage === 1}
                      className="bg-slate-850 hover:bg-slate-800 text-xs px-3 py-1.5 rounded disabled:opacity-30 disabled:hover:bg-slate-850 transition-all"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-slate-400">
                      Page {logsPage} of {logsTotalPages}
                    </span>
                    <button
                      onClick={() => setLogsPage((p) => Math.min(p + 1, logsTotalPages))}
                      disabled={logsPage === logsTotalPages}
                      className="bg-slate-850 hover:bg-slate-800 text-xs px-3 py-1.5 rounded disabled:opacity-30 disabled:hover:bg-slate-850 transition-all"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
