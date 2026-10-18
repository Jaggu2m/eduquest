import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { resourceService } from '../../services/resource.service';
import { DocumentResource } from '../../types';
import { Card, Badge } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Upload, FileText, Trash2, RefreshCw, Loader2, BookOpen } from 'lucide-react';

const statusVariant = (
  status: DocumentResource['status'],
): 'ready' | 'processing' | 'scheduled' | 'published' | 'neutral' => {
  const map: Record<string, any> = {
    READY: 'ready',
    COMPLETED: 'ready',
    PROCESSING: 'processing',
    PENDING: 'scheduled',
    FAILED: 'neutral',
  };
  return map[status] || 'neutral';
};

const statusLabel = (status: DocumentResource['status']): string => {
  const map: Record<string, string> = {
    READY: 'Ready',
    COMPLETED: 'Ready',
    PROCESSING: 'Processing',
    PENDING: 'Scheduled',
    FAILED: 'Failed',
  };
  return map[status] || status;
};

export const ResourcesPage: React.FC = () => {
  const { selectedOrg, selectedClass, isTeacher } = useAuth();
  const [documents, setDocuments] = useState<DocumentResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = async () => {
    if (!selectedOrg?.id || !selectedClass?.id) return;
    setLoading(true);
    try {
      const docs = await resourceService.getDocuments(selectedOrg.id, selectedClass.id);
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, [selectedOrg?.id, selectedClass?.id]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !selectedOrg?.id || !selectedClass?.id || !isTeacher) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const title = file.name.replace(/\.[^.]+$/, '');
      try {
        const uploaded = await resourceService.uploadDocument(
          selectedOrg.id,
          selectedClass.id,
          file,
          title,
        );
        setDocuments((prev) => [uploaded, ...prev]);
      } catch (err) {
        console.error(`Failed to upload ${file.name}`, err);
      }
    }
    setUploading(false);
    setTimeout(loadDocs, 2000); // Refresh after 2s to catch processing status
  };

  const handleDelete = async (docId: string) => {
    if (!selectedOrg?.id || !selectedClass?.id) return;
    try {
      await resourceService.deleteDocument(selectedOrg.id, selectedClass.id, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error(err);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Resources</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {selectedClass?.name} · {selectedOrg?.name}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={loadDocs}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          {isTeacher && (
            <Button size="sm" onClick={() => fileInputRef.current?.click()} isLoading={uploading}>
              <Upload className="w-3.5 h-3.5" />
              Upload PDF
            </Button>
          )}
        </div>
      </div>

      {isTeacher && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Upload Drop Zone (Figma D11) */}
          <Card
            className={`lg:col-span-2 p-6 border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer min-h-[200px] transition-all duration-200 ${
              dragOver
                ? 'border-[#EA580C] bg-orange-50/50'
                : 'border-[#DDD6CE] hover:border-[#EA580C]/50'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleUpload(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            {uploading ? (
              <Loader2 className="w-8 h-8 text-[#EA580C] animate-spin mb-3" />
            ) : (
              <Upload className="w-8 h-8 text-[#EA580C] mb-3" />
            )}
            <p className="text-sm font-bold text-stone-700 mb-1">Drop resources here</p>
            <p className="text-xs text-stone-500">Drag & drop PDFs, slides, or worksheets</p>
            <p className="text-xs text-stone-400 mt-2">
              Files are processed into the AI Tutor knowledge base.
            </p>
            <Button
              size="sm"
              className="mt-4"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Browse files
            </Button>
          </Card>

          {/* Resource Library */}
          <Card className="lg:col-span-3 p-6">
            <h3 className="text-base font-bold text-stone-900 mb-4">Resource library</h3>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-11 bg-stone-100/60 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-10 text-stone-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No documents yet. Upload your first resource!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-4 py-3 bg-[#FAF6F0] rounded-xl border border-[#EAE2D5] hover:border-[#EA580C]/30 transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-stone-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-800 truncate">{doc.title}</p>
                        <p className="text-xs text-stone-400">{formatBytes(doc.sizeBytes)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={statusVariant(doc.status)}>{statusLabel(doc.status)}</Badge>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-stone-300 hover:text-rose-500 transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Student view – D12 */}
      {!isTeacher && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-base font-bold text-stone-900 mb-4">This week's resources</h3>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-stone-100/60 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : documents.filter((d) => d.status === 'READY' || d.status === 'COMPLETED').length ===
              0 ? (
              <div className="text-center py-10 text-stone-400">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No resources available yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents
                  .filter((d) => d.status === 'READY' || d.status === 'COMPLETED')
                  .slice(0, 3)
                  .map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-[#FAF6F0] border border-[#EAE2D5] rounded-xl p-4"
                    >
                      <FileText className="w-5 h-5 text-[#EA580C] mb-2" />
                      <p className="text-sm font-semibold text-stone-800">{doc.title}</p>
                      <p className="text-xs text-stone-400 mt-1">{formatBytes(doc.sizeBytes)}</p>
                    </div>
                  ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-base font-bold text-stone-900 mb-4">All course material</h3>
            {documents.length === 0 ? (
              <p className="text-sm text-stone-400">No materials uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-4 py-3 border-b border-[#EAE2D5]/50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-stone-400" />
                      <span className="text-sm text-stone-700">{doc.title}</span>
                    </div>
                    <Badge variant={statusVariant(doc.status)}>{statusLabel(doc.status)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
