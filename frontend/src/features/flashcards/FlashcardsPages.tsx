import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { flashcardService, GenerateFlashcardDeckPayload } from '../../services/flashcard.service';
import { resourceService } from '../../services/resource.service';
import { FlashcardDeck, Flashcard, DocumentResource } from '../../types';
import { Card, Badge } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Layers, Sparkles, RefreshCw, Brain, RotateCcw, Loader2 } from 'lucide-react';

// ── Flashcard Decks Grid (Figma D19) ─────────────────────────────────────────
export const FlashcardsPage: React.FC = () => {
  const { selectedOrg, selectedClass } = useAuth();
  const navigate = useNavigate();
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateOpen, setGenerateOpen] = useState(false);

  const loadDecks = async () => {
    if (!selectedOrg?.id || !selectedClass?.id) return;
    setLoading(true);
    try {
      const d = await flashcardService.listDecks(selectedOrg.id, selectedClass.id);
      setDecks(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDecks();
  }, [selectedOrg?.id, selectedClass?.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Flashcard Decks</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {selectedClass?.name} · Spaced repetition study
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={loadDecks}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" onClick={() => setGenerateOpen(true)}>
            <Sparkles className="w-3.5 h-3.5" />
            Generate deck
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-40 bg-white/60 rounded-2xl border border-[#EAE2D5] animate-pulse"
            />
          ))}
        </div>
      ) : decks.length === 0 ? (
        <Card className="p-12 text-center">
          <Layers className="w-10 h-10 mx-auto mb-3 text-stone-300" />
          <p className="text-stone-600 font-medium">No flashcard decks yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Generate a deck from your class documents using AI.
          </p>
          <Button className="mt-5" onClick={() => setGenerateOpen(true)}>
            <Sparkles className="w-4 h-4" />
            Generate first deck
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onStudy={() => navigate(`/app/flashcards/${deck.id}/study`)}
            />
          ))}
        </div>
      )}

      <GenerateDeckModal
        isOpen={generateOpen}
        onClose={() => setGenerateOpen(false)}
        orgId={selectedOrg?.id || ''}
        classId={selectedClass?.id || ''}
        onGenerated={(deck) => {
          setDecks((prev) => [deck, ...prev]);
          setGenerateOpen(false);
          navigate(`/app/flashcards/${deck.id}/study`);
        }}
      />
    </div>
  );
};

const DeckCard: React.FC<{ deck: FlashcardDeck; onStudy: () => void }> = ({ deck, onStudy }) => {
  const mastery = deck.masteryPercentage || 0;
  return (
    <Card className="p-6 cursor-pointer hover:shadow-md transition group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center">
          <Layers className="w-5 h-5" />
        </div>
        <Badge variant={mastery >= 70 ? 'ready' : mastery >= 40 ? 'scheduled' : 'neutral'}>
          {mastery}% mastered
        </Badge>
      </div>
      <h3 className="font-bold text-stone-900 mb-1 group-hover:text-[#EA580C] transition">
        {deck.title}
      </h3>
      {deck.topic && <p className="text-xs text-stone-500 mb-3">{deck.topic}</p>}
      <p className="text-sm text-stone-600 mb-4">{deck.cardsCount} cards</p>
      <div className="h-1.5 bg-[#EAE2D5] rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-[#EA580C] rounded-full transition-all"
          style={{ width: `${mastery}%` }}
        />
      </div>
      <Button size="sm" className="w-full" onClick={onStudy}>
        <Brain className="w-3.5 h-3.5" />
        Study now
      </Button>
    </Card>
  );
};

const GenerateDeckModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  classId: string;
  onGenerated: (d: FlashcardDeck) => void;
}> = ({ isOpen, onClose, orgId, classId, onGenerated }) => {
  const [documents, setDocuments] = useState<DocumentResource[]>([]);
  const [form, setForm] = useState<GenerateFlashcardDeckPayload>({
    documentId: '',
    numCards: 10,
    difficulty: 'MEDIUM',
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    resourceService
      .getDocuments(orgId, classId)
      .then((docs) =>
        setDocuments(docs.filter((d) => d.status === 'READY' || d.status === 'COMPLETED')),
      );
  }, [isOpen]);

  const handleGenerate = async () => {
    if (!form.documentId) {
      setError('Please select a document.');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const deck = await flashcardService.generateDeck(orgId, classId, form);
      onGenerated(deck);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate flashcard deck"
      description="AI will create spaced-repetition cards from your document."
    >
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
          {error}
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5 block">
            Source document
          </label>
          <select
            value={form.documentId}
            onChange={(e) => setForm((f) => ({ ...f, documentId: e.target.value }))}
            className="w-full bg-[#F4EFEA]/80 border border-[#E2D8CC] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20"
          >
            <option value="">Select a document</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Topic focus (optional)"
          placeholder="e.g. Cell Division, Photosynthesis"
          value={form.topic || ''}
          onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5 block">
              Number of cards
            </label>
            <input
              type="number"
              min={3}
              max={50}
              value={form.numCards}
              onChange={(e) => setForm((f) => ({ ...f, numCards: +e.target.value }))}
              className="w-full bg-[#F4EFEA]/80 border border-[#E2D8CC] rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5 block">
              Difficulty
            </label>
            <select
              value={form.difficulty}
              onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as any }))}
              className="w-full bg-[#F4EFEA]/80 border border-[#E2D8CC] rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
        </div>
        <Button className="w-full" onClick={handleGenerate} isLoading={generating}>
          <Sparkles className="w-4 h-4" />
          Generate deck
        </Button>
      </div>
    </Modal>
  );
};

