import { z } from 'zod';

// ── Auth ──────────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

// ── Organization ──────────────────────────────────────────────────────────────

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required.'),
  slug: z
    .string()
    .min(1, 'Slug is required.')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens.'),
  logoUrl: z.string().url('Invalid logo URL.').optional(),
  description: z.string().optional(),
});

export const UpdateOrganizationSchema = z
  .object({
    name: z.string().min(1).optional(),
    logoUrl: z.string().url('Invalid logo URL.').optional(),
    description: z.string().optional(),
  })
  .strict(); // disallow unknown fields

// ── User ──────────────────────────────────────────────────────────────────────

export const UpdateUserSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    avatarUrl: z.string().url('Invalid avatar URL.').optional(),
  })
  .strict();

// ── Membership ────────────────────────────────────────────────────────────────

const RoleEnum = z.enum(['PLATFORM_ADMIN', 'TEACHER', 'STUDENT'], {
  errorMap: () => ({ message: 'Role must be one of: PLATFORM_ADMIN, TEACHER, STUDENT.' }),
});

export const AddMemberSchema = z.object({
  userId: z.string().min(1, 'userId is required.'),
  role: RoleEnum,
});

export const UpdateMemberSchema = z
  .object({
    role: RoleEnum.optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

// ── Org Invitation ────────────────────────────────────────────────────────────

export const CreateInvitationSchema = z.object({
  email: z.string().email('Invalid email address.'),
  role: RoleEnum,
});

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required.'),
});

// ── Class & Enrollment ────────────────────────────────────────────────────────

export const CreateClassSchema = z.object({
  name: z.string().min(1, 'Class name is required.'),
  code: z.string().optional(),
  description: z.string().optional(),
});

export const UpdateClassSchema = z
  .object({
    name: z.string().min(1).optional(),
    code: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const EnrollStudentSchema = z.object({
  userId: z.string().min(1, 'userId is required.'),
});

// ── Document & Resources ──────────────────────────────────────────────────────

export const UploadDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(255),
});

export const UpdateDocumentSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

// ── Assessment & Quiz Generation ──────────────────────────────────────────────

export const QuestionTypeEnum = z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']);
export const AssessmentTypeEnum = z.enum(['AI_GENERATED', 'TEACHER_CREATED', 'PRACTICE']);
export const AssessmentStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export const DifficultyEnum = z.enum(['EASY', 'MEDIUM', 'HARD']);

export const GenerateQuizSchema = z.object({
  documentId: z.string().min(1).optional(),
  content: z.string().min(10).optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  numQuestions: z.coerce.number().int().min(1).max(30).default(5),
  questionTypes: z.array(QuestionTypeEnum).default(['MULTIPLE_CHOICE']),
  difficulty: DifficultyEnum.default('MEDIUM'),
  timeLimitMins: z.coerce.number().int().positive().optional(),
  passingScore: z.coerce.number().min(0).max(100).optional(),
  customPrompt: z.string().optional(),
  topic: z.string().trim().optional(),
  topics: z.array(z.string().trim()).optional(),
});

const OptionSchema = z.object({
  text: z.string().min(1, 'Option text is required.'),
  isCorrect: z.boolean().default(false),
  order: z.number().int().optional(),
});

export const CreateAssessmentSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(255),
  description: z.string().optional(),
  timeLimitMins: z.coerce.number().int().positive().optional(),
  passingScore: z.coerce.number().min(0).max(100).optional(),
  documentId: z.string().optional(),
  questions: z
    .array(
      z.object({
        prompt: z.string().min(1, 'Question prompt is required.'),
        questionType: QuestionTypeEnum.default('MULTIPLE_CHOICE'),
        marks: z.coerce.number().positive().default(1.0),
        explanation: z.string().optional(),
        topic: z.string().optional(),
        order: z.number().int().optional(),
        options: z.array(OptionSchema).optional(),
      }),
    )
    .min(1, 'Assessment must contain at least one question.'),
});

export const UpdateAssessmentSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    status: AssessmentStatusEnum.optional(),
    timeLimitMins: z.coerce.number().int().positive().nullable().optional(),
    passingScore: z.coerce.number().min(0).max(100).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const UpdateQuestionSchema = z
  .object({
    prompt: z.string().min(1).optional(),
    marks: z.coerce.number().positive().optional(),
    explanation: z.string().optional(),
    order: z.number().int().optional(),
    options: z.array(OptionSchema).optional(),
  })
  .strict();

// ── Assessment Scheduling & Attempts (Phase 8) ────────────────────────────────

export const CreateAssignmentSchema = z.object({
  assessmentId: z.string().min(1, 'assessmentId is required.'),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  maxAttempts: z.coerce.number().int().positive().default(1),
  revealScores: z.boolean().default(true),
  revealAnswers: z.boolean().default(false),
});

export const UpdateAssignmentSchema = z
  .object({
    startDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().nullable().optional(),
    maxAttempts: z.coerce.number().int().positive().optional(),
    revealScores: z.boolean().optional(),
    revealAnswers: z.boolean().optional(),
  })
  .strict();

export const SubmitAttemptSchema = z.object({
  responses: z
    .array(
      z.object({
        questionId: z.string().min(1, 'questionId is required.'),
        selectedOptionId: z.string().nullable().optional(),
        textResponse: z.string().nullable().optional(),
        timeSpentSecs: z.coerce.number().int().nonnegative().optional(),
      }),
    )
    .min(1, 'At least one response must be submitted.'),
});

export const CreateConversationSchema = z
  .object({
    title: z.string().trim().min(1, 'Title must not be empty.').max(200).optional(),
    documentId: z.string().trim().min(1).optional(),
  })
  .strict();

export const SendMessageSchema = z
  .object({
    content: z.string().trim().min(1, 'Message content cannot be empty.').max(5000),
  })
  .strict();

// ── Flashcard Decks (Phase 11) ────────────────────────────────────────────────

export const GenerateFlashcardDeckSchema = z.object({
  documentId: z.string().min(1, 'documentId is required.'),
  title: z.string().trim().min(1).max(255).optional(),
  topic: z.string().trim().max(200).optional(),
  numCards: z.coerce.number().int().min(3).max(50).default(10),
  difficulty: DifficultyEnum.default('MEDIUM'),
});

export const UpdateFlashcardDeckSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(500).optional(),
  })
  .strict();

export const ReviewFlashcardSchema = z.object({
  masteryLevel: z.coerce.number().int().min(0).max(3, 'masteryLevel must be 0–3.'),
});

// ── Channels & Discussion (Phase 10) ─────────────────────────────────────────

export const CreateChannelSchema = z.object({
  name: z.string().trim().min(1, 'Channel name is required.').max(100),
  description: z.string().trim().max(500).optional(),
});

export const PostMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message content cannot be empty.').max(4000),
  parentId: z.string().trim().min(1).optional(), // For threaded replies
});

export const EditMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message content cannot be empty.').max(4000),
});

export const AddChannelMemberSchema = z.object({
  userId: z.string().min(1, 'userId is required.'),
});

