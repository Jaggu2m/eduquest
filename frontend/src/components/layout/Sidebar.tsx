import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Sparkles,
  CheckSquare,
  Layers,
  MessageSquare,
  BarChart2,
  LogOut,
  Building2,
  ChevronDown,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, selectedOrg, selectedClass, classes, setSelectedClass, logout, isTeacher } =
    useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Overview', path: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Resources', path: '/app/resources', icon: FolderOpen },
    { label: 'AI Tutor', path: '/app/ai-tutor', icon: Sparkles },
    { label: 'Assessments', path: '/app/assessments', icon: CheckSquare },
    { label: 'Flashcards', path: '/app/flashcards', icon: Layers },
    { label: 'Discussions', path: '/app/discussions', icon: MessageSquare },
    { label: 'Analytics', path: '/app/analytics', icon: BarChart2 },
    ...(isTeacher ? [{ label: 'Students', path: '/app/students', icon: Users }] : []),
  ];

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    const found = classes.find((c) => c.id === classId);
    if (found) setSelectedClass(found);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-[#121417] text-stone-300 flex flex-col h-screen shrink-0 border-r border-white/5 select-none">
      {/* Brand Logo Header */}
      <div className="h-18 flex items-center px-6 border-b border-white/5">
        <NavLink
          to="/app/dashboard"
          className="flex items-center gap-2.5 text-white font-bold text-lg tracking-tight hover:opacity-90 transition"
        >
          <span className="text-[#EA580C] text-xl font-black">✦</span>
          <span>EdQuest AI</span>
        </NavLink>
      </div>

      {/* Class Switcher Pill */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1.5 flex items-center justify-between">
          <span>Active Classroom</span>
          {isTeacher && (
            <NavLink
              to="/app/classes/create"
              className="text-[#EA580C] hover:underline normal-case"
            >
              + New
            </NavLink>
          )}
        </div>
        <div className="relative">
          <select
            value={selectedClass?.id || ''}
            onChange={handleClassChange}
            className="w-full appearance-none bg-white/5 hover:bg-white/10 text-stone-200 text-sm font-medium rounded-xl px-3.5 py-2.5 pr-8 border border-white/10 focus:outline-none focus:border-[#EA580C] cursor-pointer transition"
          >
            {classes.length === 0 && <option value="">No classrooms yet</option>}
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id} className="bg-[#1C1F24] text-white">
                {cls.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
        </div>
      </div>

      {/* Main Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#EA580C] text-white shadow-sm font-semibold'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-white/5'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User / Workspace Footer */}
      <div className="p-4 border-t border-white/5 bg-black/20 space-y-3">
        {/* Org Switcher */}
        <NavLink
          to="/organizations"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-stone-300 transition"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="truncate">{selectedOrg?.name || 'Organizations'}</span>
          </div>
          <span className="text-[10px] text-stone-400">Switch</span>
        </NavLink>

        {/* Profile Card */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#EA580C]/20 border border-[#EA580C]/40 text-[#EA580C] flex items-center justify-center font-bold text-xs shrink-0">
              {user?.firstName?.[0] || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-stone-200 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-stone-400 uppercase tracking-wider">
                {user?.role || 'User'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="text-stone-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