// ── Flashcard Study Mode (Figma D20) ─────────────────────────────────────────
export const FlashcardStudyPage: React.FC = () => {
  const { selectedOrg, selectedClass } = useAuth();
  const navigate = useNavigate();
  const deckId = window.location.pathname.split('/').slice(-2, -1)[0];

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  const masteryLabels = [
    { label: 'Again', color: 'bg-rose-500 hover:bg-rose-600', level: 0 },
    { label: 'Hard', color: 'bg-amber-500 hover:bg-amber-600', level: 1 },
    { label: 'Familiar', color: 'bg-sky-500 hover:bg-sky-600', level: 2 },
    { label: 'Mastered', color: 'bg-emerald-500 hover:bg-emerald-600', level: 3 },
  ];

  useEffect(() => {
    if (!selectedOrg?.id || !selectedClass?.id) return;
    flashcardService.getDueCards(selectedOrg.id, selectedClass.id, deckId).then((c) => {
      setCards(c);
      setLoading(false);
    });
  }, [selectedOrg?.id, selectedClass?.id]);

  const handleRate = async (level: number) => {
    if (!selectedOrg?.id || !selectedClass?.id) return;
    const card = cards[currentIdx];
    await flashcardService.reviewCard(selectedOrg.id, selectedClass.id, deckId, card.id, level);
    if (currentIdx + 1 >= cards.length) {
      setDone(true);
    } else {
      setCurrentIdx((i) => i + 1);
      setFlipped(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#EA580C]" />
      </div>
    );
  }

  if (done || cards.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <Brain className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900">Session complete! 🎉</h2>
        <p className="text-stone-500 text-sm">
          {done ? 'All due cards reviewed.' : 'No cards due for review right now.'}
        </p>
        <Button onClick={() => navigate('/app/flashcards')}>Back to decks</Button>
      </div>
    );
  }

  const card = cards[currentIdx];
  const progress = (currentIdx / cards.length) * 100;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-500 font-medium">
          {currentIdx + 1} / {cards.length} cards
        </span>
        <span className="text-[#EA580C] font-bold">{Math.round(progress)}% done</span>
      </div>
      <div className="h-1.5 bg-[#EAE2D5] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#EA580C] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Flip Card */}
      <div
        className="relative h-72 cursor-pointer"
        style={{ perspective: '1200px' }}
        onClick={() => setFlipped(!flipped)}
      >
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 bg-white border border-[#EAE2D5] rounded-3xl shadow-md flex flex-col items-center justify-center p-8 text-center backface-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-[#EA580C] mb-3">
              Question
            </p>
            <p className="text-xl font-bold text-stone-900">{card.front}</p>
            <p className="text-xs text-stone-400 mt-6 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              Tap to reveal answer
            </p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 bg-[#FAF6F0] border border-[#EAE2D5] rounded-3xl shadow-md flex flex-col items-center justify-center p-8 text-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-3">
              Answer
            </p>
            <p className="text-xl font-bold text-stone-900">{card.back}</p>
            {card.hint && <p className="text-xs text-stone-400 mt-3 italic">{card.hint}</p>}
          </div>
        </div>
      </div>

      {/* Rating Buttons */}
      {flipped && (
        <div className="space-y-2">
          <p className="text-center text-xs font-semibold text-stone-500 uppercase tracking-wider">
            How well did you know it?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {masteryLabels.map((m) => (
              <button
                key={m.label}
                onClick={() => handleRate(m.level)}
                className={`py-2.5 rounded-xl text-white text-xs font-bold transition-all duration-150 active:scale-95 ${m.color}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!flipped && (
        <p className="text-center text-xs text-stone-400">
          Tap the card to see the answer, then rate how well you knew it.
        </p>
      )}
    </div>
  );
};
