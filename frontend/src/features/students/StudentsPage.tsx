import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { classService } from '../../services/class.service';
import { orgService } from '../../services/org.service';
import { Enrollment, User } from '../../types';
import { Card, Badge } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import {
  Users,
  UserPlus,
  UserMinus,
  Search,
  Copy,
  Check,
  Mail,
  Calendar,
  RefreshCw,
  BookOpen,
  Loader2,
  Sparkles,
} from 'lucide-react';

export const StudentsPage: React.FC = () => {
  const { selectedOrg, selectedClass, isTeacher, loadClasses } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Enroll modal states
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [enrollingUserId, setEnrollingUserId] = useState<string | null>(null);

  // Remove modal states
  const [studentToRemove, setStudentToRemove] = useState<User | null>(null);
  const [removing, setRemoving] = useState(false);

  const loadEnrollments = async () => {
    if (!selectedOrg?.id || !selectedClass?.id) return;
    setLoading(true);
    try {
      const data = await classService.getEnrollments(selectedOrg.id, selectedClass.id);
      setEnrollments(data);
    } catch (err) {
      console.error('Failed to load enrollments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnrollments();
  }, [selectedOrg?.id, selectedClass?.id]);

  const handleOpenEnrollModal = async () => {
    if (!selectedOrg?.id) return;
    setEnrollModalOpen(true);
    setLoadingMembers(true);
    try {
      const members = await orgService.getMembers(selectedOrg.id);
      setOrgMembers(members);
    } catch (err) {
      console.error('Failed to load organization members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleEnrollStudent = async (user: User) => {
    if (!selectedOrg?.id || !selectedClass?.id) return;
    setEnrollingUserId(user.id);
    try {
      await classService.enrollStudent(selectedOrg.id, selectedClass.id, user.id);
      await loadEnrollments();
      await loadClasses(selectedOrg.id);
    } catch (err) {
      console.error('Failed to enroll student:', err);
    } finally {
      setEnrollingUserId(null);
    }
  };

  const handleRemoveStudent = async () => {
    if (!selectedOrg?.id || !selectedClass?.id || !studentToRemove) return;
    setRemoving(true);
    try {
      await classService.removeStudent(selectedOrg.id, selectedClass.id, studentToRemove.id);
      setEnrollments((prev) => prev.filter((e) => e.user.id !== studentToRemove.id));
      await loadClasses(selectedOrg.id);
      setStudentToRemove(null);
    } catch (err) {
      console.error('Failed to remove student:', err);
    } finally {
      setRemoving(false);
    }
  };

  const handleCopyCode = () => {
    if (!selectedClass?.code) return;
    navigator.clipboard.writeText(selectedClass.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filter already enrolled members and teachers/creator out of the add list
  const creatorId = (selectedClass as any)?.createdById || (selectedClass as any)?.createdBy?.id;
  const enrolledUserIds = new Set(enrollments.map((e) => e.user?.id));
  const availableOrgStudents = orgMembers
    .filter((m) => {
      const u = m.user || m;
      if (m.role === 'TEACHER') return false;
      if (creatorId && u.id === creatorId) return false;
      return !enrolledUserIds.has(u.id);
    })
    .filter((m) => {
      const u = m.user || m;
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const q = memberSearch.toLowerCase();
      return fullName.includes(q) || email.includes(q);
    });

  // Filter roster by search (and ensure creator is never displayed in student roster)
  const filteredEnrollments = enrollments
    .filter((e) => (creatorId ? e.user?.id !== creatorId : true))
    .filter((e) => {
      const fullName = `${e.user?.firstName || ''} ${e.user?.lastName || ''}`.toLowerCase();
      const email = (e.user?.email || '').toLowerCase();
      const q = search.toLowerCase();
      return fullName.includes(q) || email.includes(q);
    });

  if (!selectedClass) {
    return (
      <div className="text-center py-16 bg-white/60 border border-[#EAE2D5] rounded-2xl">
        <BookOpen className="w-12 h-12 mx-auto mb-3 text-stone-300" />
        <h3 className="text-lg font-bold text-stone-800">No active classroom selected</h3>
        <p className="text-stone-500 text-sm mt-1">
          Select or create a classroom to manage its students.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#EA580C]" />
            Students & Roster
          </h1>
          <p className="text-stone-500 text-sm mt-0.5">
            Manage enrolled learners in{' '}
            <span className="font-semibold text-stone-800">{selectedClass.name}</span>
          </p>
        </div>

        {isTeacher && (
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={loadEnrollments} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={handleOpenEnrollModal}>
              <UserPlus className="w-3.5 h-3.5" />
              Enroll student
            </Button>
          </div>
        )}
      </div>

      {/* Class Invite Code Banner */}
      <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/50 border border-[#EA580C]/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#EA580C]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#EA580C]">
              Class Invite Code
            </span>
          </div>
          <p className="text-xs text-stone-600">
            Share this 6-character code with your students so they can self-join this classroom.
          </p>
        </div>

        <div className="flex items-center gap-2.5 bg-white/90 px-3.5 py-1.5 rounded-xl border border-[#EA580C]/30 shadow-xs">
          <span className="font-mono text-base font-black text-[#EA580C] tracking-widest">
            {selectedClass.code || 'NO-CODE'}
          </span>
          {selectedClass.code && (
            <button
              onClick={handleCopyCode}
              className="text-stone-400 hover:text-[#EA580C] p-1 rounded transition"
              title="Copy class invite code"
            >
              {copiedCode ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Roster Card */}
      <Card className="p-6">
        {/* Search & Stats Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search by student name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
            <span>Total enrolled:</span>
            <Badge variant="ready" className="text-xs font-bold">
              {enrollments.length} {enrollments.length === 1 ? 'student' : 'students'}
            </Badge>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="space-y-3 py-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-stone-100/70 rounded-xl animate-pulse border border-stone-200/50"
              />
            ))}
          </div>
        ) : filteredEnrollments.length === 0 ? (
          <div className="text-center py-14 border border-dashed border-[#EAE2D5] rounded-2xl bg-[#FAF6F0]/50">
            <Users className="w-10 h-10 mx-auto mb-2 text-stone-300" />
            <h4 className="text-sm font-bold text-stone-800">
              {search ? 'No students match your search' : 'No students enrolled yet'}
            </h4>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {search
                ? 'Try adjusting your search terms.'
                : 'Share the invite code above or click "Enroll student" to add members from your organization.'}
            </p>
            {!search && isTeacher && (
              <Button size="sm" onClick={handleOpenEnrollModal} className="mt-4">
                <UserPlus className="w-3.5 h-3.5" />
                Enroll student from organization
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#EAE2D5] text-stone-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Student</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Enrolled Date</th>
                  <th className="pb-3">Status</th>
                  {isTeacher && <th className="pb-3 pr-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE2D5]/60">
                {filteredEnrollments.map((e) => {
                  const student = e.user;
                  const fullName = `${student.firstName} ${student.lastName}`;
                  const initials = `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase();
                  const enrolledDate = e.enrolledAt || (e as any).joinedAt || (e as any).createdAt;
                  const formattedDate = enrolledDate
                    ? new Date(enrolledDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Recently';

                  return (
                    <tr
                      key={e.id || student.id}
                      className="hover:bg-[#FAF6F0]/60 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 pl-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#EA580C] to-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {initials || 'S'}
                          </div>
                          <div>
                            <span className="font-semibold text-stone-900 block leading-tight">
                              {fullName}
                            </span>
                            <span className="text-[11px] text-stone-400 sm:hidden block mt-0.5">
                              {student.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 text-stone-600 text-xs">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-stone-400" />
                          {student.email}
                        </span>
                      </td>

                      {/* Enrolled Date */}
                      <td className="py-3.5 text-stone-500 text-xs">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          {formattedDate}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5">
                        <Badge variant="ready" className="text-[10px]">
                          Enrolled
                        </Badge>
                      </td>

                      {/* Actions */}
                      {isTeacher && (
                        <td className="py-3.5 pr-2 text-right">
                          <button
                            type="button"
                            onClick={() => setStudentToRemove(student)}
                            className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-rose-600 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition font-medium"
                            title="Remove from class"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Enroll Student from Organization Modal */}
      <Modal
        isOpen={enrollModalOpen}
        onClose={() => {
          setEnrollModalOpen(false);
          setMemberSearch('');
        }}
        title="Enroll Student from Organization"
      >
        <div className="space-y-4">
          <p className="text-xs text-stone-500">
            Select a student belonging to <strong>{selectedOrg?.name}</strong> to directly add them
            to <strong>{selectedClass.name}</strong>.
          </p>

          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Filter members by name or email..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {loadingMembers ? (
              <div className="py-8 text-center text-stone-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#EA580C]" />
                Loading organization members...
              </div>
            ) : availableOrgStudents.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-xs">
                {memberSearch
                  ? 'No members match your search.'
                  : 'All students in this organization are already enrolled!'}
              </div>
            ) : (
              availableOrgStudents.map((m) => {
                const u: User = m.user || m;
                const fullName = `${u.firstName} ${u.lastName}`;
                const initials = `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase();
                const isAdding = enrollingUserId === u.id;

                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#EAE2D5] bg-[#FAF6F0]/60 hover:bg-white hover:border-[#EA580C]/40 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {initials || 'U'}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-stone-900 leading-tight">
                          {fullName}
                        </p>
                        <p className="text-[11px] text-stone-400">{u.email}</p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleEnrollStudent(u)}
                      disabled={isAdding}
                    >
                      {isAdding ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                      Add
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-[#EAE2D5]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEnrollModalOpen(false);
                setMemberSearch('');
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove Student Confirmation Modal */}
      <Modal
        isOpen={!!studentToRemove}
        onClose={() => setStudentToRemove(null)}
        title="Remove Student from Class"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Are you sure you want to remove{' '}
            <strong className="text-stone-900">
              {studentToRemove?.firstName} {studentToRemove?.lastName}
            </strong>{' '}
            from <strong>{selectedClass.name}</strong>?
          </p>

          <div className="text-xs text-stone-600 bg-amber-50 border border-amber-200/80 rounded-xl p-3">
            The student will immediately lose access to this classroom&apos;s materials, quizzes, and
            discussions. You can re-enroll them at any time.
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStudentToRemove(null)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleRemoveStudent}
              isLoading={removing}
            >
              Remove student
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
