import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/app/dashboard');
    } catch (err: any) {
      const data = err.response?.data;
      const details = data?.errors?.map((e: any) => e.message).join(' ');
      setError(details || data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col justify-between relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/3 -left-20 w-80 h-80 rounded-full solar-orb opacity-25 pointer-events-none" />

      {/* Top Brand Bar */}
      <div className="h-18 px-8 flex items-center justify-between border-b border-[#EAE2D5]/70 bg-white/40 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2 text-stone-900 font-bold text-lg">
          <span className="text-[#EA580C] text-xl font-black">✦</span>
          <span>EdQuest AI</span>
        </Link>
      </div>

      {/* Centered Solar Glass Login Box with Figma Orange Orb */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="relative w-full max-w-2xl flex items-center">
          {/* Glass Form Container */}
          <div className="w-full sm:w-[420px] bg-white/90 backdrop-blur-xl border border-[#EAE2D5] rounded-3xl p-8 sm:p-9 shadow-xl z-10">
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Welcome back</h2>
            <p className="text-xs text-stone-500 mt-1 mb-6">Continue your learning journey.</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button type="submit" className="w-full mt-2" isLoading={loading}>
                Sign in
              </Button>
            </form>

            <div className="mt-5 text-center">
              <span className="text-xs text-stone-400 uppercase tracking-wider font-semibold">
                or continue with
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                // Demo filler credentials
                setEmail('teacher@demo.edu');
                setPassword('password123');
              }}
              className="w-full mt-3 py-2.5 px-4 bg-stone-50 hover:bg-stone-100/80 border border-stone-200 rounded-xl text-stone-700 text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <span>Fill Demo Credentials (Teacher)</span>
            </button>

            <div className="mt-6 pt-5 border-t border-stone-100 flex items-center justify-between text-xs">
              <Link
                to="/forgot-password"
                className="text-stone-500 hover:text-[#EA580C] font-medium transition"
              >
                Forgot password?
              </Link>
              <Link
                to="/register"
                className="text-[#EA580C] hover:underline font-semibold transition"
              >
                Create account
              </Link>
            </div>
          </div>

          {/* Figma Signature Orange Sphere Orb on Right */}
          <div className="hidden sm:block absolute -right-6 w-56 h-56 rounded-full bg-[#EA580C] solar-orb-solid z-0 shadow-2xl animate-pulse" />
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-stone-400">
        © 2026 EdQuest AI. All rights reserved.
      </footer>
    </div>
  );
};
