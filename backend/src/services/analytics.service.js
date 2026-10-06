export class AnalyticsService {
  constructor(analyticsRepository, classRepository, aiService) {
    this.analyticsRepository = analyticsRepository;
    this.classRepository = classRepository;
    this.aiService = aiService;
  }

  /**
   * Helper to verify class exists and belongs to the organization.
   *
   * @private
   */
  async _verifyClass(classId, organizationId) {
    const targetClass = await this.classRepository.findById(classId, organizationId);
    if (!targetClass) {
      const error = new Error('Class not found in this organization.');
      error.statusCode = 404;
      throw error;
    }
    return targetClass;
  }

  /**
   * Get class-level aggregated overview metrics.
   *
   * @param {object} params
   * @param {string} params.organizationId
   * @param {string} params.classId
   * @returns {Promise<object>}
   */
  async getClassOverview({ organizationId, classId }) {
    await this._verifyClass(classId, organizationId);

    const { enrolledStudentsCount, assignmentsCount, attempts } =
      await this.analyticsRepository.getClassOverviewData(classId, organizationId);

    if (attempts.length === 0) {
      return {
        enrolledStudentsCount,
        assignmentsCount,
        totalAttemptsCount: 0,
        uniqueStudentsAttempted: 0,
        participationRate: 0,
        averageScorePercent: 0,
        medianScorePercent: 0,
        passRate: 0,
        averageTimeSpentSecs: 0,
      };
    }

    const uniqueStudents = new Set(attempts.map((a) => a.userId));
    const scores = attempts.map((a) => a.scorePercent || 0).sort((a, b) => a - b);
    const totalScore = scores.reduce((sum, s) => sum + s, 0);
    const averageScorePercent = Number((totalScore / attempts.length).toFixed(2));

    // Median score
    const mid = Math.floor(scores.length / 2);
    const medianScorePercent =
      scores.length % 2 !== 0
        ? scores[mid]
        : Number(((scores[mid - 1] + scores[mid]) / 2).toFixed(2));

    // Pass rate
    let passCount = 0;
    let totalTimes = 0;

    for (const a of attempts) {
      const threshold = a.assignment?.assessment?.passingScore || 50.0;
      if ((a.scorePercent || 0) >= threshold) {
        passCount++;
      }
      totalTimes += a.timeSpentSecs || 0;
    }

    const passRate = Number(((passCount / attempts.length) * 100).toFixed(2));
    const participationRate =
      enrolledStudentsCount > 0
        ? Number(((uniqueStudents.size / enrolledStudentsCount) * 100).toFixed(2))
        : 0;
    const averageTimeSpentSecs = Math.round(totalTimes / attempts.length);

    return {
      enrolledStudentsCount,
      assignmentsCount,
      totalAttemptsCount: attempts.length,
      uniqueStudentsAttempted: uniqueStudents.size,
      participationRate,
      averageScorePercent,
      medianScorePercent,
      passRate,
      averageTimeSpentSecs,
    };
  }

  /**
   * Get topic-level accuracy and mastery scores for a class, flagging at-risk topics.
   *
   * @param {object} params
   * @param {string} params.organizationId
   * @param {string} params.classId
   * @param {number} [params.weakThreshold=60] - Cutoff percentage below which a topic is flagged
   * @returns {Promise<object>}
   */
  async getClassTopicMastery({ organizationId, classId, weakThreshold = 60 }) {
    await this._verifyClass(classId, organizationId);

    const responses = await this.analyticsRepository.getClassTopicResponses(
      classId,
      organizationId,
    );

    const topicStats = new Map();

    for (const r of responses) {
      const topic = r.question?.topic;
      if (!topic) continue;

      if (!topicStats.has(topic.id)) {
        topicStats.set(topic.id, {
          topicId: topic.id,
          topicName: topic.name,
          totalQuestions: 0,
          correctAnswers: 0,
          totalMarksAwarded: 0,
          totalMarksPossible: 0,
        });
      }

      const stat = topicStats.get(topic.id);
      stat.totalQuestions++;
      if (r.isCorrect) stat.correctAnswers++;
      stat.totalMarksAwarded += r.marksAwarded || 0;
      stat.totalMarksPossible += r.question.marks || 1;
    }

    const topics = Array.from(topicStats.values()).map((t) => {
      const accuracyPercent =
        t.totalQuestions > 0 ? Number(((t.correctAnswers / t.totalQuestions) * 100).toFixed(2)) : 0;
      const masteryScorePercent =
        t.totalMarksPossible > 0
          ? Number(((t.totalMarksAwarded / t.totalMarksPossible) * 100).toFixed(2))
          : 0;

      return {
        topicId: t.topicId,
        topicName: t.topicName,
        totalQuestionsAnswered: t.totalQuestions,
        correctAnswers: t.correctAnswers,
        accuracyPercent,
        masteryScorePercent,
        isAtRisk: accuracyPercent < Number(weakThreshold),
      };
    });

    // Sort by accuracy ascending so weakest topics appear first
    topics.sort((a, b) => a.accuracyPercent - b.accuracyPercent);

    const weakTopics = topics.filter((t) => t.isAtRisk);

    return {
      topicsCount: topics.length,
      weakTopicsCount: weakTopics.length,
      weakTopics,
      allTopics: topics,
    };
  }

  /**
   * Question item difficulty analysis ($P$-value and category).
   *
   * @param {object} params
   * @param {string} params.organizationId
   * @param {string} params.classId
   * @returns {Promise<Array<object>>}
   */
  async getClassQuestionDifficulty({ organizationId, classId }) {
    await this._verifyClass(classId, organizationId);

    const questions = await this.analyticsRepository.getClassQuestionStats(classId, organizationId);

    return questions.map((q) => {
      const totalResponses = q.responses.length;
      const correctResponses = q.responses.filter((r) => r.isCorrect).length;
      const difficultyIndex =
        totalResponses > 0 ? Number((correctResponses / totalResponses).toFixed(2)) : null;

      let difficultyCategory = 'UNATTEMPTED';
      if (difficultyIndex !== null) {
        if (difficultyIndex >= 0.8) difficultyCategory = 'EASY';
        else if (difficultyIndex >= 0.4) difficultyCategory = 'MODERATE';
        else difficultyCategory = 'HARD';
      }

      const totalTime = q.responses.reduce((sum, r) => sum + (r.timeSpentSecs || 0), 0);
      const averageTimeSpentSecs =
        totalResponses > 0 ? Math.round(totalTime / totalResponses) : null;

      return {
        questionId: q.id,
        prompt: q.prompt,
        questionType: q.questionType,
        marks: q.marks,
        topicName: q.topic?.name || 'General',
        totalResponses,
        correctResponses,
        difficultyIndex,
        difficultyCategory,
        averageTimeSpentSecs,
      };
    });
  }

  /**
   * Individual student mastery metrics and score history.
   *
   * @param {object} params
   * @param {string} params.organizationId
   * @param {string} params.classId
   * @param {string} params.userId
   * @returns {Promise<object>}
   */
  async getStudentAnalytics({ organizationId, classId, userId }) {
    await this._verifyClass(classId, organizationId);

    const attempts = await this.analyticsRepository.getStudentAttempts(
      classId,
      userId,
      organizationId,
    );

    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        averageScorePercent: 0,
        bestScorePercent: 0,
        totalTimeSpentSecs: 0,
        strengths: [],
        weaknesses: [],
        topicMastery: [],
        attemptHistory: [],
      };
    }

    const scores = attempts.map((a) => a.scorePercent || 0);
    const totalScore = scores.reduce((sum, s) => sum + s, 0);
    const averageScorePercent = Number((totalScore / attempts.length).toFixed(2));
    const bestScorePercent = Math.max(...scores);
    const totalTimeSpentSecs = attempts.reduce((sum, a) => sum + (a.timeSpentSecs || 0), 0);

    // Topic mastery per student
    const studentTopics = new Map();
    for (const a of attempts) {
      for (const r of a.responses) {
        const topic = r.question?.topic;
        if (!topic) continue;

        if (!studentTopics.has(topic.id)) {
          studentTopics.set(topic.id, {
            topicName: topic.name,
            total: 0,
            correct: 0,
          });
        }

        const stat = studentTopics.get(topic.id);
        stat.total++;
        if (r.isCorrect) stat.correct++;
      }
    }

    const topicMastery = Array.from(studentTopics.values()).map((t) => {
      const accuracyPercent = Number(((t.correct / t.total) * 100).toFixed(2));
      return {
        topicName: t.topicName,
        totalAnswered: t.total,
        correctCount: t.correct,
        accuracyPercent,
      };
    });

    const strengths = topicMastery.filter((t) => t.accuracyPercent >= 75);
    const weaknesses = topicMastery.filter((t) => t.accuracyPercent < 60);

    const attemptHistory = attempts.map((a) => ({
      attemptId: a.id,
      assessmentTitle: a.assignment?.assessment?.title,
      scorePercent: a.scorePercent,
      timeSpentSecs: a.timeSpentSecs,
      submittedAt: a.submittedAt,
    }));

    return {
      totalAttempts: attempts.length,
      averageScorePercent,
      bestScorePercent,
      totalTimeSpentSecs,
      strengths,
      weaknesses,
      topicMastery,
      attemptHistory,
    };
  }

  /**
   * Get AI-generated teaching insights based on class analytics.
   *
   * @param {object} params
   * @param {string} params.organizationId
   * @param {string} params.classId
   * @returns {Promise<object>}
   */
  async getTeachingInsights({ organizationId, classId }) {
    if (!this.aiService) {
      throw Object.assign(new Error('AI Service is not configured.'), { statusCode: 501 });
    }

    // 1. Fetch aggregated data
    const overview = await this.getClassOverview({ organizationId, classId });
    const topicMastery = await this.getClassTopicMastery({ organizationId, classId, weakThreshold: 60 });
    const questionDifficulty = await this.getClassQuestionDifficulty({ organizationId, classId });

    const analyticsPayload = {
      overview,
      topicMastery: {
        weakTopics: topicMastery.weakTopics,
        allTopics: topicMastery.allTopics
      },
      hardQuestions: questionDifficulty.filter(q => q.difficultyCategory === 'HARD')
    };

    // 2. Generate insights via AI
    const insights = await this.aiService.generateTeachingInsights(analyticsPayload);

    return { insights, generatedAt: new Date().toISOString() };
  }
}

