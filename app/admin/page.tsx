'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

type TabType = 'overview' | 'users' | 'rooms' | 'logs';

// Client-side cache defined globally to persist across tab/view switches
const clientCache = {
  stats: null as any,
  users: {} as Record<string, any>,
  rooms: {} as Record<string, any>,
  logs: {} as Record<string, any>,
  lastUpdated: {} as Record<string, number>,
};

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, checkAuth, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Stats / Chart State
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, totalPads: 0, totalEdits: 0 });
  const [recentPads, setRecentPads] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [languageStats, setLanguageStats] = useState<any[]>([]);
  const [activityStats, setActivityStats] = useState<any[]>([]);

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

  // Sync / Cache state
  const [cacheInfo, setCacheInfo] = useState<{ isCached: boolean; timestamp: number | null }>({ isCached: false, timestamp: null });
  const [isSyncing, setIsSyncing] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

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

  // Cache Clear helper
  const clearClientCache = () => {
    clientCache.stats = null;
    clientCache.users = {};
    clientCache.rooms = {};
    clientCache.logs = {};
    clientCache.lastUpdated = {};
  };

  // Fetch Overview Stats
  const fetchStats = async (forceRefresh = false) => {
    if (!forceRefresh && clientCache.stats) {
      const data = clientCache.stats;
      setStats(data.stats);
      setRecentPads(data.recentPads || []);
      setRecentLogs(data.recentLogs || []);
      setLanguageStats(data.languageStats || []);
      setActivityStats(data.activityStats || []);
      setCacheInfo({ isCached: true, timestamp: clientCache.lastUpdated.stats });

      // Run SWR background fetch
      triggerStatsBackgroundFetch();
      return;
    }

    setIsSyncing(true);
    try {
      const res = await fetch(`/api/admin/stats${forceRefresh ? '?refresh=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentPads(data.recentPads || []);
        setRecentLogs(data.recentLogs || []);
        setLanguageStats(data.languageStats || []);
        setActivityStats(data.activityStats || []);

        clientCache.stats = data;
        clientCache.lastUpdated.stats = Date.now();
        setCacheInfo({ isCached: data.cached || false, timestamp: data.cached ? data.timestamp : Date.now() });
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const triggerStatsBackgroundFetch = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentPads(data.recentPads || []);
        setRecentLogs(data.recentLogs || []);
        setLanguageStats(data.languageStats || []);
        setActivityStats(data.activityStats || []);

        clientCache.stats = data;
        clientCache.lastUpdated.stats = Date.now();
        setCacheInfo({ isCached: data.cached || false, timestamp: data.cached ? data.timestamp : Date.now() });
      }
    } catch (err) {
      console.error('Background stats fetch failed:', err);
    }
  };

  // Fetch Users
  const fetchUsers = async (searchVal = debouncedUsersSearch, page = usersPage, forceRefresh = false) => {
    const cacheKey = `${searchVal}_p:${page}`;
    if (!forceRefresh && clientCache.users[cacheKey]) {
      const data = clientCache.users[cacheKey];
      setUsers(data.users || []);
      setUsersTotalPages(data.pagination?.pages || 1);
      setCacheInfo({ isCached: true, timestamp: clientCache.lastUpdated[`users_${cacheKey}`] });

      triggerUsersBackgroundFetch(searchVal, page, cacheKey);
      return;
    }

    setUsersLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(searchVal)}&page=${page}&limit=8${forceRefresh ? '&refresh=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setUsersTotalPages(data.pagination?.pages || 1);

        clientCache.users[cacheKey] = data;
        clientCache.lastUpdated[`users_${cacheKey}`] = Date.now();
        setCacheInfo({ isCached: data.cached || false, timestamp: data.cached ? data.timestamp : Date.now() });
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const triggerUsersBackgroundFetch = async (searchVal: string, page: number, cacheKey: string) => {
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(searchVal)}&page=${page}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setUsersTotalPages(data.pagination?.pages || 1);

        clientCache.users[cacheKey] = data;
        clientCache.lastUpdated[`users_${cacheKey}`] = Date.now();
        setCacheInfo({ isCached: data.cached || false, timestamp: data.cached ? data.timestamp : Date.now() });
      }
    } catch (err) {
      console.error('Background users fetch failed:', err);
    }
  };

  // Fetch Rooms
  const fetchRooms = async (searchVal = debouncedRoomsSearch, page = roomsPage, forceRefresh = false) => {
    const cacheKey = `${searchVal}_p:${page}`;
    if (!forceRefresh && clientCache.rooms[cacheKey]) {
      const data = clientCache.rooms[cacheKey];
      setRooms(data.rooms || []);
      setRoomsTotalPages(data.pagination?.pages || 1);
      setCacheInfo({ isCached: true, timestamp: clientCache.lastUpdated[`rooms_${cacheKey}`] });

      triggerRoomsBackgroundFetch(searchVal, page, cacheKey);
      return;
    }

    setRoomsLoading(true);
    try {
      const res = await fetch(`/api/admin/rooms?q=${encodeURIComponent(searchVal)}&page=${page}&limit=8${forceRefresh ? '&refresh=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
        setRoomsTotalPages(data.pagination?.pages || 1);

        clientCache.rooms[cacheKey] = data;
        clientCache.lastUpdated[`rooms_${cacheKey}`] = Date.now();
        setCacheInfo({ isCached: data.cached || false, timestamp: data.cached ? data.timestamp : Date.now() });
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setRoomsLoading(false);
    }
  };

  const triggerRoomsBackgroundFetch = async (searchVal: string, page: number, cacheKey: string) => {
    try {
      const res = await fetch(`/api/admin/rooms?q=${encodeURIComponent(searchVal)}&page=${page}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
        setRoomsTotalPages(data.pagination?.pages || 1);

        clientCache.rooms[cacheKey] = data;
        clientCache.lastUpdated[`rooms_${cacheKey}`] = Date.now();
        setCacheInfo({ isCached: data.cached || false, timestamp: data.cached ? data.timestamp : Date.now() });
      }
    } catch (err) {
      console.error('Background rooms fetch failed:', err);
    }
  };

  // Fetch Logs
  const fetchLogs = async (filter = logsFilter, page = logsPage, forceRefresh = false) => {
    const cacheKey = `${filter}_p:${page}`;
    if (!forceRefresh && clientCache.logs[cacheKey]) {
      const data = clientCache.logs[cacheKey];
      setLogs(data.logs || []);
      setLogsTotalPages(data.pagination?.pages || 1);
      setCacheInfo({ isCached: true, timestamp: clientCache.lastUpdated[`logs_${cacheKey}`] });

      triggerLogsBackgroundFetch(filter, page, cacheKey);
      return;
    }

    setLogsLoading(true);
    try {
      const res = await fetch(`/api/admin/logs?action=${filter}&page=${page}&limit=12${forceRefresh ? '&refresh=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setLogsTotalPages(data.pagination?.pages || 1);

        clientCache.logs[cacheKey] = data;
        clientCache.lastUpdated[`logs_${cacheKey}`] = Date.now();
        setCacheInfo({ isCached: data.cached || false, timestamp: data.cached ? data.timestamp : Date.now() });
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const triggerLogsBackgroundFetch = async (filter: string, page: number, cacheKey: string) => {
    try {
      const res = await fetch(`/api/admin/logs?action=${filter}&page=${page}&limit=12`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setLogsTotalPages(data.pagination?.pages || 1);

        clientCache.logs[cacheKey] = data;
        clientCache.lastUpdated[`logs_${cacheKey}`] = Date.now();
        setCacheInfo({ isCached: data.cached || false, timestamp: data.cached ? data.timestamp : Date.now() });
      }
    } catch (err) {
      console.error('Background logs fetch failed:', err);
    }
  };

  // Tab Triggers
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin' && activeTab === 'overview') {
      fetchStats(false);
    }
  }, [activeTab, isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin' && activeTab === 'users') {
      fetchUsers(debouncedUsersSearch, usersPage, false);
    }
  }, [activeTab, isAuthenticated, user, debouncedUsersSearch, usersPage]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin' && activeTab === 'rooms') {
      fetchRooms(debouncedRoomsSearch, roomsPage, false);
    }
  }, [activeTab, isAuthenticated, user, debouncedRoomsSearch, roomsPage]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin' && activeTab === 'logs') {
      fetchLogs(logsFilter, logsPage, false);
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
        clearClientCache();
        fetchUsers(debouncedUsersSearch, usersPage, true);
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
            clearClientCache();
            fetchUsers(debouncedUsersSearch, usersPage, true);
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
            clearClientCache();
            fetchRooms(debouncedRoomsSearch, roomsPage, true);
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

  const formatCacheAge = () => {
    if (!cacheInfo.timestamp) return '';
    const seconds = Math.max(0, Math.round((Date.now() - cacheInfo.timestamp) / 1000));
    if (seconds < 5) return 'just now';
    return `${seconds}s ago`;
  };

  // SVG Chart Renders
  const renderActivityChart = () => {
    if (activityStats.length === 0) {
      return (
        <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
          No activity logs recorded in the last 7 days
        </div>
      );
    }

    const width = 500;
    const height = 200;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxCount = Math.max(...activityStats.map((d) => d.count), 5);

    const points = activityStats.map((d, idx) => {
      const x = paddingLeft + (idx * chartWidth) / (activityStats.length - 1 || 1);
      const y = height - paddingBottom - (d.count * chartHeight) / maxCount;
      return { x, y, label: d._id, count: d.count };
    });

    const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = points.length > 0 ? `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z` : '';

    return (
      <div className="relative w-full h-[220px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full text-slate-400">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + ratio * chartHeight;
            const val = Math.round(maxCount - ratio * maxCount);
            return (
              <g key={idx} className="opacity-15">
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" strokeDasharray="4 4" />
                <text x={paddingLeft - 10} y={y + 4} textAnchor="end" className="text-[10px] font-mono fill-slate-400">{val}</text>
              </g>
            );
          })}

          {/* Area under the line */}
          {areaD && <path d={areaD} fill="url(#areaGradient)" />}

          {/* The line itself */}
          {pathD && <path d={pathD} fill="none" stroke="url(#lineGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

          {/* Dots on points */}
          {points.map((p, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle cx={p.x} cy={p.y} r="4.5" className="fill-violet-500 stroke-slate-950 stroke-[2.5px] hover:r-6 hover:fill-violet-400 transition-all duration-150 animate-fade-in" />
              <title>{`${p.label}: ${p.count} events`}</title>
            </g>
          ))}

          {/* X Axis Labels */}
          {points.map((p, idx) => {
            const dateStr = new Date(p.label).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            return (
              <text key={idx} x={p.x} y={height - 10} textAnchor="middle" className="text-[9px] font-mono fill-slate-500 opacity-80">
                {dateStr}
              </text>
            );
          })}
        </svg>
      </div>
    );
  };

  const renderLanguageChart = () => {
    if (languageStats.length === 0) {
      return (
        <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
          No languages statistics available
        </div>
      );
    }

    const totalRooms = stats.totalPads || languageStats.reduce((sum, item) => sum + item.count, 0) || 1;
    const circumference = 251.2;
    let accumulatedPercent = 0;

    const donutColors = [
      'stroke-violet-500',
      'stroke-indigo-400',
      'stroke-emerald-400',
      'stroke-amber-400',
      'stroke-rose-400',
    ];
    
    const donutBgColors = [
      'bg-violet-500',
      'bg-indigo-400',
      'bg-emerald-400',
      'bg-amber-400',
      'bg-rose-400',
    ];

    return (
      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
        <div className="relative w-36 h-36">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1e293b" strokeWidth="8" />
            {languageStats.map((item, idx) => {
              const pct = (item.count / totalRooms) * 100;
              const strokeDasharray = `${(pct * circumference) / 100} ${circumference}`;
              const strokeDashoffset = circumference - (accumulatedPercent * circumference) / 100;
              accumulatedPercent += pct;

              return (
                <circle
                  key={item._id}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  strokeWidth="8"
                  className={`transition-all duration-300 hover:stroke-[10px] cursor-pointer ${donutColors[idx % donutColors.length]}`}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                >
                  <title>{`${item._id.toUpperCase()}: ${item.count} rooms (${pct.toFixed(1)}%)`}</title>
                </circle>
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold">{totalRooms}</span>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider">Total Pads</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 max-w-[200px] w-full">
          {languageStats.map((item, idx) => {
            const pct = ((item.count / totalRooms) * 100).toFixed(1);
            return (
              <div key={item._id} className="flex items-center justify-between text-xs w-full">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${donutBgColors[idx % donutBgColors.length]}`} />
                  <span className="font-mono text-slate-300 font-semibold truncate uppercase w-16 text-left">{item._id}</span>
                </div>
                <div className="flex gap-3 text-right">
                  <span className="text-slate-400 font-mono w-8">{item.count}</span>
                  <span className="text-slate-500 font-mono w-12">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const isTabLoading = () => {
    if (activeTab === 'overview' && isSyncing && !clientCache.stats) return true;
    if (activeTab === 'users' && usersLoading && users.length === 0) return true;
    if (activeTab === 'rooms' && roomsLoading && rooms.length === 0) return true;
    if (activeTab === 'logs' && logsLoading && logs.length === 0) return true;
    return false;
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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans selection:bg-violet-600 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/60 backdrop-blur-lg border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent drop-shadow-md">
            CodeShare Control Panel
          </span>
          <span className="bg-violet-950/80 text-violet-300 border border-violet-800 text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-wider shadow-inner">
            Admin
          </span>
        </div>

        <div className="flex items-center gap-6">
          {/* Server Connection Status & Cache Info */}
          <div className="hidden md:flex items-center gap-4">
            {/* Live Indicator */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-full text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
              <span className="text-slate-400 font-mono text-[11px]">Server: Online</span>
            </div>
            
            {/* Sync Bar */}
            <div className="flex items-center gap-3 bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-full text-xs">
              <span className={`w-1.5 h-1.5 rounded-full ${cacheInfo.isCached ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]' : 'bg-emerald-400'}`} />
              <span className="text-slate-400 text-[11px] font-mono">
                {cacheInfo.isCached ? `Cache (${formatCacheAge()})` : 'Live'}
              </span>
              <button
                onClick={() => {
                  if (activeTab === 'overview') fetchStats(true);
                  else if (activeTab === 'users') fetchUsers(debouncedUsersSearch, usersPage, true);
                  else if (activeTab === 'rooms') fetchRooms(debouncedRoomsSearch, roomsPage, true);
                  else if (activeTab === 'logs') fetchLogs(logsFilter, logsPage, true);
                }}
                disabled={isSyncing || usersLoading || roomsLoading || logsLoading}
                className="text-violet-400 hover:text-violet-300 transition-colors p-0.5"
                title="Force refresh data from database"
              >
                <svg className={`w-3.5 h-3.5 ${isSyncing || usersLoading || roomsLoading || logsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15H15M20 20v-5h-5.82" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 border-l border-slate-800 pl-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">{user.username}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-slate-900 hover:bg-slate-855 border border-slate-800 hover:border-slate-700 text-xs px-3.5 py-2 rounded-lg transition-all font-semibold active:scale-95 shadow-md"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 bg-slate-900/20 lg:border-r border-slate-900 p-6 space-y-2 lg:block">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-3 px-3">Navigation</div>
          
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center gap-3 border ${
              activeTab === 'overview'
                ? 'bg-violet-600/10 border-violet-500/25 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.05)] font-semibold'
                : 'border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Overview
          </button>
          
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center gap-3 border ${
              activeTab === 'users'
                ? 'bg-violet-600/10 border-violet-500/25 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.05)] font-semibold'
                : 'border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            User Database
          </button>
          
          <button
            onClick={() => setActiveTab('rooms')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center gap-3 border ${
              activeTab === 'rooms'
                ? 'bg-violet-600/10 border-violet-500/25 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.05)] font-semibold'
                : 'border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Rooms & Pads
          </button>
          
          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center gap-3 border ${
              activeTab === 'logs'
                ? 'bg-violet-600/10 border-violet-500/25 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.05)] font-semibold'
                : 'border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Audit Trail
          </button>

          {/* Quick Stats in Sidebar */}
          {clientCache.stats && (
            <div className="pt-6 mt-6 border-t border-slate-900 space-y-3 hidden lg:block">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider px-3">System Load</div>
              <div className="bg-slate-900/50 border border-slate-900/80 rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Total Rooms</span>
                  <span className="font-mono text-slate-200 font-semibold">{stats.totalPads}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Total Edits</span>
                  <span className="font-mono text-slate-200 font-semibold">{stats.totalEdits}</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto relative bg-slate-950">
          {/* Action Toast */}
          {actionMessage && (
            <div
              className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border text-sm flex items-center gap-4 animate-fade-in max-w-sm ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-950/90 backdrop-blur-md border-emerald-800/80 text-emerald-200 shadow-[0_4px_20px_rgba(16,185,129,0.15)]'
                  : 'bg-red-950/90 backdrop-blur-md border-red-800/80 text-red-200 shadow-[0_4px_20px_rgba(239,68,68,0.15)]'
              }`}
            >
              <div className="flex-1 font-medium">{actionMessage.text}</div>
              <button onClick={() => setActionMessage(null)} className="hover:text-white font-bold opacity-70 hover:opacity-100 transition-opacity p-0.5">
                ✕
              </button>
            </div>
          )}

          {/* Confirmation Modal */}
          {confirmDialog.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-fade-in">
                <h3 className="text-lg font-bold text-white mb-2">{confirmDialog.title}</h3>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">{confirmDialog.message}</p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDialog.onConfirm}
                    className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all shadow-lg shadow-red-900/30 active:scale-95"
                  >
                    Confirm Action
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sync status indicator for mobile */}
          <div className="md:hidden flex justify-between items-center bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 mb-6 text-xs">
            <span className="text-slate-400 font-mono">
              {cacheInfo.isCached ? `Cached data (${formatCacheAge()})` : 'Live stats'}
            </span>
            <button
              onClick={() => {
                if (activeTab === 'overview') fetchStats(true);
                else if (activeTab === 'users') fetchUsers(debouncedUsersSearch, usersPage, true);
                else if (activeTab === 'rooms') fetchRooms(debouncedRoomsSearch, roomsPage, true);
                else if (activeTab === 'logs') fetchLogs(logsFilter, logsPage, true);
              }}
              className="text-violet-400 font-semibold flex items-center gap-1 active:scale-95"
            >
              <svg className={`w-3.5 h-3.5 ${isSyncing || usersLoading || roomsLoading || logsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15H15M20 20v-5h-5.82" />
              </svg>
              Sync
            </button>
          </div>

          {/* First Load Skeleton */}
          {isTabLoading() ? (
            <div className="space-y-8 animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl h-[106px]" />
                ))}
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl h-[300px]" />
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl h-[300px]" />
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-8 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Stats Card 1 */}
                    <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:border-slate-700/80 border-t-2 border-t-violet-500 shadow-[0_0_15px_-3px_rgba(139,92,246,0.06)]">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Total Users</p>
                        <span className="p-1.5 rounded-lg bg-violet-600/10 text-violet-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </span>
                      </div>
                      <p className="text-3xl font-extrabold mt-3 font-mono">{stats.totalUsers}</p>
                    </div>

                    {/* Stats Card 2 */}
                    <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:border-slate-700/80 border-t-2 border-t-emerald-500 shadow-[0_0_15px_-3px_rgba(16,185,129,0.06)]">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Active Status</p>
                        <span className="p-1.5 rounded-lg bg-emerald-600/10 text-emerald-400 animate-pulse">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </span>
                      </div>
                      <p className="text-3xl font-extrabold mt-3 text-emerald-400 font-mono">{stats.activeUsers}</p>
                    </div>

                    {/* Stats Card 3 */}
                    <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:border-slate-700/80 border-t-2 border-t-blue-500 shadow-[0_0_15px_-3px_rgba(59,130,246,0.06)]">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Shared Pads</p>
                        <span className="p-1.5 rounded-lg bg-blue-600/10 text-blue-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </span>
                      </div>
                      <p className="text-3xl font-extrabold mt-3 font-mono">{stats.totalPads}</p>
                    </div>

                    {/* Stats Card 4 */}
                    <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:border-slate-700/80 border-t-2 border-t-pink-500 shadow-[0_0_15px_-3px_rgba(236,72,153,0.06)]">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Total Edits</p>
                        <span className="p-1.5 rounded-lg bg-pink-600/10 text-pink-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </span>
                      </div>
                      <p className="text-3xl font-extrabold mt-3 text-pink-400 font-mono">{stats.totalEdits}</p>
                    </div>
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Activity Chart Card */}
                    <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-6 shadow-md">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="text-base font-bold text-slate-200">System Activity Trend</h3>
                          <p className="text-xs text-slate-400">Audit logs recorded over the last 7 days</p>
                        </div>
                      </div>
                      {renderActivityChart()}
                    </div>

                    {/* Language Chart Card */}
                    <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-6 shadow-md">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="text-base font-bold text-slate-200">Programming Language Mix</h3>
                          <p className="text-xs text-slate-400">Distribution of languages across code rooms</p>
                        </div>
                      </div>
                      {renderLanguageChart()}
                    </div>
                  </div>

                  {/* Grid split */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Recent Pads */}
                    <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-bold text-slate-200">Active Code Pads</h3>
                        <span className="text-[10px] text-slate-400 font-mono uppercase bg-slate-950 px-2 py-1 rounded">Real-time</span>
                      </div>
                      <div className="divide-y divide-slate-800/60">
                        {recentPads.length === 0 ? (
                          <p className="text-sm text-slate-500 py-6 text-center">No active rooms found</p>
                        ) : (
                          recentPads.map((rp) => (
                            <div key={rp._id} className="py-3.5 flex justify-between items-center text-sm group hover:bg-slate-900/20 px-2 rounded-xl transition-all">
                              <div>
                                <p className="font-mono text-violet-300 font-semibold group-hover:text-violet-200 transition-colors">{rp.roomId}</p>
                                <p className="text-xs text-slate-400 mt-0.5">Language: <span className="uppercase text-slate-300 font-semibold text-[10px] font-mono">{rp.language}</span></p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-semibold text-slate-200 font-mono">{rp.totalEdits || 0} edits</p>
                                <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                  {new Date(rp.lastAccessedAt || rp.updatedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Recent Audit Logs */}
                    <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-bold text-slate-200">Latest Security Events</h3>
                        <span className="text-[10px] text-slate-400 font-mono uppercase bg-slate-950 px-2 py-1 rounded">Logs</span>
                      </div>
                      <div className="divide-y divide-slate-800/60">
                        {recentLogs.length === 0 ? (
                          <p className="text-sm text-slate-500 py-6 text-center">No logs available</p>
                        ) : (
                          recentLogs.map((log) => (
                            <div key={log._id} className="py-3.5 text-sm hover:bg-slate-900/20 px-2 rounded-xl transition-all">
                              <div className="flex justify-between items-start">
                                <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-900 font-semibold uppercase">
                                  {log.action}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {new Date(log.createdAt).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-slate-300 mt-2 text-xs leading-relaxed">{log.details}</p>
                              <p className="text-[9px] text-slate-500 mt-1 font-mono leading-none truncate">
                                IP: {log.ipAddress} | UA: {log.userAgent?.slice(0, 50)}...
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
                    <div>
                      <h3 className="text-lg font-bold text-slate-200">Registered Accounts</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Manage statuses, edit privileges, and delete users</p>
                    </div>
                    <input
                      type="text"
                      placeholder="Search user profile..."
                      value={usersSearch}
                      onChange={(e) => {
                        setUsersSearch(e.target.value);
                        setUsersPage(1);
                      }}
                      className="bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-white focus:border-violet-500 outline-none w-full sm:max-w-xs transition-colors"
                    />
                  </div>

                  {/* Table */}
                  <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden shadow-inner">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-900 uppercase tracking-wider text-[10px] font-semibold">
                            <th className="p-4">Username</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Rooms Created</th>
                            <th className="p-4">Edits</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900">
                          {users.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                                No users matching search filter
                              </td>
                            </tr>
                          ) : (
                            users.map((usr) => (
                              <tr key={usr._id} className="hover:bg-slate-900/20 transition-colors">
                                <td className="p-4 font-semibold text-slate-200">{usr.username}</td>
                                <td className="p-4 text-slate-400 font-mono text-xs">{usr.email}</td>
                                <td className="p-4 capitalize">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider ${
                                      usr.role === 'admin' ? 'bg-violet-950/80 border border-violet-850 text-violet-300' : 'bg-slate-900 border border-slate-850 text-slate-400'
                                    }`}
                                  >
                                    {usr.role}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <select
                                    value={usr.status}
                                    onChange={(e) => handleUserStatusChange(usr._id, e.target.value)}
                                    className={`bg-slate-950 border border-slate-850 rounded-lg text-xs px-2.5 py-1.5 focus:border-violet-500 focus:outline-none transition-colors ${
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
                                <td className="p-4 font-mono text-xs text-slate-300 font-semibold">{usr.roomsCreated || 0}</td>
                                <td className="p-4 font-mono text-xs text-slate-300 font-semibold">{usr.totalEdits || 0}</td>
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => handleUserDelete(usr._id)}
                                    className="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
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
                      <div className="p-4 border-t border-slate-900 flex justify-between items-center bg-slate-900/20">
                        <button
                          onClick={() => setUsersPage((p) => Math.max(p - 1, 1))}
                          disabled={usersPage === 1}
                          className="bg-slate-900 border border-slate-855 hover:bg-slate-800 text-xs px-3 py-1.5 rounded-lg disabled:opacity-30 transition-all font-semibold"
                        >
                          Previous
                        </button>
                        <span className="text-xs text-slate-500 font-mono">
                          Page {usersPage} of {usersTotalPages}
                        </span>
                        <button
                          onClick={() => setUsersPage((p) => Math.min(p + 1, usersTotalPages))}
                          disabled={usersPage === usersTotalPages}
                          className="bg-slate-900 border border-slate-855 hover:bg-slate-800 text-xs px-3 py-1.5 rounded-lg disabled:opacity-30 transition-all font-semibold"
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
                    <div>
                      <h3 className="text-lg font-bold text-slate-200">Active Code Rooms</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Purge code rooms, monitor active views and changes</p>
                    </div>
                    <input
                      type="text"
                      placeholder="Search Room ID..."
                      value={roomsSearch}
                      onChange={(e) => {
                        setRoomsSearch(e.target.value);
                        setRoomsPage(1);
                      }}
                      className="bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-white focus:border-violet-500 outline-none w-full sm:max-w-xs transition-colors"
                    />
                  </div>

                  {/* Table */}
                  <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden shadow-inner">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-900 uppercase tracking-wider text-[10px] font-semibold">
                            <th className="p-4">Room ID</th>
                            <th className="p-4">Language</th>
                            <th className="p-4">Views</th>
                            <th className="p-4">Edits</th>
                            <th className="p-4">Last Modified</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900">
                          {rooms.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                                No active code rooms found
                              </td>
                            </tr>
                          ) : (
                            rooms.map((rm) => (
                              <tr key={rm._id} className="hover:bg-slate-900/20 transition-colors">
                                <td className="p-4 font-mono text-violet-300 font-semibold text-xs">{rm.roomId}</td>
                                <td className="p-4 uppercase font-mono text-xs text-slate-300 font-semibold">{rm.language}</td>
                                <td className="p-4 font-mono text-xs text-slate-300 font-semibold">{rm.totalViews || 0}</td>
                                <td className="p-4 font-mono text-xs text-slate-300 font-semibold">{rm.totalEdits || 0}</td>
                                <td className="p-4 text-slate-400 font-mono text-xs">
                                  {new Date(rm.updatedAt).toLocaleString()}
                                </td>
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => handleRoomDelete(rm.roomId)}
                                    className="text-red-400 hover:text-red-300 text-xs font-semibold px-2.5 py-1 rounded hover:bg-red-500/10 transition-colors"
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
                      <div className="p-4 border-t border-slate-900 flex justify-between items-center bg-slate-900/20">
                        <button
                          onClick={() => setRoomsPage((p) => Math.max(p - 1, 1))}
                          disabled={roomsPage === 1}
                          className="bg-slate-900 border border-slate-855 hover:bg-slate-800 text-xs px-3 py-1.5 rounded-lg disabled:opacity-30 transition-all font-semibold"
                        >
                          Previous
                        </button>
                        <span className="text-xs text-slate-500 font-mono">
                          Page {roomsPage} of {roomsTotalPages}
                        </span>
                        <button
                          onClick={() => setRoomsPage((p) => Math.min(p + 1, roomsTotalPages))}
                          disabled={roomsPage === roomsTotalPages}
                          className="bg-slate-900 border border-slate-855 hover:bg-slate-800 text-xs px-3 py-1.5 rounded-lg disabled:opacity-30 transition-all font-semibold"
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
                    <div>
                      <h3 className="text-lg font-bold text-slate-200">Audit Logs</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Comprehensive audit trail of security and administration actions</p>
                    </div>
                    <select
                      value={logsFilter}
                      onChange={(e) => {
                        setLogsFilter(e.target.value);
                        setLogsPage(1);
                      }}
                      className="bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-white focus:border-violet-500 outline-none w-full sm:max-w-xs transition-colors"
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
                  <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden p-6 space-y-4 shadow-inner">
                    <div className="divide-y divide-slate-900/60">
                      {logs.length === 0 ? (
                        <p className="text-sm text-slate-500 py-8 text-center font-medium">No logs matching action category</p>
                      ) : (
                        logs.map((log) => (
                          <div key={log._id} className="py-4 text-sm flex flex-col md:flex-row justify-between md:items-center gap-4 hover:bg-slate-900/10 px-2 rounded-xl transition-all">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-850 font-bold uppercase tracking-wider">
                                  {log.action}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {new Date(log.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-slate-300 text-xs leading-relaxed">{log.details}</p>
                              <p className="text-[10px] text-slate-500 font-mono truncate">
                                Client IP: {log.ipAddress} | {log.userAgent}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Pagination */}
                    {logsTotalPages > 1 && (
                      <div className="pt-4 border-t border-slate-900 flex justify-between items-center bg-slate-900/20">
                        <button
                          onClick={() => setLogsPage((p) => Math.max(p - 1, 1))}
                          disabled={logsPage === 1}
                          className="bg-slate-900 border border-slate-855 hover:bg-slate-800 text-xs px-3 py-1.5 rounded-lg disabled:opacity-30 transition-all font-semibold"
                        >
                          Previous
                        </button>
                        <span className="text-xs text-slate-500 font-mono">
                          Page {logsPage} of {logsTotalPages}
                        </span>
                        <button
                          onClick={() => setLogsPage((p) => Math.min(p + 1, logsTotalPages))}
                          disabled={logsPage === logsTotalPages}
                          className="bg-slate-900 border border-slate-855 hover:bg-slate-800 text-xs px-3 py-1.5 rounded-lg disabled:opacity-30 transition-all font-semibold"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
