import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Organization } from '../../types';
import { Button } from '../../components/ui/Button';
import { Building2, Plus, ChevronRight, Loader2 } from 'lucide-react';
import { orgService } from '../../services/org.service';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

export const OrganizationSelectorPage: React.FC = () => {
  const { user, organizations, loadOrganizations, setSelectedOrg, isAdmin, isTeacher } = useAuth();
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', slug: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadOrganizations();
      setLoading(false);
    };
    load();
  }, []);

  const handleSelectOrg = (org: Organization) => {
    setSelectedOrg(org);
    navigate('/app/dashboard');
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await orgService.createOrganization(createForm);
      await loadOrganizations();
      setCreateOpen(false);
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to create organization.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col">
      {/* Top Nav */}
      <div className="h-18 px-8 flex items-center justify-between border-b border-[#EAE2D5]/70 bg-white/50 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2 text-stone-900 font-bold text-lg">
          <span className="text-[#EA580C] text-xl font-black">✦</span>
          <span>EdQuest AI</span>
        </Link>
        <div className="text-sm text-stone-500">
          Signed in as <span className="text-stone-800 font-semibold">{user?.email}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-stone-900">Choose your organization</h2>
          <p className="text-stone-500 mt-2 text-sm">
            Your role and access change by organization.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#EA580C] animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSelectOrg(org)}
                  className="group relative bg-white/85 border border-[#EAE2D5] rounded-2xl p-6 text-left hover:border-[#EA580C]/50 hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  {/* Org icon */}
                  <div className="w-12 h-12 rounded-xl bg-[#EA580C]/10 flex items-center justify-center mb-4">
                    {org.logoUrl ? (
                      <img
                        src={org.logoUrl}
                        className="w-8 h-8 object-contain rounded"
                        alt={org.name}
                      />
                    ) : (
                      <Building2 className="w-6 h-6 text-[#EA580C]" />
                    )}
                  </div>
                  <p className="font-bold text-stone-900 text-base mb-1">{org.name}</p>
                  <p className="text-xs text-stone-500 capitalize">{org.role || 'Member'}</p>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-xs font-bold bg-[#EA580C] text-white px-4 py-1.5 rounded-full group-hover:bg-[#C2410C] transition">
                      Open workspace
                    </span>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[#EA580C] transition" />
                  </div>
                </button>
              ))}

              {/* Create new org (teachers and admins) */}
              {(isAdmin || isTeacher) && (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="border-2 border-dashed border-stone-300 hover:border-[#EA580C]/60 rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-2 transition-all duration-200 group"
                >
                  <Plus className="w-6 h-6 text-stone-400 group-hover:text-[#EA580C] transition" />
                  <span className="text-sm font-semibold text-stone-500 group-hover:text-[#EA580C] transition">
                    + Create new organization
                  </span>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Org Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create organization"
        description="Create a new isolated learning workspace."
      >
        {createError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 text-xs">
            {createError}
          </div>
        )}
        <form onSubmit={handleCreateOrg} className="space-y-4">
          <Input
            label="Organization name"
            placeholder="e.g. Northstar Academy"
            value={createForm.name}
            onChange={(e) =>
              setCreateForm((f) => ({
                ...f,
                name: e.target.value,
                slug: e.target.value
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/[^a-z0-9-]/g, ''),
              }))
            }
            required
          />
          <Input
            label="Slug (URL identifier)"
            placeholder="northstar-academy"
            value={createForm.slug}
            onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))}
            required
          />
          <Input
            label="Description (optional)"
            placeholder="Brief description"
            value={createForm.description}
            onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" isLoading={creating}>
              Create workspace
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
