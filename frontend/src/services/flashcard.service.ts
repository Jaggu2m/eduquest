import api from './api';
import { FlashcardDeck, Flashcard } from '../types';

export interface GenerateFlashcardDeckPayload {
  documentId: string;
  title?: string;
  topic?: string;
  numCards?: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

export const flashcardService = {
  async listDecks(orgId: string, classId: string): Promise<FlashcardDeck[]> {
    const res = await api.get(`/organizations/${orgId}/classes/${classId}/flashcard-decks`);
    return res.data.data || res.data.decks || [];
  },

  async getDeck(orgId: string, classId: string, deckId: string): Promise<FlashcardDeck> {
    const res = await api.get(
      `/organizations/${orgId}/classes/${classId}/flashcard-decks/${deckId}`,
    );
    return res.data.data || res.data.deck || res.data;
  },

  async generateDeck(
    orgId: string,
    classId: string,
    payload: GenerateFlashcardDeckPayload,
  ): Promise<FlashcardDeck> {
    const res = await api.post(
      `/organizations/${orgId}/classes/${classId}/flashcard-decks/generate`,
      payload,
    );
    return res.data.data || res.data.deck || res.data;
  },

  async getDueCards(orgId: string, classId: string, deckId: string): Promise<Flashcard[]> {
    const res = await api.get(
      `/organizations/${orgId}/classes/${classId}/flashcard-decks/${deckId}/due`,
    );
    return res.data.data || res.data.dueCards || [];
  },

  async reviewCard(
    orgId: string,
    classId: string,
    deckId: string,
    cardId: string,
    masteryLevel: number,
  ): Promise<any> {
    const res = await api.post(
      `/organizations/${orgId}/classes/${classId}/flashcard-decks/${deckId}/cards/${cardId}/review`,
      { masteryLevel },
    );
    return res.data.data || res.data;
  },
};
