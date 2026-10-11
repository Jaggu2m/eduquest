export type Role = 'PLATFORM_ADMIN' | 'TEACHER' | 'STUDENT';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  role?: Role;
  isPlatformAdmin?: boolean;
  createdAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  description?: string | null;
  role?: Role;
}

export interface ClassRoom {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  organizationId: string;
  isActive: boolean;
  teacher?: User;
  learnerCount?: number;
  createdAt?: string;
}

export type Classroom = ClassRoom;

export interface Enrollment {
  id: string;
  classId: string;
  userId: string;
  enrolledAt: string;
  user: User;
}

export interface DocumentResource {
  id: string;
  title: string;
  originalName?: string;
  fileUrl?: string;
  mimeType?: string;
  fileType?: string;
  sizeBytes?: number;
  fileSizeBytes?: number;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'FAILED';
  chunkCount?: number;
  classId: string;
  createdAt: string;
}

export interface QuestionOption {
  id?: string;
  text: string;
  isCorrect: boolean;
  order?: number;
}

export interface Question {
  id: string;
  prompt: string;
  questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  marks: number;
  explanation?: string | null;
  topic?: string | null;
  order?: number;
  options: QuestionOption[];
}

export interface Assessment {
  id: string;
  title: string;
  description?: string | null;
  classId: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  type?: string;
  timeLimitMins?: number | null;
  passingScore?: number | null;
  totalMarks?: number;
  questions?: Question[];
  questionCount?: number;
  _count?: { questions?: number };
  createdAt?: string;
}

export interface Assignment {
  id: string;
  assessmentId: string;
  classId: string;
  startDate?: string | null;
  dueDate?: string | null;
  maxAttempts?: number;
  revealScores?: boolean;
  revealAnswers?: boolean;
  assessment?: Assessment & { _count?: { questions?: number } };
  // Student-specific attempt tracking (populated by backend)
  userAttemptCount?: number;
  userCompletedCount?: number;
  userBestScore?: number;
  hasActiveAttempt?: boolean;
}

export interface QuizAttempt {
  id: string;
  assessmentId?: string;
  userId?: string;
  attemptNumber?: number;
  status?: 'IN_PROGRESS' | 'EVALUATED' | 'TIMED_OUT';
  score?: number;
  totalMarks?: number;
  scoreAchieved?: number;
  scorePercent?: number;
  percentage?: number;
  isPassed?: boolean;
  scoresRevealed?: boolean;
  answersRevealed?: boolean;
  startedAt?: string;
  submittedAt?: string;
  timeSpentSecs?: number;
  // Session fields returned by startAttempt
  attemptId?: string;
  assessmentTitle?: string;
  assessmentType?: 'PRACTICE' | 'EXAM' | 'AI_GENERATED' | 'TEACHER_CREATED';
  enforceFullscreen?: boolean;
  preventTabSwitch?: boolean;
  timeLimitMins?: number | null;
  questions?: Array<{
    id: string;
    prompt: string;
    questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
    marks: number;
    order?: number;
    topic?: string | null;
    options: Array<{ id: string; text: string; order?: number }>;
  }>;
  // Result fields
  responses?: Array<{
    questionId: string;
    prompt?: string;
    selectedOptionId?: string;
    textResponse?: string;
    isCorrect?: boolean | null;
    marksAwarded?: number;
    explanation?: string | null;
  }>;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint?: string | null;
  masteryLevel: number; // 0: Again, 1: Hard, 2: Good, 3: Mastered
  nextReviewDate?: string;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  topic?: string | null;
  classId: string;
  cardsCount: number;
  masteryPercentage: number;
  cards?: Flashcard[];
  createdAt: string;
}

export interface DiscussionChannel {
  id: string;
  name: string;
  description?: string | null;
  classId: string;
  unreadCount?: number;
  lastMessage?: string;
  updatedAt?: string;
}

export interface DiscussionMessage {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  sender: User;
  createdAt: string;
  parentId?: string | null;
  replyCount?: number;
}

export interface Citation {
  documentId: string;
  documentTitle: string;
  page?: number;
  score?: number;
  snippet: string;
}

export interface ConversationMessage {
  id: string;
  sender: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
  citations?: Citation[];
}

export interface Conversation {
  id: string;
  title: string;
  documentId?: string | null;
  classId: string;
  updatedAt: string;
}

export interface TopicMastery {
  topic: string;
  mastery: number; // 0-100%
  studentsCount: number;
  status: 'STRONG' | 'MODERATE' | 'WEAK';
}

export interface QuestionDifficulty {
  questionId: string;
  prompt: string;
  itemDifficulty: number; // p-value
  discriminationIndex: number;
  difficultyLabel: 'EASY' | 'MODERATE' | 'HARD';
}

export interface RemedialRecommendation {
  id: string;
  topic: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  insight: string;
  recommendedAction: string;
}
