import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Search, Plus, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

interface HeaderProps {
  onActionClick?: () => void;
  actionLabel?: string;
}

export const Header: React.FC<HeaderProps> = ({ onActionClick, actionLabel }) => {
  const { selectedClass, isTeacher, isStudent } = useAuth();
  const location = useLocation();

  // Parse path for breadcrumb
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentSection = pathSegments[pathSegments.length - 1] || 'Dashboard';
  const capitalizedSection = currentSection.charAt(0).toUpperCase() + currentSection.slice(1);

  return (
    <header className="h-18 px-8 flex items-center justify-between border-b border-[#EAE2D5]/70 bg-white/40 backdrop-blur-md sticky top-0 z-30">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-stone-500 font-medium">
        <Link to="/app/dashboard" className="hover:text-stone-900 transition">
          Classes
        </Link>
        <span>/</span>
        <span className="text-stone-700 font-semibold">{selectedClass?.name || 'Classroom'}</span>
        <span>/</span>
        <span className="text-[#EA580C] font-semibold">{capitalizedSection}</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative w-64 hidden sm:block">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search resources, topics..."
            className="w-full bg-[#F4EFEA]/80 border border-[#E2D8CC] rounded-full pl-9 pr-4 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] transition"
          />
        </div>

        {/* Dynamic Contextual Action */}
        {actionLabel && onActionClick && (
          <Button size="sm" onClick={onActionClick}>
            <Plus className="w-3.5 h-3.5" />
            <span>{actionLabel}</span>
          </Button>
        )}

        {/* Quick Join/Create Class */}
        {isTeacher && (
          <Link to="/app/classes/create">
            <Button size="sm" variant="secondary">
              <Plus className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>New Class</span>
            </Button>
          </Link>
        )}
        {isStudent && (
          <Link to="/app/classes/join">
            <Button size="sm" variant="secondary">
              <UserPlus className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>Join Class</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
};
