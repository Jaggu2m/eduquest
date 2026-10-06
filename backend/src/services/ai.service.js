import { Groq } from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

export class AIService {
  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn('[AIService]: Warning: GROQ_API_KEY is not defined in environment.');
    }
    this.groq = new Groq({ apiKey });
    this.defaultModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    this.fallbackModel = 'qwen/qwen3.8-27b';
  }

  /**
   * Generates a structured quiz from source text/chunks using Groq LLM.
   *
   * @param {object} params
   * @param {string} params.content - Source study text / document chunks
   * @param {number} [params.numQuestions=5] - Number of questions to generate
   * @param {string[]} [params.questionTypes=['MULTIPLE_CHOICE']] - Question types
   * @param {string} [params.difficulty='MEDIUM'] - EASY, MEDIUM, or HARD
   * @param {string} [params.customPrompt=''] - Optional teacher guidance/instructions
   * @returns {Promise<Array<object>>} Array of generated questions with options and explanations
   */
  async generateQuiz({
    content,
    numQuestions = 5,
    questionTypes = ['MULTIPLE_CHOICE'],
    difficulty = 'MEDIUM',
    customPrompt = '',
  }) {
    if (!content || content.trim().length === 0) {
      throw new Error('Content is required to generate quiz questions.');
    }

    const typesStr = questionTypes.join(', ');

    const systemPrompt = `You are an expert educational assessment creator.
Your task is to generate high-quality, pedagogically sound assessment questions grounded STRICTLY in the provided text.
Do not fabricate information not present or directly implied by the source material.

Rules:
1. Generate exactly ${numQuestions} questions.
2. Allowed question types: ${typesStr}.
3. Difficulty level: ${difficulty}.
4. For MULTIPLE_CHOICE: Provide exactly 4 options. Exactly 1 must have isCorrect: true, the other 3 must have isCorrect: false. Distractors must be plausible and educational.
5. For TRUE_FALSE: Provide exactly 2 options: "True" and "False". Exactly 1 must have isCorrect: true.
6. For SHORT_ANSWER: Provide an explanation of what key concepts the student's answer must include. Options array should be empty.
7. Include a clear, constructive explanation for every question explaining why the correct answer is right.
8. Assign a topic name to each question (e.g., "Foundations of AI", "Retrieval-Augmented Generation").

You MUST return a JSON object adhering to this schema:
{
  "questions": [
    {
      "prompt": "Question text here?",
      "questionType": "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER",
      "marks": 1.0,
      "topic": "Topic Name",
      "explanation": "Detailed explanation of why this answer is correct...",
      "options": [
        { "text": "Option A text", "isCorrect": true },
        { "text": "Option B text", "isCorrect": false },
        { "text": "Option C text", "isCorrect": false },
        { "text": "Option D text", "isCorrect": false }
      ]
    }
  ]
}`;

    const userPrompt = `SOURCE MATERIAL:
"""
${content}
"""

${customPrompt ? `ADDITIONAL TEACHER INSTRUCTIONS: ${customPrompt}\n` : ''}
Generate the JSON quiz now.`;

    let completion;
    try {
      completion = await this.groq.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });
    } catch (primaryErr) {
      console.warn(
        `[AIService]: Primary model (${this.defaultModel}) failed: ${primaryErr.message}. Trying fallback (${this.fallbackModel})...`,
      );
      completion = await this.groq.chat.completions.create({
        model: this.fallbackModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });
    }

    const rawOutput = completion.choices[0]?.message?.content;
    if (!rawOutput) {
      throw new Error('Groq returned empty response for quiz generation.');
    }

    let parsed;
    try {
      parsed = JSON.parse(rawOutput);
    } catch (parseErr) {
      throw new Error(`Failed to parse AI output as JSON: ${parseErr.message}`, {
        cause: parseErr,
      });
    }

    const questions = parsed.questions || parsed.data || (Array.isArray(parsed) ? parsed : null);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('AI output did not contain a valid array of questions.');
    }

    return questions.map((q, idx) => ({
      prompt: q.prompt,
      questionType: q.questionType || 'MULTIPLE_CHOICE',
      marks: Number(q.marks) || 1.0,
      topic: typeof q.topic === 'string' ? q.topic : q.topic?.name || 'General',
      explanation: q.explanation || null,
      order: idx,
      options: Array.isArray(q.options)
        ? q.options.map((opt, optIdx) => ({
            text: opt.text,
            isCorrect: Boolean(opt.isCorrect),
            order: optIdx,
          }))
        : [],
    }));
  }

  /**
   * Generates a grounded conversational answer using retrieved document chunks.
   *
   * @param {object} params
   * @param {string} params.question - Student or teacher's current query
   * @param {Array<object>} params.contextChunks - Retrieved chunks with { content, documentTitle, pageNumber, chunkIndex }
   * @param {Array<object>} [params.history=[]] - Recent message history [{ role: 'user' | 'assistant', content }]
   * @returns {Promise<string>} Grounded answer text
   */
  async answerQuestionWithContext({ question, contextChunks = [], history = [] }) {
    if (!question || question.trim().length === 0) {
      throw new Error('Question is required for RAG answering.');
    }

    // Format retrieved contexts with citation markers
    const formattedContext =
      contextChunks.length > 0
        ? contextChunks
            .map((chunk, idx) => {
              const docInfo = chunk.documentTitle
                ? `Document: "${chunk.documentTitle}"`
                : 'Source Document';
              const pageInfo = chunk.pageNumber ? `, Page ${chunk.pageNumber}` : '';
              const chunkInfo =
                chunk.chunkIndex !== undefined ? `, Chunk #${chunk.chunkIndex}` : '';
              return `[Source ${idx + 1} | ${docInfo}${pageInfo}${chunkInfo}]\n${chunk.content}`;
            })
            .join('\n\n---\n\n')
        : 'No specific reference documents found.';

    const systemPrompt = `You are EdQuest AI, a knowledgeable, encouraging, and academically rigorous teaching assistant.
Your goal is to answer student and teacher questions grounded directly in the provided reference course material.

GUIDELINES:
1. Ground your answer in the provided SOURCE MATERIAL.
2. If the answer is directly supported by the sources, state it clearly and provide citations like "[Source 1]" or mention the document title/page.
3. If the sources do not contain enough information to answer completely, acknowledge what is in the text, and politely state that the provided material does not cover the remaining details.
4. Keep explanations clear, well-structured, and pedagogical (use bullet points or markdown when helpful).
5. Never hallucinate facts or contradict the source material.`;

    const messages = [{ role: 'system', content: systemPrompt }];

    // Include recent history (up to last 6 messages)
    const recentHistory = history.slice(-6);
    for (const h of recentHistory) {
      messages.push({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content,
      });
    }

    // Current query with source material
    const userMessageContent = `SOURCE MATERIAL:
"""
${formattedContext}
"""

QUESTION:
${question}

Please answer the question based on the source material above.`;

    messages.push({
      role: 'user',
      content: userMessageContent,
    });

    let completion;
    try {
      completion = await this.groq.chat.completions.create({
        model: this.defaultModel,
        messages,
        temperature: 0.3,
      });
    } catch (primaryErr) {
      console.warn(
        `[AIService]: Primary model (${this.defaultModel}) failed in RAG: ${primaryErr.message}. Trying fallback (${this.fallbackModel})...`,
      );
      completion = await this.groq.chat.completions.create({
        model: this.fallbackModel,
        messages,
        temperature: 0.3,
      });
    }

    const answer = completion.choices[0]?.message?.content;
    if (!answer) {
      throw new Error('Groq returned empty response for RAG query.');
    }

    return answer;
  }

  /**
   * Generates flashcards from source content (text chunks or full text).
   *
   * @param {object} params
   * @param {string} params.content - Document text or retrieved chunks to generate cards from
   * @param {number} [params.numCards=10] - Number of flashcards to generate
   * @param {string} [params.topic=''] - Optional topic focus
   * @param {string} [params.difficulty='MEDIUM'] - EASY, MEDIUM, or HARD
   * @returns {Promise<Array<{front: string, back: string, hint: string|null}>>}
   */
  async generateFlashcards({ content, numCards = 10, topic = '', difficulty = 'MEDIUM' }) {
    if (!content || content.trim().length === 0) {
      throw new Error('Content is required to generate flashcards.');
    }

    const focusNote = topic ? `Focus specifically on the topic: "${topic}".` : '';
    const difficultyNote =
      difficulty === 'EASY'
        ? 'Keep concepts simple and definitions clear.'
        : difficulty === 'HARD'
          ? 'Include nuanced concepts, comparisons, and application-based questions.'
          : 'Balance basic definitions with conceptual understanding.';

    const systemPrompt = `You are an expert educational content creator specializing in active recall flashcards.
Your task is to generate exactly ${numCards} high-quality flashcards from the provided study material.
${focusNote}
${difficultyNote}

Rules:
1. Each flashcard must have a "front" (concept, term, or question) and a "back" (concise explanation or answer).
2. Optionally include a "hint" — a short nudge that helps recall without giving away the answer.
3. Fronts should be specific, testable questions or terms — NOT vague.
4. Backs should be concise but complete (1–4 sentences max).
5. Hints should be brief (half-sentence max) and only included when useful.
6. Cover a variety of concepts from the material — don't repeat similar cards.
7. Respond ONLY with a valid JSON array. No markdown, no explanation, no extra text.

Format:
[
  { "front": "...", "back": "...", "hint": "..." },
  { "front": "...", "back": "...", "hint": null }
]`;

    const userMessage = `STUDY MATERIAL:
"""
${content}
"""

Generate ${numCards} flashcards from this material.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    let raw;
    try {
      const completion = await this.groq.chat.completions.create({
        model: this.defaultModel,
        messages,
        temperature: 0.5,
        response_format: { type: 'json_object' },
      });
      raw = completion.choices[0]?.message?.content;
    } catch (primaryErr) {
      console.warn(
        `[AIService]: Primary model failed for flashcard generation: ${primaryErr.message}. Trying fallback...`,
      );
      const completion = await this.groq.chat.completions.create({
        model: this.fallbackModel,
        messages,
        temperature: 0.5,
      });
      raw = completion.choices[0]?.message?.content;
    }

    if (!raw) throw new Error('Groq returned empty response for flashcard generation.');

    // Parse: handle both array response and { cards: [...] } / { flashcards: [...] }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Failed to parse flashcard JSON from LLM: ${raw.slice(0, 200)}`);
    }

    const cards = Array.isArray(parsed)
      ? parsed
      : parsed.cards ?? parsed.flashcards ?? parsed.data ?? [];

    if (!Array.isArray(cards) || cards.length === 0) {
      throw new Error('LLM returned no flashcards in expected format.');
    }

    return cards.map((c) => ({
      front: String(c.front || '').trim(),
      back: String(c.back || '').trim(),
      hint: c.hint ? String(c.hint).trim() : null,
    }));
  }

  /**
   * Generates actionable teaching insights based on class performance analytics.
   *
   * @param {object} analyticsData - The aggregated analytics data (topic mastery, etc.)
   * @returns {Promise<string>} The generated markdown insights
   */
  async generateTeachingInsights(analyticsData) {
    const systemPrompt = `You are an expert AI teaching assistant analyzing class performance data.
Your goal is to provide actionable, encouraging, and pedagogically sound advice to the teacher based on the data.
Identify strong areas to celebrate and weak areas (at-risk topics) that need remediation.
Suggest specific teaching strategies or activities to address the weaknesses.
Keep it concise, well-structured, and use markdown formatting.`;

    const userPrompt = `Here is the recent class performance analytics data:
\`\`\`json
${JSON.stringify(analyticsData, null, 2)}
\`\`\`
Please generate a teaching insights report based on this data.`;

    let completion;
    try {
      completion = await this.groq.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
      });
    } catch (primaryErr) {
      console.warn(
        `[AIService]: Primary model failed for teaching insights: ${primaryErr.message}. Trying fallback...`,
      );
      completion = await this.groq.chat.completions.create({
        model: this.fallbackModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
      });
    }

    if (!completion.choices[0]?.message?.content) {
      throw new Error('Groq returned empty response for teaching insights.');
    }

    return completion.choices[0].message.content;
  }
}

