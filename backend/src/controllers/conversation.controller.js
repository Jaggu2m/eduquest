export class ConversationController {
  constructor({ ragService }) {
    this.ragService = ragService;
  }

  createConversation = async (req, res, next) => {
    try {
      const { orgId, classId } = req.params;
      const { title, documentId } = req.body;
      const userId = req.user.userId || req.user.id;

      const conversation = await this.ragService.createConversation({
        userId,
        classId,
        organizationId: orgId,
        documentId,
        title,
        user: { ...req.user, id: userId },
      });

      return res.status(201).json({
        success: true,
        data: conversation,
      });
    } catch (err) {
      next(err);
    }
  };

  listConversations = async (req, res, next) => {
    try {
      const { orgId, classId } = req.params;
      const userId = req.user.userId || req.user.id;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;

      const result = await this.ragService.listConversations({
        userId,
        classId,
        organizationId: orgId,
        page,
        limit,
        user: { ...req.user, id: userId },
      });

      return res.status(200).json({
        success: true,
        data: result.conversations,
        total: result.total,
        page,
        limit,
      });
    } catch (err) {
      next(err);
    }
  };

  getConversation = async (req, res, next) => {
    try {
      const { orgId, classId, conversationId } = req.params;
      const userId = req.user.userId || req.user.id;

      const conversation = await this.ragService.getConversation({
        conversationId,
        userId,
        classId,
        organizationId: orgId,
        user: { ...req.user, id: userId },
      });

      return res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (err) {
      next(err);
    }
  };

  deleteConversation = async (req, res, next) => {
    try {
      const { orgId, classId, conversationId } = req.params;
      const userId = req.user.userId || req.user.id;

      await this.ragService.deleteConversation({
        conversationId,
        userId,
        classId,
        organizationId: orgId,
        user: { ...req.user, id: userId },
      });

      return res.status(200).json({
        success: true,
        message: 'Conversation deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  };

  sendMessage = async (req, res, next) => {
    try {
      const { orgId, classId, conversationId } = req.params;
      const { content } = req.body;
      const userId = req.user.userId || req.user.id;

      const result = await this.ragService.sendMessage({
        conversationId,
        userId,
        classId,
        organizationId: orgId,
        content,
        user: { ...req.user, id: userId },
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}
