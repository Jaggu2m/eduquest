export class ClassController {
  constructor(classService) {
    this.classService = classService;
  }

  getClasses = async (req, res) => {
    try {
      const { orgId } = req.params;
      const activeOnly = req.query.active !== 'false';
      const classes = await this.classService.getClasses(orgId, activeOnly);
      res.json(classes);
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(400).json({ message: error.message });
      }
    }
  };

  getClassById = async (req, res) => {
    try {
      const { orgId, classId } = req.params;
      const cls = await this.classService.getClassById(classId, orgId);
      res.json(cls);
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(400).json({ message: error.message });
      }
    }
  };

  createClass = async (req, res) => {
    try {
      const { orgId } = req.params;
      const newClass = await this.classService.createClass({
        organizationId: orgId,
        user: req.user,
        classData: req.body,
      });
      res.status(201).json({ message: 'Class created successfully', class: newClass });
    } catch (error) {
      if (error.message.startsWith('Forbidden')) {
        res.status(403).json({ message: error.message });
      } else if (error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(400).json({ message: error.message });
      }
    }
  };

  updateClass = async (req, res) => {
    try {
      const { orgId, classId } = req.params;
      const updatedClass = await this.classService.updateClass({
        classId,
        organizationId: orgId,
        user: req.user,
        updates: req.body,
      });
      res.json({ message: 'Class updated successfully', class: updatedClass });
    } catch (error) {
      if (error.message.startsWith('Forbidden')) {
        res.status(403).json({ message: error.message });
      } else if (error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(400).json({ message: error.message });
      }
    }
  };

  deleteClass = async (req, res) => {
    try {
      const { orgId, classId } = req.params;
      await this.classService.deleteClass({
        classId,
        organizationId: orgId,
        user: req.user,
      });
      res.json({ message: 'Class deactivated successfully' });
    } catch (error) {
      if (error.message.startsWith('Forbidden')) {
        res.status(403).json({ message: error.message });
      } else if (error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(400).json({ message: error.message });
      }
    }
  };

  // ── Enrollments ─────────────────────────────────────────────────────────────

  getEnrollments = async (req, res) => {
    try {
      const { orgId, classId } = req.params;
      const activeOnly = req.query.active !== 'false';
      const enrollments = await this.classService.getEnrollments(classId, orgId, activeOnly);
      res.json(enrollments);
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(400).json({ message: error.message });
      }
    }
  };

  enrollStudent = async (req, res) => {
    try {
      const { orgId, classId } = req.params;
      const enrollment = await this.classService.enrollStudent({
        classId,
        organizationId: orgId,
        studentUserId: req.body.userId,
        requestingUser: req.user,
      });
      res.status(201).json({ message: 'Student enrolled successfully', enrollment });
    } catch (error) {
      if (error.message.startsWith('Forbidden')) {
        res.status(403).json({ message: error.message });
      } else if (error.message.includes('already enrolled')) {
        res.status(409).json({ message: error.message });
      } else if (error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(400).json({ message: error.message });
      }
    }
  };

  removeStudent = async (req, res) => {
    try {
      const { orgId, classId, userId } = req.params;
      await this.classService.removeStudent({
        classId,
        organizationId: orgId,
        studentUserId: userId,
        requestingUser: req.user,
      });
      res.json({ message: 'Student removed from class successfully' });
    } catch (error) {
      if (error.message.startsWith('Forbidden')) {
        res.status(403).json({ message: error.message });
      } else if (error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(400).json({ message: error.message });
      }
    }
  };
}
