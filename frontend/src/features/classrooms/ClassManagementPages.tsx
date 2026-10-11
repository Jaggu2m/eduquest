import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { classService } from '../../services/class.service';
import { Classroom } from '../../types';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { BookOpen, Hash, FileText, CheckCircle, Copy } from 'lucide-react';

export const CreateClassPage: React.FC = () => {
  const { selectedOrg, loadClasses, setSelectedClass } = useAuth();
  const [form, setForm] = useState({ name: '', description: '', code: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Classroom | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg?.id) return;
    setError('');
    setLoading(true);
    try {
      const cls = await classService.createClass(selectedOrg.id, {
        name: form.name,
        description: form.description,
        code: form.code ? form.code.trim() : undefined,
      });
      setCreated(cls);
      setSelectedClass(cls);
      await loadClasses(selectedOrg.id);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg || 'Failed to create class.');
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900">Class created!</h2>
          <p className="text-stone-500 text-sm mt-1">Share the invite code with your students.</p>
        </div>

        <Card className="p-6">
          <h3 className="text-base font-bold text-stone-900 mb-1">{created.name}</h3>
          <p className="text-xs text-stone-500 mb-5">{created.description}</p>

          {/* Invite Code Preview */}
          <div className="bg-[#FAF6F0] border border-[#EAE2D5] rounded-2xl p-5">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Invite code
            </p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-extrabold tracking-widest text-[#EA580C]">
                {created.code}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(created.code)}
                className="text-stone-400 hover:text-[#EA580C] transition"
                title="Copy invite code"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-stone-400 mt-2">Generated after class creation</p>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setCreated(null);
                setForm({ name: '', description: '', code: '' });
              }}
            >
              Create another
            </Button>
            <Button className="flex-1" onClick={() => navigate('/app/dashboard')}>
              Go to dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
          Create a new class
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Set a name and term. EdQuest creates an invite code automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Form */}
        <Card className="md:col-span-3 p-6">
          <h3 className="text-base font-bold text-stone-900 mb-5">Class details</h3>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Class name"
              placeholder="Biology 101"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="Description (optional)"
              placeholder="Cell Biology • Ms. Carter • 28 learners"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <Input
              label="Invite code (optional)"
              placeholder="e.g. BIO-101 (leave blank to auto-generate)"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            />

            <Button type="submit" className="w-full" isLoading={loading}>
              <BookOpen className="w-4 h-4" />
              Create class
            </Button>
          </form>
        </Card>

        {/* Invite code preview box */}
        <div className="md:col-span-2">
          <Card variant="flat" className="p-5 h-full">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
              Invite code preview
            </p>
            <p className="text-2xl font-extrabold tracking-widest text-[#EA580C]">BQ7-9LX</p>
            <p className="text-xs text-stone-400 mt-2">Generated after class creation</p>

            <div className="mt-8 pt-5 border-t border-[#EAE2D5]">
              <p className="text-xs text-stone-500 font-semibold mb-2">What happens next?</p>
              <ul className="text-xs text-stone-500 space-y-1.5">
                <li className="flex items-start gap-1.5">
                  <Hash className="w-3 h-3 mt-0.5 text-[#EA580C] shrink-0" />
                  <span>A unique 6-character invite code is generated</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <FileText className="w-3 h-3 mt-0.5 text-[#EA580C] shrink-0" />
                  <span>Students use the code to join the class</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-3 h-3 mt-0.5 text-[#EA580C] shrink-0" />
                  <span>Upload resources to enable the AI Tutor</span>
                </li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const JoinClassPage: React.FC = () => {
  const { selectedOrg, loadClasses, setSelectedClass } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<Classroom | null>(null);
  const navigate = useNavigate();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg?.id) return;
    setError('');
    setLoading(true);
    try {
      const cls = await classService.joinClassByCode(selectedOrg.id, code.trim());
      await loadClasses(selectedOrg.id);
      setSelectedClass(cls);
      setSuccess(cls);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = axiosErr.response?.data?.message || axiosErr.message;
      setError(msg || 'Invalid invite code. Ask your teacher to resend it.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900">Joined {success.name}!</h2>
        <p className="text-stone-500 text-sm">You&apos;ve successfully enrolled in this class.</p>
        <Button onClick={() => navigate('/app/dashboard')} className="mt-2">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Join a class</h1>
        <p className="text-stone-500 text-sm mt-1">
          Ask your teacher for a six-character class code.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {error}
            </div>
          )}
          <form onSubmit={handleJoin} className="space-y-4">
            <Input
              label="Enter invite code"
              placeholder="e.g. BQ7-9LX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" isLoading={loading}>
              Join class
            </Button>
          </form>
        </Card>

        <Card variant="flat" className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
            Need help?
          </p>
          <p className="text-xs text-stone-500 leading-relaxed">
            Your teacher can resend the code from the class overview page. The code is
            case-insensitive.
          </p>
        </Card>
      </div>
    </div>
  );
};
