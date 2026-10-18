import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { analyticsService } from '../../services/analytics.service';
import { assessmentService } from '../../services/assessment.service';
import { classService } from '../../services/class.service';
import { Card, Badge } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  BookOpen,
  BarChart2,
  AlertCircle,
  Sparkles,
  ClipboardList,
  Plus,
  ArrowRight,
  TrendingUp,
  Copy,
  Check,
  LogOut,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

import { Assessment, Classroom } from '../../types';

export const TeacherDashboard: React.FC = () => {
  const { user, selectedOrg, selectedClass, classes, setSelectedClass } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<{
    completionRate?: number;
    atRiskCount?: number;
  } | null>(null);
  const [pendingReviews, setPendingReviews] = useState<Assessment[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const firstName = user?.firstName?.split(' ')[0] || 'Teacher';

  useEffect(() => {
    if (!selectedOrg?.id || !selectedClass?.id) return;

    const load = async () => {
      setLoadingOverview(true);
      try {
        const [ov, assessments] = await Promise.all([
          analyticsService.getClassOverview(selectedOrg.id, selectedClass.id),
          assessmentService.getAssessments(selectedOrg.id, selectedClass.id),
        ]);
        setOverview(ov);
        setPendingReviews(assessments.filter((a) => a.status === 'DRAFT').slice(0, 4));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingOverview(false);
      }
    };

    load();
  }, [selectedOrg?.id, selectedClass?.id]);

  const statCards = [
    {
      label: 'Active classes',
      value: classes.length || 0,
      icon: BookOpen,
      color: 'text-[#EA580C]',
      bg: 'bg-orange-50',
    },
    {
      label: 'AI reviews',
      value: pendingReviews.length,
      icon: Sparkles,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Completion %',
      value: `${overview?.completionRate?.toFixed(0) ?? '—'}%`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'At-risk learners',
      value: overview?.atRiskCount ?? '—',
      icon: AlertCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ];

  // Mock engagement chart data (replace with real if analytics returns it)
  const engagementData = [
    { day: 'Mon', score: 72 },
    { day: 'Tue', score: 65 },
    { day: 'Wed', score: 81 },
    { day: 'Thu', score: 58 },
    { day: 'Fri', score: 78 },
    { day: 'Sat', score: 40 },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
            Good morning, {firstName} 👋
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Here's what needs your attention today in{' '}
            <span className="text-[#EA580C] font-semibold">
              {selectedClass?.name || 'your classroom'}
            </span>
            .
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/app/classes/create">
            <Button size="sm" variant="secondary">
              <Plus className="w-3.5 h-3.5" />
              Create class
            </Button>
          </Link>
          <Link to="/app/assessments">
            <Button size="sm">
              <Sparkles className="w-3.5 h-3.5" />
              Generate quiz
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards Row */}
      {loadingOverview ? (
        <div className="flex gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex-1 h-28 bg-white/60 rounded-2xl border border-[#EAE2D5] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-stone-500 font-medium mb-1">{s.label}</p>
                    <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                  </div>
                  <div className={`${s.bg} ${s.color} p-2.5 rounded-xl`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Main Content: Pending Quizzes + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending AI Quiz Reviews */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#EA580C]" />
              Pending AI quiz reviews
            </h3>
            <Link
              to="/app/assessments"
              className="text-xs text-[#EA580C] font-semibold hover:underline"
            >
              View all
            </Link>
          </div>

          {pendingReviews.length === 0 ? (
            <div className="text-center py-8 text-stone-400">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No pending reviews</p>
              <p className="text-xs mt-1">Generate an AI quiz to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingReviews.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between p-3.5 bg-[#FAF6F0] rounded-xl border border-[#EAE2D5]/70 hover:border-[#EA580C]/30 transition"
                >
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{q.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {q.questionCount || '—'} questions
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/app/assessments/${q.id}/edit`)}
                  >
                    Review
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Class Engagement Chart */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-[#EA580C]" />
            Class engagement this week
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={engagementData} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE2D5" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#A8A29E' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#A8A29E' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #EAE2D5',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                cursor={{ fill: 'rgba(234, 88, 12, 0.07)' }}
              />
              <Bar dataKey="score" fill="#EA580C" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Quick Class List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#EA580C]" />
            My classes
          </h3>
          <Link to="/app/classes/create">
            <Button size="sm" variant="ghost">
              <Plus className="w-3.5 h-3.5" />
              New
            </Button>
          </Link>
        </div>
        {classes.length === 0 ? (
          <div className="text-center py-10 text-stone-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No classes yet</p>
            <Link to="/app/classes/create">
              <Button size="sm" className="mt-4">
                Create your first class
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => {
              const isSelected = selectedClass?.id === cls.id;
              return (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClass(cls)}
                  className={`group p-4 border rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-50/60 border-[#EA580C] shadow-sm ring-1 ring-[#EA580C]/30'
                      : 'bg-[#FAF6F0] border-[#EAE2D5] hover:border-[#EA580C]/40 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-stone-900 text-sm group-hover:text-[#EA580C] transition line-clamp-1">
                      {cls.name}
                    </h4>
                    {isSelected && (
                      <Badge variant="ready" className="shrink-0 text-[10px]">
                        Active
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-stone-500 mt-1">{cls.learnerCount || 0} learners</p>

                  {/* Class Invite Code Badge + Copy */}
                  <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#EAE2D5]/70">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-[#EAE2D5] rounded-md shadow-2xs">
                      <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                        Code:
                      </span>
                      <span className="font-mono text-xs font-extrabold text-[#EA580C] tracking-wide">
                        {cls.code || 'NO-CODE'}
                      </span>
                    </div>

                    {cls.code && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(cls.code);
                          setCopiedCode(cls.id);
                          setTimeout(() => setCopiedCode(null), 2000);
                        }}
                        className="text-stone-400 hover:text-[#EA580C] p-1 rounded hover:bg-white/80 transition"
                        title="Copy class invite code"
                      >
                        {copiedCode === cls.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="mt-3.5 flex items-center justify-between text-xs pt-2 border-t border-[#EAE2D5]/50">
                    <span className="text-stone-400 text-[11px]">
                      {isSelected ? 'Currently viewing' : 'Click to switch'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClass(cls);
                        navigate('/app/resources');
                      }}
                      className="font-semibold text-stone-600 hover:text-[#EA580C] flex items-center gap-1 transition"
                    >
                      Resources
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export const StudentDashboard: React.FC = () => {
  const { user, selectedOrg, selectedClass, classes, setSelectedClass, loadClasses } = useAuth();
  const navigate = useNavigate();
  const [classToLeave, setClassToLeave] = useState<Classroom | null>(null);
  const [leaving, setLeaving] = useState(false);
  const firstName = user?.firstName || 'Student';

  const handleLeaveClass = async () => {
    if (!selectedOrg?.id || !classToLeave) return;
    setLeaving(true);
    try {
      await classService.leaveClass(selectedOrg.id, classToLeave.id);
      const remaining = await loadClasses(selectedOrg.id);
      if (selectedClass?.id === classToLeave.id) {
        const nextClass = remaining.find((c) => c.id !== classToLeave.id) || null;
        if (nextClass) {
          setSelectedClass(nextClass);
        }
      }
      setClassToLeave(null);
    } catch (err) {
      console.error('Failed to leave class', err);
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
            Good morning, {firstName} ☀️
          </h1>
          <p className="text-stone-500 text-sm mt-1">Your next best study steps are ready.</p>
        </div>
        <Link to="/app/classes/join">
          <Button size="sm" variant="secondary">
            <Plus className="w-3.5 h-3.5" />
            Join class
          </Button>
        </Link>
      </div>

      {/* Enrolled Class Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {classes.map((cls) => {
          const isSelected = selectedClass?.id === cls.id;
          return (
            <Card
              key={cls.id}
              className={`p-5 cursor-pointer transition-all ${
                isSelected
                  ? 'border-[#EA580C] bg-orange-50/40 shadow-sm ring-1 ring-[#EA580C]/30'
                  : 'hover:shadow-md hover:border-[#EA580C]/40'
              }`}
              onClick={() => setSelectedClass(cls)}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-stone-900 line-clamp-1">{cls.name}</h4>
                {isSelected && (
                  <Badge variant="ready" className="shrink-0 text-[10px]">
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">Enrolled class</p>

              <div className="mt-4 h-1.5 bg-[#EAE2D5] rounded-full overflow-hidden">
                <div className="h-full bg-[#EA580C] rounded-full" style={{ width: '62%' }} />
              </div>
              <p className="text-xs text-stone-500 mt-1.5">62% complete</p>

              {/* Actions Footer */}
              <div className="mt-4 flex items-center justify-between text-xs pt-2.5 border-t border-[#EAE2D5]/50">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setClassToLeave(cls);
                  }}
                  className="text-stone-400 hover:text-rose-600 flex items-center gap-1 text-[11px] font-medium transition"
                  title="Leave this class"
                >
                  <LogOut className="w-3 h-3" />
                  Leave class
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedClass(cls);
                    navigate('/app/resources');
                  }}
                  className="font-semibold text-stone-600 hover:text-[#EA580C] flex items-center gap-1 transition"
                >
                  Resources
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          );
        })}
        {classes.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white/60 border border-[#EAE2D5] rounded-2xl">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-stone-300" />
            <p className="text-stone-500 text-sm font-medium">
              You haven't joined any classes yet.
            </p>
            <Link to="/app/classes/join">
              <Button size="sm" className="mt-4">
                Join a class
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Today's Study Plan + Flashcard Streak */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-base font-bold text-stone-900 mb-4">Today's study plan</h3>
          <div className="space-y-3">
            {[
              {
                task: `Complete ${selectedClass?.name || 'Cell'} Structure Quiz`,
                due: 'Due today',
                color: 'text-rose-600',
              },
              { task: 'Read chapter 12 notes', due: '20 min', color: 'text-stone-500' },
              { task: 'Review flashcards', due: '10 min', color: 'text-stone-500' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-stone-300 shrink-0" />
                <span className="text-sm text-stone-700 flex-1">{item.task}</span>
                <span className={`text-xs font-semibold ${item.color}`}>{item.due}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-base font-bold text-stone-900 mb-1">Flashcard review</h3>
          <p className="text-stone-500 text-xs mb-4">12 day streak — keep it up!</p>
          <div className="flex gap-2 mb-6">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  i < 5
                    ? 'bg-[#EA580C] text-white border-[#EA580C]'
                    : 'border-stone-200 text-stone-300'
                }`}
              >
                {i < 5 ? '✓' : '·'}
              </div>
            ))}
          </div>
          <Link to="/app/flashcards">
            <Button size="sm" className="w-full">
              Start review
            </Button>
          </Link>
        </Card>
      </div>

      {/* Leave Class Confirmation Modal */}
      <Modal isOpen={!!classToLeave} onClose={() => setClassToLeave(null)} title="Leave Class">
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Are you sure you want to leave{' '}
            <strong className="text-stone-900">{classToLeave?.name}</strong>?
          </p>
          <div className="text-xs text-stone-600 bg-amber-50 border border-amber-200/80 rounded-xl p-3">
            You will lose access to assignments, flashcards, discussions, and the AI tutor for this
            class until your teacher provides the invite code to re-join.
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setClassToLeave(null)}
              disabled={leaving}
            >
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleLeaveClass} isLoading={leaving}>
              Leave class
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Main Dashboard router component
export const DashboardPage: React.FC = () => {
  const { isTeacher } = useAuth();
  return isTeacher ? <TeacherDashboard /> : <StudentDashboard />;
};
