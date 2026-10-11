import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

// Auth pages
import { LandingPage } from './features/auth/LandingPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { OrganizationSelectorPage } from './features/auth/OrganizationSelectorPage';

// App feature pages
import { DashboardPage } from './features/classrooms/DashboardPage';
import { CreateClassPage, JoinClassPage } from './features/classrooms/ClassManagementPages';
import { ResourcesPage } from './features/resources/ResourcesPage';
import { AiTutorPage } from './features/ai-tutor/AiTutorPage';
import {
  AssessmentsPage,
  AssessmentEditPage,
  QuizTakingPage,
  QuizResultsPage,
} from './features/assessments/AssessmentsPages';
import { FlashcardsPage, FlashcardStudyPage } from './features/flashcards/FlashcardsPages';
import { DiscussionsPage } from './features/discussions/DiscussionsPage';
import { AnalyticsPage } from './features/analytics/AnalyticsPage';
import { StudentsPage } from './features/students/StudentsPage';

import { RouteErrorBoundary } from './components/common/RouteErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const router = createBrowserRouter([
  // Public routes
  { path: '/', element: <LandingPage />, errorElement: <RouteErrorBoundary /> },
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorBoundary /> },
  { path: '/register', element: <RegisterPage />, errorElement: <RouteErrorBoundary /> },
  { path: '/organizations', element: <OrganizationSelectorPage />, errorElement: <RouteErrorBoundary /> },

  // Protected app routes (all under AppLayout)
  {
    path: '/app',
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'classes/create', element: <CreateClassPage /> },
      { path: 'classes/join', element: <JoinClassPage /> },
      { path: 'resources', element: <ResourcesPage /> },
      { path: 'ai-tutor', element: <AiTutorPage /> },
      { path: 'assessments', element: <AssessmentsPage /> },
      { path: 'assessments/:assessmentId/edit', element: <AssessmentEditPage /> },
      { path: 'assessments/:assessmentId/take/:assignmentId', element: <QuizTakingPage /> },
      { path: 'assessments/:assignmentId/attempts/:attemptId/results', element: <QuizResultsPage /> },
      { path: 'flashcards', element: <FlashcardsPage /> },
      { path: 'flashcards/:deckId/study', element: <FlashcardStudyPage /> },
      { path: 'discussions', element: <DiscussionsPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'students', element: <StudentsPage /> },
    ],
  },

  // Catch-all → landing
  { path: '*', element: <Navigate to="/" replace /> },
]);

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
};
