import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, BrainCircuit, BarChart3 } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAF6F0] text-stone-900 flex flex-col relative overflow-hidden">
      {/* Background Solar Orbs & Glow */}
      <div className="absolute top-1/4 -right-24 w-96 h-96 rounded-full solar-orb opacity-35" />
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full solar-orb opacity-20" />

      {/* Navigation Header */}
      <header className="h-20 px-8 lg:px-16 flex items-center justify-between border-b border-[#EAE2D5]/70 bg-white/50 backdrop-blur-md sticky top-0 z-40">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-stone-900 font-bold text-xl tracking-tight"
        >
          <span className="text-[#EA580C] text-2xl font-black">✦</span>
          <span>EdQuest AI</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 lg:px-12 py-16 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/70 border border-orange-200/80 text-[#EA580C] text-xs font-bold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Brighter Learning Future</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-stone-900 leading-[1.08]">
              Study smarter. <br />
              <span className="text-[#EA580C]">Go further.</span>
            </h1>

            <p className="text-lg text-stone-600 max-w-xl leading-relaxed">
              AI-powered study plans, instant multi-tenant classrooms, RAG document tutoring, and
              automated quiz generation designed for teachers and high-achieving students.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link to="/register">
                <Button size="lg" className="group">
                  <span>Get started free</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="secondary">
                  <span>Sign into workspace</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Hero Graphic with Solar Orb */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* The Signature Figma Solar Glass Card with Orange Sphere */}
            <div className="relative w-full max-w-md">
              {/* Back glowing sphere */}
              <div className="absolute -top-10 -right-6 w-48 h-48 rounded-full bg-[#EA580C] shadow-2xl solar-orb-solid" />

              {/* Glass container */}
              <div className="relative z-10 bg-white/85 backdrop-blur-xl border border-[#EAE2D5] rounded-3xl p-8 shadow-xl">
                <h3 className="text-2xl font-bold text-stone-900 leading-snug mb-6">
                  Turn curiosity <br />
                  <span className="text-[#EA580C]">into progress.</span>
                </h3>

                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#EA580C]" />
                    <span className="text-stone-700 font-semibold text-sm">
                      AI Tutor 24/7 grounded in your course documents
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#EA580C]" />
                    <span className="text-stone-700 font-semibold text-sm">
                      Instant practice & automated quiz generation
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#EA580C]" />
                    <span className="text-stone-700 font-semibold text-sm">
                      Deep learning analytics & remedial insights
                    </span>
                  </li>
                </ul>

                <div className="mt-8 pt-6 border-t border-stone-200/70 flex items-center justify-between text-xs text-stone-500 font-medium">
                  <span>✦ Multi-tenant isolated</span>
                  <span>✦ Spaced repetition active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Feature Cards */}
        <div className="mt-24 pt-12 border-t border-[#EAE2D5]/70">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-6 text-center">
            Built for modern schools, universities & tutoring networks
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/70 backdrop-blur-md border border-[#EAE2D5]/70 rounded-2xl p-6 shadow-xs hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-orange-100/60 text-[#EA580C] flex items-center justify-center mb-4">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-stone-900 mb-1.5">
                Personalized learning paths
              </h4>
              <p className="text-sm text-stone-600">
                Adaptive AI assessments and spaced-repetition flashcards calibrated to each
                student's mastery.
              </p>
            </div>

            <div className="bg-white/70 backdrop-blur-md border border-[#EAE2D5]/70 rounded-2xl p-6 shadow-xs hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-orange-100/60 text-[#EA580C] flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-stone-900 mb-1.5">AI feedback in seconds</h4>
              <p className="text-sm text-stone-600">
                Generate rich, differentiated quizzes directly from lecture slides and textbook PDFs
                with 1 click.
              </p>
            </div>

            <div className="bg-white/70 backdrop-blur-md border border-[#EAE2D5]/70 rounded-2xl p-6 shadow-xs hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-orange-100/60 text-[#EA580C] flex items-center justify-center mb-4">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-stone-900 mb-1.5">Progress you can see</h4>
              <p className="text-sm text-stone-600">
                Item Difficulty Index, topic mastery heatmaps, and AI teaching insights highlighting
                at-risk concepts.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
