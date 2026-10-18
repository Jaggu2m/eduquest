import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { assessmentService, GenerateQuizPayload } from '../../services/assessment.service';
import { resourceService } from '../../services/resource.service';
import { Assessment, Assignment, DocumentResource, QuizAttempt, Question } from '../../types';
import { Card, Badge } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  Sparkles,
  ClipboardList,
  PlayCircle,
  ChevronRight,
  Loader2,
  RefreshCw,
  CheckSquare,
  Trophy,
  XCircle,
  CheckCircle,
  Clock,
  Shield,
  AlertTriangle,
  Lock,
  RotateCcw,
  Maximize,
  BookOpen,
  GraduationCap,
  Trash2,
  Plus,
  Pencil,
  Edit3,
} from 'lucide-react';

// ── Assessment List Page (Figma D14) ──────────────────────────────────────────
export const AssessmentsPage: React.FC = () => {
  const { selectedOrg, selectedClass, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateOpen, setGenerateOpen] = useState(false);

  const load = async () => {
    if (!selectedOrg?.id || !selectedClass?.id) return;
    setLoading(true);
    try {
      const [asmt, asgn] = await Promise.all([
        assessmentService.getAssessments(selectedOrg.id, selectedClass.id).catch(() => []),
        assessmentService.getAssignments(selectedOrg.id, selectedClass.id).catch(() => []),
      ]);
      setAssessments(Array.isArray(asmt) ? asmt : []);
      setAssignments(Array.isArray(asgn) ? asgn : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedOrg?.id, selectedClass?.id]);

  const handleDeleteAssessment = async (e: React.MouseEvent, assessmentId: string) => {
    e.stopPropagation();
    if (!selectedOrg?.id || !selectedClass?.id) return;
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;
    try {
      await assessmentService.deleteAssessment(selectedOrg.id, selectedClass.id, assessmentId);
      setAssessments((prev) => prev.filter((a) => a.id !== assessmentId));
      setAssignments((prev) => prev.filter((asgn) => asgn.assessmentId !== assessmentId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete assessment.');
    }
  };

  const getStatusBadge = (
    status: string,
  ): 'ready' | 'processing' | 'scheduled' | 'published' | 'neutral' => {
    const map: Record<string, 'ready' | 'processing' | 'scheduled' | 'published' | 'neutral'> = {
      DRAFT: 'neutral',
      PUBLISHED: 'ready',
      ARCHIVED: 'neutral',
    };
    return map[status] || 'neutral';
  };

  const getTypeBadge = (type?: string) => {
    if (type === 'EXAM') return { label: 'Exam', variant: 'processing' as const, icon: Shield };
    return { label: 'Practice', variant: 'ready' as const, icon: BookOpen };
  };

  const getAttemptStatus = (asgn: Assignment) => {
    const completed = asgn.userCompletedCount || 0;
    const max = asgn.maxAttempts || 1;
    const isExam = asgn.assessment?.type === 'EXAM';

    if (completed > 0 && isExam) {
      return {
        label: 'Attempted',
        variant: 'published' as const,
        canStart: false,
        isAttempted: true,
      };
    }
    if (completed > 0 && !isExam) {
      return {
        label: `${completed} attempt${completed > 1 ? 's' : ''}`,
        variant: 'scheduled' as const,
        canStart: completed < max,
        isAttempted: true,
      };
    }
    if (asgn.hasActiveAttempt) {
      return {
        label: 'In Progress',
        variant: 'processing' as const,
        canStart: true,
        isAttempted: false,
      };
    }

    // Check schedule
    if (asgn.startDate && new Date(asgn.startDate) > new Date()) {
      return {
        label: `Opens ${new Date(asgn.startDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        variant: 'neutral' as const,
        canStart: false,
        isAttempted: false,
      };
    }
    if (asgn.dueDate && new Date(asgn.dueDate) < new Date()) {
      return { label: 'Closed', variant: 'neutral' as const, canStart: false, isAttempted: false };
    }

    return { label: 'Available', variant: 'ready' as const, canStart: true, isAttempted: false };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Assessments</h1>
          <p className="text-stone-500 text-sm mt-0.5">{selectedClass?.name}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          {isTeacher && (
            <Button size="sm" onClick={() => setGenerateOpen(true)}>
              <Sparkles className="w-3.5 h-3.5" />
              Generate AI quiz
            </Button>
          )}
        </div>
      </div>

      {/* Upcoming Assignments (Student) */}
      {!isTeacher && (
        <Card className="p-6">
          <h3 className="text-base font-bold text-stone-900 mb-4">Your assessments</h3>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-stone-100/60 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-10 text-stone-400">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No assessments available yet.</p>
              <p className="text-xs mt-1 opacity-70">
                Your teacher hasn't published any quizzes yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((asgn) => {
                const questionCount = asgn.assessment?._count?.questions || 0;
                const marks = asgn.assessment?.totalMarks;
                const typeInfo = getTypeBadge(asgn.assessment?.type);
                const attemptStatus = getAttemptStatus(asgn);
                const isExam = asgn.assessment?.type === 'EXAM';
                const TypeIcon = typeInfo.icon;

                return (
                  <div
                    key={asgn.id}
                    className={`flex items-center justify-between px-4 py-3.5 border rounded-xl transition ${
                      attemptStatus.canStart
                        ? 'bg-[#FAF6F0] border-[#EAE2D5] hover:border-[#EA580C]/40 hover:bg-orange-50/30'
                        : 'bg-stone-50 border-stone-200 opacity-75'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-stone-800 truncate">
                          {asgn.assessment?.title || 'Quiz'}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            isExam
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          <TypeIcon className="w-3 h-3" />
                          {typeInfo.label}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-2">
                        {questionCount > 0 && <span>{questionCount} questions</span>}
                        {marks != null && marks > 0 && <span>· {marks} marks</span>}
                        {asgn.assessment?.timeLimitMins && (
                          <span className="flex items-center gap-0.5">
                            · <Clock className="w-3 h-3" />
                            {asgn.assessment.timeLimitMins}min
                          </span>
                        )}
                        {asgn.dueDate && (
                          <span>· Due {new Date(asgn.dueDate).toLocaleDateString()}</span>
                        )}
                        {isExam && (
                          <span className="flex items-center gap-0.5 text-violet-500">
                            · <Lock className="w-3 h-3" /> Fullscreen
                          </span>
                        )}
                      </p>
                      {/* Show best score for practice quizzes */}
                      {(asgn.userCompletedCount || 0) > 0 && asgn.userBestScore != null && (
                        <p className="text-xs text-emerald-600 font-medium mt-0.5">
                          {isExam ? 'Final score' : 'Best score'}: {Math.round(asgn.userBestScore)}%
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 ml-3 shrink-0">
                      <Badge variant={attemptStatus.variant}>{attemptStatus.label}</Badge>
                      {attemptStatus.canStart ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            navigate(`/app/assessments/${asgn.assessmentId}/take/${asgn.id}`)
                          }
                        >
                          {asgn.hasActiveAttempt ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              Resume
                            </>
                          ) : (asgn.userCompletedCount || 0) > 0 ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5" />
                              Practice Again
                            </>
                          ) : (
                            <>
                              <PlayCircle className="w-3.5 h-3.5" />
                              {isExam ? 'Start Exam' : 'Start Practice'}
                            </>
                          )}
                        </Button>
                      ) : isExam && (asgn.userCompletedCount || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Attempted
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* All Assessments (Teacher) */}
      {isTeacher && (
        <Card className="p-6">
          <h3 className="text-base font-bold text-stone-900 mb-4 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#EA580C]" />
            All assessments
          </h3>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-stone-100/60 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No assessments yet.</p>
              <p className="text-xs mt-1">Generate your first AI quiz to get started.</p>
              <Button size="sm" className="mt-4" onClick={() => setGenerateOpen(true)}>
                <Sparkles className="w-3.5 h-3.5" />
                Generate AI quiz
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {assessments.map((a) => {
                const typeInfo = getTypeBadge(a.type);
                const TypeIcon = typeInfo.icon;
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between px-4 py-3 bg-[#FAF6F0] border border-[#EAE2D5] rounded-xl hover:border-[#EA580C]/30 transition group cursor-pointer"
                    onClick={() => navigate(`/app/assessments/${a.id}/edit`)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-stone-800 group-hover:text-[#EA580C] transition">
                          {a.title}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            a.type === 'EXAM'
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          <TypeIcon className="w-3 h-3" />
                          {typeInfo.label}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {a.questionCount || a.questions?.length || '?'} questions
                        {a.timeLimitMins ? ` · ${a.timeLimitMins}min limit` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadge(a.status)}>{a.status}</Badge>
                      <button
                        type="button"
                        title="Delete quiz"
                        onClick={(e) => handleDeleteAssessment(e, a.id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-[#EA580C] transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Generate AI Quiz Modal */}
      <GenerateQuizModal
        isOpen={generateOpen}
        onClose={() => setGenerateOpen(false)}
        orgId={selectedOrg?.id || ''}
        classId={selectedClass?.id || ''}
        onGenerated={(a) => {
          setAssessments((prev) => [a, ...prev]);
          setGenerateOpen(false);
          navigate(`/app/assessments/${a.id}/edit`);
        }}
      />
    </div>
  );
};

// ── Generate Quiz Modal (Figma D15) ──────────────────────────────────────────
interface GenerateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  classId: string;
  onGenerated: (a: Assessment) => void;
}

const GenerateQuizModal: React.FC<GenerateQuizModalProps> = ({
  isOpen,
  onClose,
  orgId,
  classId,
  onGenerated,
}) => {
  const [documents, setDocuments] = useState<DocumentResource[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<GenerateQuizPayload>({
    numQuestions: 10,
    difficulty: 'MEDIUM',
    questionTypes: ['MULTIPLE_CHOICE'],
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !orgId || !classId) return;
    resourceService
      .getDocuments(orgId, classId)
      .then((docs) =>
        setDocuments(docs.filter((d) => d.status === 'READY' || d.status === 'COMPLETED')),
      );
  }, [isOpen, orgId, classId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const assessment = await assessmentService.generateAiQuiz(orgId, classId, form);
      onGenerated(assessment);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg || 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate an AI quiz" maxWidth="lg">
      {/* Step Indicator (same as Figma D15) */}
      <div className="flex items-center gap-2 mb-6">
        {(['1 Source', '2 Configure', '3 Generate'] as const).map((label, i) => (
          <React.Fragment key={label}>
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                i + 1 === step
                  ? 'bg-[#EA580C] text-white'
                  : i + 1 < step
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-stone-100 text-stone-400'
              }`}
            >
              {label}
            </span>
            {i < 2 && <div className="flex-1 h-px bg-stone-200" />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-stone-700">Select a source document</p>
          {documents.length === 0 ? (
            <p className="text-sm text-stone-400">
              No processed documents available. Upload a PDF first.
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <label
                  key={doc.id}
                  className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition ${form.documentId === doc.id ? 'border-[#EA580C] bg-orange-50' : 'border-[#EAE2D5] hover:border-[#EA580C]/50'}`}
                >
                  <input
                    type="radio"
                    name="docId"
                    value={doc.id}
                    checked={form.documentId === doc.id}
                    onChange={() => setForm((f) => ({ ...f, documentId: doc.id }))}
                    className="accent-[#EA580C]"
                  />
                  <span className="text-sm font-medium text-stone-800">{doc.title}</span>
                </label>
              ))}
            </div>
          )}
          <Button className="w-full" onClick={() => setStep(2)} disabled={documents.length === 0}>
            Next: Configure
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              label="Quiz title (optional)"
              placeholder="Cell Structure Quiz"
              value={form.title || ''}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5 block">
              Questions
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={form.numQuestions}
              onChange={(e) => setForm((f) => ({ ...f, numQuestions: +e.target.value }))}
              className="w-full bg-[#F4EFEA]/80 border border-[#E2D8CC] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5 block">
              Difficulty
            </label>
            <select
              value={form.difficulty}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  difficulty: e.target.value as 'EASY' | 'MEDIUM' | 'HARD',
                }))
              }
              className="w-full bg-[#F4EFEA]/80 border border-[#E2D8CC] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Moderate</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5 block">
              Question types
            </label>
            <div className="flex gap-2 flex-wrap">
              {(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'] as const).map((qt) => (
                <label
                  key={qt}
                  className={`flex items-center gap-2 px-3.5 py-2 border rounded-xl text-xs font-medium cursor-pointer transition ${form.questionTypes?.includes(qt) ? 'border-[#EA580C] bg-orange-50 text-[#EA580C]' : 'border-stone-200 text-stone-600'}`}
                >
                  <input
                    type="checkbox"
                    checked={form.questionTypes?.includes(qt)}
                    onChange={(e) => {
                      const current = form.questionTypes || [];
                      setForm((f) => ({
                        ...f,
                        questionTypes: e.target.checked
                          ? [...current, qt]
                          : current.filter((t) => t !== qt),
                      }));
                    }}
                    className="accent-[#EA580C]"
                  />
                  {qt.replace('_', ' ')}
                </label>
              ))}
            </div>
          </div>
          <div className="col-span-2 flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button className="flex-1" onClick={() => setStep(3)}>
              Review & generate
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-[#FAF6F0] border border-[#EAE2D5] rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Source</span>
              <span className="font-semibold text-stone-800">
                {documents.find((d) => d.id === form.documentId)?.title || 'All'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Questions</span>
              <span className="font-semibold text-stone-800">{form.numQuestions}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Difficulty</span>
              <span className="font-semibold text-stone-800">{form.difficulty}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Types</span>
              <span className="font-semibold text-stone-800">
                {form.questionTypes?.join(', ') || 'Multiple choice'}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button className="flex-1" onClick={handleGenerate} isLoading={generating}>
              <Sparkles className="w-4 h-4" />
              Generate quiz
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ── Quiz Edit/Review Page (Figma D16) ────────────────────────────────────────
export const AssessmentEditPage: React.FC = () => {
  const { selectedOrg, selectedClass } = useAuth();
  const navigate = useNavigate();
  const assessmentId = window.location.pathname.split('/').slice(-2, -1)[0];
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishType, setPublishType] = useState<'PRACTICE' | 'EXAM'>('PRACTICE');
  const [timeLimitMins, setTimeLimitMins] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  // Editing state
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState('');

  const [questionForm, setQuestionForm] = useState<{
    prompt: string;
    marks: number;
    explanation: string;
    options: Array<{ text: string; isCorrect: boolean }>;
  }>({
    prompt: '',
    marks: 1,
    explanation: '',
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  });

  useEffect(() => {
    if (!selectedOrg?.id || !selectedClass?.id || !assessmentId) return;
    const load = async () => {
      setLoading(true);
      try {
        const a = await assessmentService.getAssessmentById(
          selectedOrg.id,
          selectedClass.id,
          assessmentId,
        );
        setAssessment(a);
        if (a.type === 'EXAM' || a.type === 'PRACTICE') setPublishType(a.type);
        if (a.timeLimitMins) setTimeLimitMins(a.timeLimitMins);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedOrg?.id, selectedClass?.id, assessmentId]);

  const handlePublish = async () => {
    if (!selectedOrg?.id || !selectedClass?.id || !assessment) return;
    setPublishing(true);
    try {
      const updated = await assessmentService.updateAssessment(
        selectedOrg.id,
        selectedClass.id,
        assessment.id,
        {
          status: 'PUBLISHED',
          type: publishType,
          timeLimitMins: publishType === 'EXAM' ? timeLimitMins || 30 : undefined,
          startDate:
            publishType === 'EXAM' && startDate ? new Date(startDate).toISOString() : undefined,
          dueDate: publishType === 'EXAM' && dueDate ? new Date(dueDate).toISOString() : undefined,
        },
      );
      setAssessment(updated);
      setPublishModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!selectedOrg?.id || !selectedClass?.id || !assessment) return;
    if (!window.confirm('Are you sure you want to permanently delete this quiz?')) return;
    try {
      await assessmentService.deleteAssessment(selectedOrg.id, selectedClass.id, assessment.id);
      navigate('/app/assessments');
    } catch (err) {
      console.error(err);
      alert('Failed to delete quiz.');
    }
  };

  const openEditDetails = () => {
    if (!assessment) return;
    setEditTitle(assessment.title);
    setEditDescription(assessment.description || '');
    setEditDetailsOpen(true);
  };

  const handleSaveDetails = async () => {
    if (!selectedOrg?.id || !selectedClass?.id || !assessment) return;
    if (!editTitle.trim()) return;
    setSavingDetails(true);
    try {
      const updated = await assessmentService.updateAssessment(
        selectedOrg.id,
        selectedClass.id,
        assessment.id,
        {
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
        },
      );
      setAssessment((prev) =>
        prev ? { ...prev, title: updated.title, description: updated.description } : null,
      );
      setEditDetailsOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update quiz details.');
    } finally {
      setSavingDetails(false);
    }
  };

  const openAddQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm({
      prompt: '',
      marks: 1,
      explanation: '',
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
    });
    setQuestionError('');
    setQuestionModalOpen(true);
  };

  const openEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setQuestionForm({
      prompt: q.prompt,
      marks: q.marks || 1,
      explanation: q.explanation || '',
      options: q.options?.map((opt) => ({ text: opt.text, isCorrect: opt.isCorrect })) || [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
      ],
    });
    setQuestionError('');
    setQuestionModalOpen(true);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedOrg?.id || !selectedClass?.id || !assessment) return;
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await assessmentService.deleteQuestion(
        selectedOrg.id,
        selectedClass.id,
        assessment.id,
        questionId,
      );
      setAssessment((prev) => {
        if (!prev) return null;
        const newQs = (prev.questions || []).filter((q) => q.id !== questionId);
        return {
          ...prev,
          questions: newQs,
          totalMarks: newQs.reduce((s, q) => s + (q.marks || 1), 0),
        };
      });
    } catch (err) {
      console.error(err);
      alert('Failed to delete question.');
    }
  };

  const handleSaveQuestion = async () => {
    if (!selectedOrg?.id || !selectedClass?.id || !assessment) return;
    if (!questionForm.prompt.trim()) {
      setQuestionError('Question prompt cannot be empty.');
      return;
    }
    const filledOptions = questionForm.options.filter((o) => o.text.trim().length > 0);
    if (filledOptions.length < 2) {
      setQuestionError('Please provide at least 2 non-empty options.');
      return;
    }
    const hasCorrect = filledOptions.some((o) => o.isCorrect);
    if (!hasCorrect) {
      setQuestionError('Please select which option is the correct answer.');
      return;
    }

    setSavingQuestion(true);
    setQuestionError('');
    try {
      if (editingQuestion) {
        const updatedQ = await assessmentService.updateQuestion(
          selectedOrg.id,
          selectedClass.id,
          assessment.id,
          editingQuestion.id,
          {
            prompt: questionForm.prompt.trim(),
            marks: Number(questionForm.marks) || 1,
            explanation: questionForm.explanation.trim() || undefined,
            options: filledOptions.map((opt, i) => ({
              text: opt.text.trim(),
              isCorrect: opt.isCorrect,
              order: i,
            })),
          },
        );
        setAssessment((prev) => {
          if (!prev) return null;
          const newQs = (prev.questions || []).map((q) =>
            q.id === editingQuestion.id ? { ...q, ...updatedQ } : q,
          );
          return {
            ...prev,
            questions: newQs,
            totalMarks: newQs.reduce((s, q) => s + (q.marks || 1), 0),
          };
        });
      } else {
        const newQ = await assessmentService.addQuestion(
          selectedOrg.id,
          selectedClass.id,
          assessment.id,
          {
            prompt: questionForm.prompt.trim(),
            marks: Number(questionForm.marks) || 1,
            explanation: questionForm.explanation.trim() || undefined,
            options: filledOptions.map((opt, i) => ({
              text: opt.text.trim(),
              isCorrect: opt.isCorrect,
              order: i,
            })),
          },
        );
        setAssessment((prev) => {
          if (!prev) return null;
          const newQs = [...(prev.questions || []), newQ];
          return {
            ...prev,
            questions: newQs,
            totalMarks: newQs.reduce((s, q) => s + (q.marks || 1), 0),
          };
        });
      }
      setQuestionModalOpen(false);
    } catch (err) {
      console.error(err);
      setQuestionError('Failed to save question. Please try again.');
    } finally {
      setSavingQuestion(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#EA580C]" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="text-center py-24 text-stone-400">
        <p>Assessment not found.</p>
        <Button size="sm" className="mt-4" onClick={() => navigate('/app/assessments')}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">
              {assessment.status === 'DRAFT' ? 'Review & Edit Quiz' : 'Quiz Details'}
            </span>
            <Badge variant={assessment.status === 'PUBLISHED' ? 'ready' : 'neutral'}>
              {assessment.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-stone-900">{assessment.title}</h1>
            <button
              type="button"
              onClick={openEditDetails}
              title="Edit title & description"
              className="p-1 rounded-lg text-stone-400 hover:text-[#EA580C] hover:bg-stone-100 transition"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
          {assessment.description && (
            <p className="text-stone-500 text-xs mt-1 max-w-xl">{assessment.description}</p>
          )}
          <p className="text-stone-400 text-xs mt-1">
            {assessment.questions?.length || 0} questions ·{' '}
            {assessment.totalMarks || assessment.questions?.length || 0} marks
            {assessment.type &&
            assessment.type !== 'AI_GENERATED' &&
            assessment.type !== 'TEACHER_CREATED'
              ? ` · ${assessment.type}`
              : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {assessment.status === 'DRAFT' && (
            <Button size="sm" onClick={() => setPublishModalOpen(true)}>
              <CheckSquare className="w-3.5 h-3.5 mr-1" />
              Publish
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDeleteQuiz}
            className="text-stone-400 hover:text-red-600 hover:bg-red-50 text-xs"
            title="Delete quiz"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete Quiz
          </Button>
          <Button size="sm" variant="secondary" onClick={() => navigate('/app/assessments')}>
            Back
          </Button>
        </div>
      </div>

      {/* Questions list */}
      <div className="space-y-4">
        {assessment.questions?.map((q, idx) => (
          <Card key={q.id} className="p-6 relative transition hover:border-[#EA580C]/20">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="text-xs font-bold bg-[#EA580C] text-white w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-900 leading-snug">{q.prompt}</p>
                  <span className="text-[11px] font-bold text-stone-400 mt-1 inline-block">
                    {q.marks || 1} {q.marks === 1 ? 'mark' : 'marks'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditQuestion(q)}
                  className="h-8 px-2.5 text-stone-600 hover:text-[#EA580C] text-xs font-semibold"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="h-8 px-2 text-stone-400 hover:text-red-600 hover:bg-red-50 text-xs"
                  title="Delete question"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="pl-9 space-y-3">
              {q.options && q.options.length > 0 && (
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <div
                      key={oi}
                      className={`px-4 py-2.5 rounded-xl text-sm border flex items-center justify-between ${
                        opt.isCorrect
                          ? 'border-emerald-400 bg-emerald-50/80 text-emerald-800 font-medium'
                          : 'border-[#EAE2D5] bg-[#FAF6F0] text-stone-700'
                      }`}
                    >
                      <span>{opt.text}</span>
                      {opt.isCorrect && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3.5 h-3.5" /> Correct
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {q.explanation && (
                <div className="flex items-start gap-2 bg-amber-50/60 border border-amber-200 rounded-xl px-3 py-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">{q.explanation}</p>
                </div>
              )}
            </div>
          </Card>
        ))}

        {/* Add Question Button */}
        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            onClick={openAddQuestion}
            className="border-dashed border-2 border-stone-300 hover:border-[#EA580C] hover:text-[#EA580C] py-3.5 px-6 rounded-2xl w-full flex items-center justify-center font-bold text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Edit Question Modal */}
      <Modal
        isOpen={questionModalOpen}
        onClose={() => setQuestionModalOpen(false)}
        title={editingQuestion ? 'Edit Question' : 'Add New Question'}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {questionError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium">
              {questionError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Question Prompt *
            </label>
            <textarea
              rows={3}
              value={questionForm.prompt}
              onChange={(e) => setQuestionForm((f) => ({ ...f, prompt: e.target.value }))}
              placeholder="Enter the question text..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAE2D5] text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C]"
            />
          </div>

          <div className="w-36">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Marks (Points)
            </label>
            <Input
              type="number"
              min="0.5"
              step="0.5"
              value={questionForm.marks}
              onChange={(e) =>
                setQuestionForm((f) => ({ ...f, marks: parseFloat(e.target.value) || 1 }))
              }
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Options & Correct Answer *
              </label>
              <span className="text-[11px] text-stone-400">
                Click circle to select the correct answer
              </span>
            </div>
            <div className="space-y-2.5">
              {questionForm.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setQuestionForm((f) => ({
                        ...f,
                        options: f.options.map((o, idx) => ({ ...o, isCorrect: idx === i })),
                      }));
                    }}
                    title={opt.isCorrect ? 'Correct option' : 'Set as correct option'}
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition ${
                      opt.isCorrect
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-stone-300 hover:border-emerald-400 text-transparent'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuestionForm((f) => ({
                        ...f,
                        options: f.options.map((o, idx) => (idx === i ? { ...o, text: val } : o)),
                      }));
                    }}
                    placeholder={`Option ${i + 1}`}
                    className={`flex-1 px-3.5 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 ${
                      opt.isCorrect ? 'border-emerald-400 bg-emerald-50/30' : 'border-[#EAE2D5]'
                    }`}
                  />
                  {questionForm.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuestionForm((f) => {
                          const nextOpts = f.options.filter((_, idx) => idx !== i);
                          if (opt.isCorrect && nextOpts.length > 0) {
                            nextOpts[0].isCorrect = true;
                          }
                          return { ...f, options: nextOpts };
                        });
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50"
                      title="Remove option"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {questionForm.options.length < 6 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuestionForm((f) => ({
                    ...f,
                    options: [...f.options, { text: '', isCorrect: false }],
                  }));
                }}
                className="mt-2 text-xs font-semibold text-[#EA580C] hover:bg-[#EA580C]/10"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Option
              </Button>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Explanation (Optional)
            </label>
            <textarea
              rows={2}
              value={questionForm.explanation}
              onChange={(e) => setQuestionForm((f) => ({ ...f, explanation: e.target.value }))}
              placeholder="Detailed explanation of why this answer is correct..."
              className="w-full px-3.5 py-2 rounded-xl border border-[#EAE2D5] text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setQuestionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSaveQuestion} isLoading={savingQuestion}>
              {editingQuestion ? 'Save Changes' : 'Add Question'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Quiz Details Modal */}
      <Modal
        isOpen={editDetailsOpen}
        onClose={() => setEditDetailsOpen(false)}
        title="Edit Quiz Details"
        maxWidth="md"
      >
        <div className="space-y-4">
          <Input
            label="Quiz Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="e.g. Operating Systems Chapter 2 Quiz"
          />
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="What is this quiz about?"
              className="w-full px-3.5 py-2 rounded-xl border border-[#EAE2D5] text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setEditDetailsOpen(false)}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSaveDetails} isLoading={savingDetails}>
              Save Details
            </Button>
          </div>
        </div>
      </Modal>

      {/* Publish Modal — Choose type */}
      <Modal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        title="Publish Assessment"
        maxWidth="md"
      >
        <div className="space-y-5">
          <p className="text-sm text-stone-600">
            Choose how students will interact with this assessment:
          </p>

          {/* Type Selector */}
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                publishType === 'PRACTICE'
                  ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                  : 'border-stone-200 hover:border-emerald-300'
              }`}
              onClick={() => setPublishType('PRACTICE')}
            >
              <div className="flex items-center gap-2 mb-2">
                <BookOpen
                  className={`w-5 h-5 ${publishType === 'PRACTICE' ? 'text-emerald-600' : 'text-stone-400'}`}
                />
                <span className="text-sm font-bold text-stone-900">Practice</span>
              </div>
              <ul className="text-xs text-stone-500 space-y-1">
                <li>✓ Multiple attempts allowed</li>
                <li>✓ Answers revealed after submit</li>
                <li>✓ No time restrictions</li>
                <li>✓ No fullscreen required</li>
              </ul>
            </label>

            <label
              className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                publishType === 'EXAM'
                  ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-500/20'
                  : 'border-stone-200 hover:border-violet-300'
              }`}
              onClick={() => setPublishType('EXAM')}
            >
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap
                  className={`w-5 h-5 ${publishType === 'EXAM' ? 'text-violet-600' : 'text-stone-400'}`}
                />
                <span className="text-sm font-bold text-stone-900">Exam</span>
              </div>
              <ul className="text-xs text-stone-500 space-y-1">
                <li>✓ Single attempt only</li>
                <li>✓ Time limit enforced</li>
                <li>✓ Fullscreen mode required</li>
                <li>✓ Tab switching blocked</li>
              </ul>
            </label>
          </div>

          {/* Exam-specific settings */}
          {publishType === 'EXAM' && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-violet-700 uppercase tracking-wider">
                Exam Settings & Schedule
              </p>
              <div>
                <label className="text-xs font-semibold text-stone-600 mb-1 block">
                  Time Limit (minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={timeLimitMins || 30}
                  onChange={(e) => setTimeLimitMins(+e.target.value)}
                  className="w-full bg-white border border-violet-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-600 mb-1 block">
                    Schedule Start (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-violet-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">
                    When attempts open
                  </span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-600 mb-1 block">
                    Due Date / Deadline (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-white border border-violet-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">
                    When attempts close
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Exam mode enforces single attempt, fullscreen mode, tab-switch detection, and
                  automatic submission upon timeout.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setPublishModalOpen(false)}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handlePublish} isLoading={publishing}>
              <CheckSquare className="w-3.5 h-3.5" />
              Publish as {publishType === 'EXAM' ? 'Exam' : 'Practice'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ── Quiz Taking Page (Figma D17) ──────────────────────────────────────────────
export const QuizTakingPage: React.FC = () => {
  const { selectedOrg, selectedClass } = useAuth();
  const navigate = useNavigate();
  // assignmentId comes from the URL: /assessments/:assessmentId/take/:assignmentId
  const parts = window.location.pathname.split('/');
  const assignmentId = parts[parts.indexOf('take') + 1];

  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fullscreen & anti-cheat state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const maxTabSwitches = 3;
  const autoSubmitRef = useRef(false);

  // Countdown timer
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isExamMode = attempt?.enforceFullscreen || attempt?.assessmentType === 'EXAM';

  // ── Fullscreen helpers ────────────────────────────────────────────────────
  const enterFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (
        (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> })
          .webkitRequestFullscreen
      ) {
        await (
          el as HTMLElement & { webkitRequestFullscreen: () => Promise<void> }
        ).webkitRequestFullscreen();
      } else if (
        (el as HTMLElement & { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen
      ) {
        await (
          el as HTMLElement & { msRequestFullscreen: () => Promise<void> }
        ).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  }, []);

  // ── Tab switch & anti-cheat detection ─────────────────────────────────────
  useEffect(() => {
    if (!isExamMode || !attempt || !examStarted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const newCount = prev + 1;
          if (newCount >= maxTabSwitches && !autoSubmitRef.current) {
            autoSubmitRef.current = true;
            setWarningMessage(
              `You switched tabs ${maxTabSwitches} times. Your quiz is being auto-submitted due to academic integrity violations.`,
            );
            setShowWarning(true);
            setTimeout(() => handleAutoSubmit(), 1500);
          } else {
            setWarningMessage(
              `⚠️ Tab switch detected! (${newCount}/${maxTabSwitches}). Switching tabs is strictly forbidden. Your quiz will auto-submit after ${maxTabSwitches} violations.`,
            );
            setShowWarning(true);
            setTimeout(() => setShowWarning(false), 4500);
          }
          return newCount;
        });
      }
    };

    const handleFullscreenChange = () => {
      const isFS = !!document.fullscreenElement;
      setIsFullscreen(isFS);
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11' || (e.altKey && e.key === 'Tab')) {
        e.preventDefault();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExamMode, attempt, examStarted]);

  // ── Timer logic ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!examStarted || !attempt?.timeLimitMins || !attempt.startedAt) return;

    const startTime = new Date(attempt.startedAt).getTime();
    const endTime = startTime + attempt.timeLimitMins * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining <= 0 && !autoSubmitRef.current) {
        autoSubmitRef.current = true;
        setWarningMessage('⏰ Time limit reached! Auto-submitting your quiz...');
        setShowWarning(true);
        setTimeout(() => handleAutoSubmit(), 1500);
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examStarted, attempt?.timeLimitMins, attempt?.startedAt]);

  // ── Auto submit helper ────────────────────────────────────────────────────
  const handleAutoSubmit = async () => {
    if (!selectedOrg?.id || !selectedClass?.id || !attempt) return;
    try {
      const result = await assessmentService.submitAttempt(
        selectedOrg.id,
        selectedClass.id,
        assignmentId,
        attempt.id!,
        Object.entries(responses).map(([questionId, selectedOptionId]) => ({
          questionId,
          selectedOptionId,
        })),
      );
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
      navigate(`/app/assessments/${assignmentId}/attempts/${result.id}/results`, {
        state: { result },
      });
    } catch (err) {
      console.error('Auto-submit failed:', err);
    }
  };

  // ── Load attempt ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedOrg?.id || !selectedClass?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        const att = await assessmentService.startAttempt(
          selectedOrg.id,
          selectedClass.id,
          assignmentId,
        );
        setAttempt(att);
        const isExam = att.enforceFullscreen || att.assessmentType === 'EXAM';
        if (!isExam) {
          setExamStarted(true);
        }
      } catch (err) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not start the quiz. Please try again.';
        console.error('Failed to start attempt:', err);
        alert(message);
        navigate('/app/assessments');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedOrg?.id, selectedClass?.id]);

  const handleSubmit = async () => {
    if (!selectedOrg?.id || !selectedClass?.id || !attempt) return;
    setSubmitting(true);
    try {
      const result = await assessmentService.submitAttempt(
        selectedOrg.id,
        selectedClass.id,
        assignmentId,
        attempt.id!,
        Object.entries(responses).map(([questionId, selectedOptionId]) => ({
          questionId,
          selectedOptionId,
        })),
      );
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
      navigate(`/app/assessments/${assignmentId}/attempts/${result.id}/results`, {
        state: { result },
      });
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to submit quiz. Please try again.';
      console.error('Submit failed:', err);
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#EA580C]" />
      </div>
    );
  }

  // Questions come from the attempt session (sanitized — no isCorrect exposed)
  const questions = attempt?.questions ?? [];
  const q = questions[currentQ];
  const totalAnswered = Object.keys(responses).length;
  const progress = questions.length > 0 ? (totalAnswered / questions.length) * 100 : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── Exam Pre-Flight Instructions Screen ───────────────────────────────────
  if (isExamMode && !examStarted) {
    return (
      <Card className="p-8 max-w-xl mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto text-violet-600">
          <Shield className="w-8 h-8" />
        </div>
        <div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-violet-100 text-violet-700 mb-2">
            <Lock className="w-3 h-3" /> Assessment Mode
          </span>
          <h2 className="text-2xl font-black text-stone-900">
            {attempt?.assessmentTitle || 'Assessment Exam'}
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            {questions.length} questions · {attempt?.timeLimitMins || 30} min time limit
          </p>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-left space-y-3 text-xs text-stone-600">
          <p className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
            Assessment Integrity Rules:
          </p>
          <div className="flex items-start gap-2.5">
            <Maximize className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
            <span>
              <strong>Fullscreen Required:</strong> This assessment must be completed in fullscreen.
              Exiting full screen is not allowed until submission.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>No Tab Switching:</strong> Navigating away from this tab or window is
              monitored. After 3 violations, your assessment will be automatically submitted.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>
              <strong>Time Limit Enforced:</strong> The timer runs continuously and will auto-submit
              answers upon expiration.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Single Attempt:</strong> Assessment quizzes can only be attempted once.
            </span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => navigate('/app/assessments')}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 py-3 text-sm font-bold bg-violet-600 hover:bg-violet-700 shadow-md shadow-violet-500/20"
            onClick={async () => {
              await enterFullscreen();
              setExamStarted(true);
            }}
          >
            <Maximize className="w-4 h-4" />
            Enter Fullscreen & Begin
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div
      className={`max-w-2xl mx-auto space-y-6 ${isExamMode ? 'select-none' : ''}`}
      onCopy={(e) => {
        if (isExamMode) e.preventDefault();
      }}
      onCut={(e) => {
        if (isExamMode) e.preventDefault();
      }}
      onPaste={(e) => {
        if (isExamMode) e.preventDefault();
      }}
      onContextMenu={(e) => {
        if (isExamMode) e.preventDefault();
      }}
    >
      {/* Fullscreen exited locker overlay */}
      {isExamMode && examStarted && !isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 backdrop-blur-md">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-stone-900">Fullscreen Required</h3>
            <p className="text-sm text-stone-600">
              Exiting full screen is not allowed until your quiz has been submitted. Click below to
              return to full screen and continue your exam.
            </p>
            <Button
              className="w-full bg-violet-600 hover:bg-violet-700 py-3"
              onClick={() => enterFullscreen()}
            >
              <Maximize className="w-4 h-4" />
              Return to Fullscreen
            </Button>
          </div>
        </div>
      )}

      {/* Warning overlay */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <p className="text-lg font-bold text-stone-900 mb-2">Academic Integrity Warning</p>
            <p className="text-sm text-stone-600">{warningMessage}</p>
            {!autoSubmitRef.current && (
              <Button
                className="mt-4"
                onClick={() => {
                  setShowWarning(false);
                  enterFullscreen();
                }}
              >
                <Maximize className="w-4 h-4" />
                Return to Quiz
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Exam mode banner */}
      {isExamMode && (
        <div className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-600" />
            <span className="text-xs font-semibold text-violet-700">
              EXAM MODE — Fullscreen enforced
            </span>
          </div>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${tabSwitchCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'}`}
          >
            Tab switches: {tabSwitchCount}/{maxTabSwitches}
          </span>
        </div>
      )}

      {/* Progress header */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-500 font-medium">{attempt?.assessmentTitle}</span>
        <div className="flex items-center gap-4">
          {/* Countdown timer */}
          {timeRemaining != null && (
            <span
              className={`font-mono font-bold text-sm flex items-center gap-1 ${
                timeRemaining <= 60
                  ? 'text-red-500 animate-pulse'
                  : timeRemaining <= 300
                    ? 'text-amber-600'
                    : 'text-stone-600'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {formatTime(timeRemaining)}
            </span>
          )}
          <span className="text-[#EA580C] font-bold">
            {currentQ + 1} / {questions.length}
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-[#EAE2D5] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#EA580C] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {q && (
        <Card className="p-7">
          <p className="text-xs font-bold uppercase tracking-wider text-[#EA580C] mb-3">
            Question {currentQ + 1}
          </p>
          <p className="text-base font-semibold text-stone-900 mb-5">{q.prompt}</p>

          {q.questionType === 'MULTIPLE_CHOICE' && q.options && (
            <div className="space-y-2.5">
              {q.options.map((opt, i) => {
                const optId = opt.id || `${i}`;
                const isSelected = responses[q.id] === optId;
                return (
                  <label
                    key={i}
                    className={`flex items-center gap-3 px-4 py-3.5 border rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#EA580C] bg-orange-50'
                        : 'border-[#EAE2D5] hover:border-[#EA580C]/50 bg-[#FAF6F0]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                        isSelected ? 'border-[#EA580C] bg-[#EA580C]' : 'border-stone-300'
                      }`}
                    />
                    <span className="text-sm text-stone-800">{opt.text}</span>
                    <input
                      type="radio"
                      name={q.id}
                      className="sr-only"
                      onChange={() => setResponses((r) => ({ ...r, [q.id]: optId }))}
                    />
                  </label>
                );
              })}
            </div>
          )}

          {q.questionType === 'SHORT_ANSWER' && (
            <textarea
              rows={4}
              placeholder="Type your answer..."
              value={responses[q.id] || ''}
              onChange={(e) => setResponses((r) => ({ ...r, [q.id]: e.target.value }))}
              className="w-full bg-[#F4EFEA]/80 border border-[#E2D8CC] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 resize-none"
            />
          )}
        </Card>
      )}

      {/* Question navigator (pills) */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((qn, i) => (
          <button
            key={qn.id}
            onClick={() => setCurrentQ(i)}
            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
              i === currentQ
                ? 'bg-[#EA580C] text-white'
                : responses[qn.id]
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-stone-100 text-stone-500 border border-stone-200'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="flex justify-between">
        <Button
          variant="secondary"
          disabled={currentQ === 0}
          onClick={() => setCurrentQ((q) => q - 1)}
        >
          Previous
        </Button>

        {currentQ < questions.length - 1 ? (
          <Button onClick={() => setCurrentQ((q) => q + 1)}>Next question</Button>
        ) : (
          <Button onClick={handleSubmit} isLoading={submitting}>
            Submit quiz
          </Button>
        )}
      </div>
    </div>
  );
};

// ── Quiz Results Page ───────────────────────────────────────────────────────────
export const QuizResultsPage: React.FC = () => {
  const { selectedOrg, selectedClass } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { assignmentId, attemptId } = useParams<{ assignmentId: string; attemptId: string }>();

  const locationState = location.state as { result?: QuizAttempt } | null;
  const [result, setResult] = useState<QuizAttempt | null>(locationState?.result || null);
  const [loading, setLoading] = useState(!locationState?.result);

  useEffect(() => {
    if (result || !selectedOrg?.id || !selectedClass?.id || !assignmentId || !attemptId) return;
    assessmentService
      .getAttemptResult(selectedOrg.id, selectedClass.id, assignmentId, attemptId)
      .then(setResult)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedOrg?.id, selectedClass?.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#EA580C]" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-24 text-stone-400">
        <p>Results not available.</p>
        <Button size="sm" className="mt-4" onClick={() => navigate('/app/assessments')}>
          Back to Assessments
        </Button>
      </div>
    );
  }

  const passed = result.isPassed ?? (result.percentage != null ? result.percentage >= 60 : null);
  const pct =
    result.percentage ??
    (result.scoreAchieved != null && result.totalMarks
      ? Math.round((result.scoreAchieved / result.totalMarks) * 100)
      : null);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Hero result card */}
      <Card className="p-8 text-center">
        <div
          className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
            passed === true ? 'bg-emerald-100' : passed === false ? 'bg-red-100' : 'bg-stone-100'
          }`}
        >
          {passed === true ? (
            <Trophy className="w-10 h-10 text-emerald-600" />
          ) : passed === false ? (
            <XCircle className="w-10 h-10 text-red-500" />
          ) : (
            <CheckCircle className="w-10 h-10 text-stone-400" />
          )}
        </div>

        <h1 className="text-2xl font-extrabold text-stone-900">
          {passed === true
            ? '🎉 Well done!'
            : passed === false
              ? 'Better luck next time'
              : 'Submitted!'}
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          {result.status === 'TIMED_OUT' ? 'Time ran out' : 'Quiz completed'}
        </p>

        {pct != null && (
          <div className="mt-6">
            <div className="text-5xl font-black text-[#EA580C]">{pct}%</div>
            {result.scoreAchieved != null && result.totalMarks != null && (
              <p className="text-stone-400 text-sm mt-1">
                {result.scoreAchieved} / {result.totalMarks} marks
              </p>
            )}
          </div>
        )}

        {!result.scoresRevealed && (
          <p className="text-sm text-stone-400 mt-4 italic">
            Scores will be revealed by your teacher.
          </p>
        )}

        {result.timeSpentSecs != null && (
          <p className="flex items-center justify-center gap-1.5 text-xs text-stone-400 mt-3">
            <Clock className="w-3.5 h-3.5" />
            Time spent: {Math.floor(result.timeSpentSecs / 60)}m {result.timeSpentSecs % 60}s
          </p>
        )}
      </Card>

      {/* Per-question breakdown (only if answers revealed) */}
      {result.answersRevealed && result.responses && result.responses.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider">Review</h2>
          {result.responses.map((r, i) => (
            <Card key={r.questionId} className="p-4">
              <div className="flex items-start gap-3">
                {r.isCorrect ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800">
                    Q{i + 1}. {r.prompt}
                  </p>
                  {r.explanation && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                      {r.explanation}
                    </p>
                  )}
                </div>
                {result.scoresRevealed && r.marksAwarded != null && (
                  <span className="text-xs font-bold text-stone-500 shrink-0">
                    +{r.marksAwarded}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Button className="w-full" onClick={() => navigate('/app/assessments')}>
        Back to Assessments
      </Button>
    </div>
  );
};
