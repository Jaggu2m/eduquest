import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { GraduationCap, BookOpen } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'STUDENT' as 'TEACHER' | 'STUDENT',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      // Teachers need to create/select an org first.
      // Students have no orgs yet — send them to the dashboard where they can join a class.
      if (form.role === 'TEACHER') {
        navigate('/organizations');
      } else {
        navigate('/app/dashboard');
      }
    } catch (err: any) {
      const data = err.response?.data;
      const details = data?.errors?.map((e: any) => e.message).join(' ');
      setError(details || data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col overflow-hidden relative">
      {/* Decorative orb */}
      <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full solar-orb opacity-30 pointer-events-none" />

      {/* Nav */}
      <div className="h-18 px-8 flex items-center border-b border-[#EAE2D5]/70 bg-white/40 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2 text-stone-900 font-bold text-lg">
          <span className="text-[#EA580C] text-xl font-black">✦</span>
          <span>EdQuest AI</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="relative w-full max-w-2xl flex items-center">
          {/* Orange orb on left */}
          <div className="hidden sm:block absolute -left-6 w-52 h-52 rounded-full solar-orb-solid z-0 shadow-2xl" />

          <div className="w-full sm:w-[460px] sm:ml-auto bg-white/90 backdrop-blur-xl border border-[#EAE2D5] rounded-3xl p-8 sm:p-9 shadow-xl z-10">
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
              Create your account
            </h2>
            <p className="text-xs text-stone-500 mt-1 mb-6">
              Create your learning space in minutes.
            </p>

            {/* Role selector */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-stone-600 mb-2 uppercase tracking-wide">
                I am a…
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Teacher */}
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role: 'TEACHER' }))}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer ${
                    form.role === 'TEACHER'
                      ? 'border-[#EA580C] bg-[#EA580C]/5 shadow-md'
                      : 'border-stone-200 bg-stone-50 hover:border-[#EA580C]/40'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      form.role === 'TEACHER' ? 'bg-[#EA580C]' : 'bg-stone-200'
                    }`}
                  >
                    <GraduationCap
                      className={`w-5 h-5 ${form.role === 'TEACHER' ? 'text-white' : 'text-stone-500'}`}
                    />
                  </div>
                  <div>
                    <p
                      className={`text-sm font-bold ${form.role === 'TEACHER' ? 'text-[#EA580C]' : 'text-stone-700'}`}
                    >
                      Teacher
                    </p>
                    <p className="text-[10px] text-stone-400 leading-snug">
                      Create classes &amp; quizzes
                    </p>
                  </div>
                  {form.role === 'TEACHER' && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#EA580C] flex items-center justify-center">
                      <span className="text-white text-[8px] font-black">✓</span>
                    </div>
                  )}
                </button>

                {/* Student */}
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role: 'STUDENT' }))}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer ${
                    form.role === 'STUDENT'
                      ? 'border-[#EA580C] bg-[#EA580C]/5 shadow-md'
                      : 'border-stone-200 bg-stone-50 hover:border-[#EA580C]/40'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      form.role === 'STUDENT' ? 'bg-[#EA580C]' : 'bg-stone-200'
                    }`}
                  >
                    <BookOpen
                      className={`w-5 h-5 ${form.role === 'STUDENT' ? 'text-white' : 'text-stone-500'}`}
                    />
                  </div>
                  <div>
                    <p
                      className={`text-sm font-bold ${form.role === 'STUDENT' ? 'text-[#EA580C]' : 'text-stone-700'}`}
                    >
                      Student
                    </p>
                    <p className="text-[10px] text-stone-400 leading-snug">
                      Join classes &amp; learn
                    </p>
                  </div>
                  {form.role === 'STUDENT' && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#EA580C] flex items-center justify-center">
                      <span className="text-white text-[8px] font-black">✓</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First name"
                  name="firstName"
                  placeholder="Maya"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Last name"
                  name="lastName"
                  placeholder="Carter"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
              <Input
                label="Email address"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
                required
              />
              <Input
                label="Password"
                type="password"
                name="password"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={handleChange}
                required
              />

              <Button type="submit" className="w-full mt-2" isLoading={loading}>
                Create {form.role === 'TEACHER' ? 'Teacher' : 'Student'} account
              </Button>
            </form>

            {/* Demo fill buttons */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="py-2 px-3 bg-stone-50 hover:bg-stone-100/80 border border-stone-200 rounded-xl text-stone-600 text-[10px] font-semibold transition"
                onClick={() =>
                  setForm({
                    firstName: 'Dr. Maya',
                    lastName: 'Carter',
                    email: 'teacher@demo.edu',
                    password: 'password123',
                    role: 'TEACHER',
                  })
                }
              >
                Fill Demo Teacher
              </button>
              <button
                type="button"
                className="py-2 px-3 bg-stone-50 hover:bg-stone-100/80 border border-stone-200 rounded-xl text-stone-600 text-[10px] font-semibold transition"
                onClick={() =>
                  setForm({
                    firstName: 'Alex',
                    lastName: 'Chen',
                    email: 'student@demo.edu',
                    password: 'password123',
                    role: 'STUDENT',
                  })
                }
              >
                Fill Demo Student
              </button>
            </div>

            <div className="mt-6 pt-5 border-t border-stone-100 flex justify-center text-xs">
              <span className="text-stone-500">Already have an account?&nbsp;</span>
              <Link to="/login" className="text-[#EA580C] hover:underline font-semibold">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-4 text-center text-xs text-stone-400">© 2026 EdQuest AI.</footer>
    </div>
  );
};
