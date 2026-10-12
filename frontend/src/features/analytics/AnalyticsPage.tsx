import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { analyticsService, StudentAnalytics } from '../../services/analytics.service';
import { TopicMastery, QuestionDifficulty, RemedialRecommendation, Enrollment } from '../../types';
import { Card, Badge } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MarkdownContent } from '../../components/ui/MarkdownContent';
import { classService } from '../../services/class.service';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  BarChart2,
  Brain,
  Lightbulb,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Loader2,
  ArrowUp,
  Trophy,
  CheckCircle,
  Clock,
  BookOpen,
  Target,
  Sparkles,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { selectedOrg, selectedClass, isTeacher } = useAuth();

  // Teacher states
  const [overview, setOverview] = useState<any>(null);
  const [topics, setTopics] = useState<TopicMastery[]>([]);
  const [questions, setQuestions] = useState<QuestionDifficulty[]>([]);
  const [insights, setInsights] = useState<{
    insights?: RemedialRecommendation[] | string;
    classAverage?: number;
    passRate?: number;
    completionRate?: number;
    generatedAt?: string;
  } | null>(null);

  // Student states
  const [studentData, setStudentData] = useState<StudentAnalytics | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<Enrollment[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!selectedOrg?.id || !selectedClass?.id) return;
    setLoading(true);
    try {
      if (isTeacher) {
        // Teacher view: load class-level overview & teaching insights
        const [ov, tp, qs, ins, roster] = await Promise.all([
          analyticsService.getClassOverview(selectedOrg.id, selectedClass.id).catch(() => null),
          analyticsService.getClassTopics(selectedOrg.id, selectedClass.id).catch(() => []),
          analyticsService.getClassQuestions(selectedOrg.id, selectedClass.id).catch(() => []),
          analyticsService.getClassInsights(selectedOrg.id, selectedClass.id).catch(() => null),
          classService.getEnrollments(selectedOrg.id, selectedClass.id).catch(() => []),
        ]);
        setOverview(ov);
        setTopics(Array.isArray(tp) ? tp : (tp as any)?.topics || []);
        setQuestions(Array.isArray(qs) ? qs : (qs as any)?.questions || []);
        setInsights(ins);
        setStudentEnrollments(Array.isArray(roster) ? roster : []);
      } else {
        // Student view: load dedicated personal analytics
        const studentAnalytics = await analyticsService
          .getStudentAnalytics(selectedOrg.id, selectedClass.id, 'me')
          .catch(() => null);
        setStudentData(studentAnalytics);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedStudentId('');
    setStudentData(null);
    load();
  }, [selectedOrg?.id, selectedClass?.id, isTeacher]);

  const handleStudentSelection = async (studentId: string) => {
    setSelectedStudentId(studentId);
    if (!studentId) {
      setStudentData(null);
      return;
    }
    if (!selectedOrg?.id || !selectedClass?.id) return;

    setLoading(true);
    try {
      const data = await analyticsService.getStudentAnalytics(
        selectedOrg.id,
        selectedClass.id,
        studentId,
      );
      setStudentData(data);
    } catch (err) {
      console.error('Failed to load selected student analytics:', err);
      setStudentData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (isTeacher && selectedStudentId) {
      void handleStudentSelection(selectedStudentId);
    } else {
      void load();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#EA580C]" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STUDENT VIEW — 100% Dedicated to the individual student's own attempts
  // ═══════════════════════════════════════════════════════════════════════════
  if (!isTeacher || selectedStudentId) {
    const avgScore = studentData?.averageScorePercent ?? 0;
    const bestScore = studentData?.bestScorePercent ?? 0;
    const totalAttempts = studentData?.totalAttempts ?? 0;
    const totalTimeSecs = studentData?.totalTimeSpentSecs ?? 0;
    const timeMinutes = Math.floor(totalTimeSecs / 60);

    const topicData = studentData?.topicMastery || [];
    const strengths = studentData?.strengths || [];
    const weaknesses = studentData?.weaknesses || [];
    const attemptHistory = studentData?.attemptHistory || [];
    const recommendations = studentData?.recommendations || [];

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-stone-900">
              {isTeacher
                ? `${
                    studentEnrollments.find((enrollment) => enrollment.userId === selectedStudentId)
                      ?.user.firstName || 'Student'
                  } ${
                    studentEnrollments.find((enrollment) => enrollment.userId === selectedStudentId)
                      ?.user.lastName || ''
                  }`.trim() + ' · Analytics'
                : 'My Learning Analytics'}
            </h1>
            <p className="text-stone-500 text-sm mt-0.5">
              {selectedClass?.name} ·{' '}
              {isTeacher
                ? 'Individual performance, topic mastery & quiz history'
                : 'Personal performance, topic mastery & quiz history'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isTeacher && (
              <select
                aria-label="Select student analytics"
                value={selectedStudentId}
                onChange={(event) => void handleStudentSelection(event.target.value)}
                className="max-w-xs text-sm bg-white border border-[#EAE2D5] rounded-xl px-3 py-2 text-stone-700 focus:outline-none focus:border-[#EA580C]"
              >
                <option value="">Class overview</option>
                {studentEnrollments.map((enrollment) => (
                  <option key={enrollment.userId} value={enrollment.userId}>
                    {enrollment.user.firstName} {enrollment.user.lastName}
                    {enrollment.user.email ? ` (${enrollment.user.email})` : ''}
                  </option>
                ))}
              </select>
            )}
            <Button size="sm" variant="secondary" onClick={handleRefresh}>
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Metric Cards (Personal to Student) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-stone-500 font-medium mb-1">Average score</p>
                <p className="text-3xl font-extrabold text-[#EA580C]">
                  {totalAttempts > 0 ? `${avgScore}%` : '—'}
                </p>
              </div>
              <div className="bg-orange-50 text-[#EA580C] p-2.5 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-stone-500 font-medium mb-1">Best score</p>
                <p className="text-3xl font-extrabold text-emerald-600">
                  {totalAttempts > 0 ? `${bestScore}%` : '—'}
                </p>
              </div>
              <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl">
                <Trophy className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-stone-500 font-medium mb-1">Quizzes completed</p>
                <p className="text-3xl font-extrabold text-sky-600">{totalAttempts}</p>
              </div>
              <div className="bg-sky-50 text-sky-600 p-2.5 rounded-xl">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-stone-500 font-medium mb-1">Total study time</p>
                <p className="text-3xl font-extrabold text-violet-600">
                  {timeMinutes > 0 ? `${timeMinutes}m` : `${totalTimeSecs}s`}
                </p>
              </div>
              <div className="bg-violet-50 text-violet-600 p-2.5 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Topic Mastery Chart */}
          <Card className="p-6">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-[#EA580C]" />
              My topic mastery
            </h3>
            {topicData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-stone-400 text-sm italic">
                Complete assessments to see your topic mastery.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topicData} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EAE2D5" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#A8A29E' }}
                    axisLine={false}
                    tickLine={false}
                    unit="%"
                  />
                  <YAxis
                    type="category"
                    dataKey="topic"
                    tick={{ fontSize: 10, fill: '#78716C' }}
                    width={110}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '1px solid #EAE2D5',
                      borderRadius: 10,
                      fontSize: 11,
                    }}
                    formatter={(v: any) => [`${v}%`, 'Accuracy']}
                  />
                  <Bar
                    dataKey="mastery"
                    fill="#EA580C"
                    radius={[0, 6, 6, 0]}
                    background={{ fill: '#F4EFE8', radius: 6 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Strengths & Focus Areas */}
          <Card className="p-6">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-[#EA580C]" />
              Strengths & focus areas
            </h3>

            {topicData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-stone-400 text-sm italic">
                No attempt data available yet.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Strengths */}
                <div>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Mastered Topics (≥ 75%)
                  </p>
                  {strengths.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {strengths.map((s, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium"
                        >
                          {s.topicName} · {Math.round(s.accuracyPercent)}%
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400 italic">
                      Keep practicing to unlock mastered topics!
                    </p>
                  )}
                </div>

                {/* Focus Areas */}
                <div className="pt-2 border-t border-[#EAE2D5]/60">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Topics to Review (&lt; 60%)
                  </p>
                  {weaknesses.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {weaknesses.map((w, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium"
                        >
                          {w.topicName} · {Math.round(w.accuracyPercent)}%
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      All attempted topics are above 60%! Great job!
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Personalized Recommendations */}
        {recommendations.length > 0 && (
          <Card className="p-6">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 mb-4">
              <Lightbulb className="w-4 h-4 text-[#EA580C]" />
              Personalized study recommendations
            </h3>
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-2xl border flex gap-4 ${
                    rec.severity === 'HIGH'
                      ? 'border-rose-200 bg-rose-50/50'
                      : rec.severity === 'MEDIUM'
                        ? 'border-amber-200 bg-amber-50/50'
                        : 'border-emerald-200 bg-emerald-50/50'
                  }`}
                >
                  <div
                    className={`w-2 shrink-0 rounded-full mt-1 ${
                      rec.severity === 'HIGH'
                        ? 'bg-rose-500'
                        : rec.severity === 'MEDIUM'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-stone-900">{rec.topic}</p>
                      <Badge
                        variant={rec.severity === 'HIGH' ? 'orange' : 'ready'}
                        className="text-[10px]"
                      >
                        {rec.severity === 'HIGH'
                          ? 'High Priority'
                          : rec.severity === 'MEDIUM'
                            ? 'Recommended'
                            : 'Good Progress'}
                      </Badge>
                    </div>
                    <p className="text-xs text-stone-600">{rec.insight}</p>
                    {rec.recommendedAction && (
                      <p className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                        <ArrowUp className="w-3 h-3 text-[#EA580C]" />
                        {rec.recommendedAction}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Personal Attempt History */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-[#EA580C]" />
            My assessment attempts
          </h3>
          {attemptHistory.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No attempts recorded yet.</p>
              <p className="text-xs mt-1 opacity-70">
                Go to the Assessments page to start a quiz!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-stone-500 uppercase tracking-wider border-b border-[#EAE2D5]">
                    <th className="text-left py-2.5 pr-4 font-semibold">Assessment</th>
                    <th className="text-center py-2.5 px-4 font-semibold">Score</th>
                    <th className="text-center py-2.5 px-4 font-semibold">Duration</th>
                    <th className="text-center py-2.5 px-4 font-semibold">Date</th>
                    <th className="text-center py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE2D5]/60">
                  {attemptHistory.map((att) => (
                    <tr key={att.attemptId} className="hover:bg-[#FAF6F0] transition">
                      <td className="py-3 pr-4 font-medium text-stone-800">
                        {att.assessmentTitle}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-stone-900">
                        {att.scorePercent}%
                        {att.scoreAchieved != null && att.totalMarks != null && (
                          <span className="text-xs text-stone-400 font-normal ml-1">
                            ({att.scoreAchieved}/{att.totalMarks})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-stone-500 text-xs">
                        {att.timeSpentSecs != null
                          ? `${Math.floor(att.timeSpentSecs / 60)}m ${att.timeSpentSecs % 60}s`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-center text-stone-500 text-xs">
                        {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 text-center">
                        <Badge variant={att.isPassed ? 'ready' : 'orange'}>
                          {att.isPassed ? 'Passed' : 'Needs Practice'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEACHER VIEW — Class-level overview, distribution & AI teaching insights
  // ═══════════════════════════════════════════════════════════════════════════
  const passRatePercent = overview?.passRate ?? (insights as any)?.passRate ?? 0;
  const avgPercent = overview?.averageScorePercent ?? (insights as any)?.classAverage ?? 0;

  const pieData = [
    { name: 'Passed', value: Math.round(passRatePercent) },
    { name: 'Not passed', value: Math.round(100 - passRatePercent) },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Class Analytics & Insights</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {selectedClass?.name} · AI-powered teaching insights & class performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            aria-label="Select student analytics"
            value={selectedStudentId}
            onChange={(event) => void handleStudentSelection(event.target.value)}
            className="max-w-xs text-sm bg-white border border-[#EAE2D5] rounded-xl px-3 py-2 text-stone-700 focus:outline-none focus:border-[#EA580C]"
          >
            <option value="">Class overview</option>
            {studentEnrollments.map((enrollment) => (
              <option key={enrollment.userId} value={enrollment.userId}>
                {enrollment.user.firstName} {enrollment.user.lastName}
                {enrollment.user.email ? ` (${enrollment.user.email})` : ''}
              </option>
            ))}
          </select>
          <Button size="sm" variant="secondary" onClick={handleRefresh}>
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key metric cards (Class Overview) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: 'Class average',
            value: `${avgPercent.toFixed(1)}%`,
            icon: TrendingUp,
            color: 'text-[#EA580C]',
            bg: 'bg-orange-50',
          },
          {
            label: 'Pass rate',
            value: `${passRatePercent.toFixed(0)}%`,
            icon: ArrowUp,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: 'Total assessments',
            value: overview?.totalAssessments ?? '—',
            icon: BarChart2,
            color: 'text-sky-600',
            bg: 'bg-sky-50',
          },
          {
            label: 'At-risk learners',
            value: overview?.atRiskCount ?? '—',
            icon: AlertTriangle,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
          },
        ].map((s) => {
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topic Mastery Bar Chart */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-[#EA580C]" />
            Topic mastery heatmap
          </h3>
          {topics.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-stone-400 text-sm">
              No topic data available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topics} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EAE2D5" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#A8A29E' }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                />
                <YAxis
                  type="category"
                  dataKey="topic"
                  tick={{ fontSize: 10, fill: '#78716C' }}
                  width={100}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #EAE2D5',
                    borderRadius: 10,
                    fontSize: 11,
                  }}
                  formatter={(v: any) => [`${v}%`, 'Mastery']}
                />
                <Bar
                  dataKey="mastery"
                  fill="#EA580C"
                  radius={[0, 6, 6, 0]}
                  background={{ fill: '#F4EFE8', radius: 6 }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Pass Rate Pie */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#EA580C]" />
            Pass rate overview
          </h3>
          <div className="flex items-center justify-center">
            <PieChart width={200} height={200}>
              <Pie
                data={pieData}
                cx={100}
                cy={100}
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={index} fill={index === 0 ? '#EA580C' : '#EAE2D5'} />
                ))}
              </Pie>
              <Legend
                formatter={(value) => <span className="text-xs text-stone-600">{value}</span>}
              />
              <Tooltip contentStyle={{ fontSize: 12 }} />
            </PieChart>
          </div>
          <div className="text-center mt-2">
            <p className="text-3xl font-extrabold text-[#EA580C]">{passRatePercent.toFixed(0)}%</p>
            <p className="text-xs text-stone-500 font-medium">students passed</p>
          </div>
        </Card>
      </div>

      {/* Item Difficulty Table */}
      {questions.length > 0 && (
        <Card className="p-6">
          <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-[#EA580C]" />
            Question difficulty index (P-value)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-stone-500 uppercase tracking-wider border-b border-[#EAE2D5]">
                  <th className="text-left py-2.5 pr-4 font-semibold">Question</th>
                  <th className="text-center py-2.5 px-4 font-semibold">P-value</th>
                  <th className="text-center py-2.5 px-4 font-semibold">Discrimination</th>
                  <th className="text-center py-2.5 font-semibold">Label</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE2D5]/60">
                {questions.slice(0, 8).map((q, i) => (
                  <tr key={i} className="hover:bg-[#FAF6F0] transition">
                    <td className="py-3 pr-4 text-stone-700 truncate max-w-xs">{q.prompt}</td>
                    <td className="py-3 px-4 text-center font-semibold text-stone-800">
                      {typeof q.difficultyIndex === 'number' && Number.isFinite(q.difficultyIndex)
                        ? `${(q.difficultyIndex * 100).toFixed(0)}%`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-center text-stone-600">
                      {typeof q.discriminationIndex === 'number' &&
                      Number.isFinite(q.discriminationIndex)
                        ? q.discriminationIndex.toFixed(2)
                        : '—'}
                    </td>
                    <td className="py-3 text-center">
                      <Badge
                        variant={
                          q.difficultyCategory === 'EASY'
                            ? 'ready'
                            : q.difficultyCategory === 'MODERATE'
                              ? 'scheduled'
                              : q.difficultyCategory === 'HARD'
                                ? 'orange'
                                : 'neutral'
                        }
                      >
                        {q.difficultyCategory}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* AI Teaching Insights & Remedial Recommendations */}
      {insights && insights.insights && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-[#EA580C]" />
              AI teaching insights & remedial recommendations
            </h3>
            {insights.generatedAt && (
              <span className="text-xs text-stone-400">
                Generated {new Date(insights.generatedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {Array.isArray(insights.insights) ? (
            insights.insights.length > 0 ? (
              <div className="space-y-3">
                {insights.insights.map((rec: RemedialRecommendation, i: number) => (
                  <div
                    key={rec.id || i}
                    className={`p-4 rounded-2xl border flex gap-4 ${
                      rec.severity === 'HIGH'
                        ? 'border-rose-200 bg-rose-50/50'
                        : rec.severity === 'MEDIUM'
                          ? 'border-amber-200 bg-amber-50/50'
                          : 'border-sky-200 bg-sky-50/50'
                    }`}
                  >
                    <div
                      className={`w-2 shrink-0 rounded-full mt-1 ${
                        rec.severity === 'HIGH'
                          ? 'bg-rose-500'
                          : rec.severity === 'MEDIUM'
                            ? 'bg-amber-500'
                            : 'bg-sky-500'
                      }`}
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-stone-900">{rec.topic}</p>
                        <Badge
                          variant={rec.severity === 'HIGH' ? 'orange' : 'scheduled'}
                          className="text-[10px]"
                        >
                          {rec.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-stone-600">{rec.insight}</p>
                      {rec.recommendedAction && (
                        <p className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                          <ArrowUp className="w-3 h-3 text-[#EA580C]" />
                          {rec.recommendedAction}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500 italic">No recommendations available yet.</p>
            )
          ) : typeof insights.insights === 'string' && insights.insights.trim().length > 0 ? (
            <div className="p-6 rounded-2xl border border-amber-200/60 bg-[#FAF6F0] text-stone-800">
              <MarkdownContent content={insights.insights} />
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
};
