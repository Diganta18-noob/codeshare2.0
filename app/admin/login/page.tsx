'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        // Redirect to admin dashboard
        router.push('/admin');
      } else {
        setError(res.error || 'Invalid credentials');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden px-4">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            CodeShare <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Admin</span>
          </h1>
          <p className="text-sm text-slate-400">
            Sign in to access the control panel
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-800/50 text-red-200 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none transition-all"
              placeholder="admin@codeshare.io"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-lg py-3 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
