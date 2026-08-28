const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGroupMember(groupId, userId) {
  return prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
}

const createTask = async (req, res) => {
  try {
    const { groupId, title, description, priority, dueDate, assigneeIds } = req.body;
    if (!groupId || !title) {
      return res.status(400).json({ message: 'groupId và title là bắt buộc' });
    }
    const member = await checkGroupMember(groupId, req.userId);
    if (!member) return res.status(403).json({ message: 'Bạn không phải thành viên của group này' });
    if (member.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Chỉ ADMIN của group mới được tạo task' });
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ message: 'Group không tồn tại' });

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
    const finalPriority = priority && validPriorities.includes(priority) ? priority : 'MEDIUM';

    const task = await prisma.task.create({
      data: {
        groupId, title, description: description || null,
        priority: finalPriority,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: req.userId,
      },
    });

    if (Array.isArray(assigneeIds) && assigneeIds.length > 0) {
      const uniqueIds = [...new Set(assigneeIds)];
      // SQLite không hỗ trợ skipDuplicates nên tạo từng bản ghi và bỏ qua trùng
      for (const uid of uniqueIds) {
        try {
          await prisma.taskAssignee.create({ data: { taskId: task.id, userId: uid } });
        } catch (e) {
          // ignore duplicate (P2002) hoặc user không tồn tại
          if (e.code !== 'P2002') console.warn('Assignee create warning:', e.message);
        }
      }
    }

    const taskWithAssignees = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        assignees: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    const formatted = {
      ...taskWithAssignees,
      assignees: taskWithAssignees.assignees.map((a) => ({
        id: a.id, userId: a.user.id, fullName: a.user.fullName, email: a.user.email,
      })),
    };
    return res.status(201).json({ message: 'Tạo task thành công', task: formatted });
  } catch (error) {
    console.error('CreateTask error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const getTasksByGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const member = await checkGroupMember(groupId, req.userId);
    if (!member) return res.status(403).json({ message: 'Bạn không phải thành viên của group này' });

    // ADMIN thấy tất cả task, MEMBER chỉ thấy task mình là assignee
    const isAdmin = member.role === 'ADMIN';
    const whereClause = isAdmin
      ? { groupId }
      : { groupId, assignees: { some: { userId: req.userId } } };

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignees: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = tasks.map((t) => ({
      id: t.id, groupId: t.groupId, title: t.title, description: t.description,
      status: t.status, priority: t.priority, dueDate: t.dueDate,
      createdById: t.createdById, createdByName: t.createdBy.fullName,
      createdAt: t.createdAt, updatedAt: t.updatedAt,
      commentCount: t._count.comments,
      assignees: t.assignees.map((a) => ({ userId: a.user.id, fullName: a.user.fullName, email: a.user.email })),
    }));
    return res.json({ tasks: formatted });
  } catch (error) {
    console.error('GetTasksByGroup error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `status phải là một trong: ${validStatuses.join(', ')}` });
    }
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ message: 'Task không tồn tại' });
    const member = await checkGroupMember(task.groupId, req.userId);
    if (!member) return res.status(403).json({ message: 'Bạn không phải thành viên của group chứa task này' });

    const updated = await prisma.task.update({
      where: { id }, data: { status },
      include: { assignees: { include: { user: { select: { id: true, fullName: true, email: true } } } } },
    });
    const formatted = {
      ...updated,
      assignees: updated.assignees.map((a) => ({ userId: a.user.id, fullName: a.user.fullName, email: a.user.email })),
    };
    return res.json({ message: 'Cập nhật trạng thái thành công', task: formatted });
  } catch (error) {
    console.error('UpdateTaskStatus error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, dueDate, assigneeIds } = req.body;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ message: 'Task không tồn tại' });
    const member = await checkGroupMember(task.groupId, req.userId);
    if (!member) return res.status(403).json({ message: 'Bạn không phải thành viên của group chứa task này' });
    const isAdmin = member.role === 'ADMIN';
    const isCreator = task.createdById === req.userId;
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Chỉ ADMIN của group hoặc người tạo task mới được cập nhật' });
    }

    const data = {};
    if (title !== undefined) {
      if (!title || !String(title).trim()) return res.status(400).json({ message: 'Tiêu đề không được để trống' });
      data.title = String(title).trim();
    }
    if (description !== undefined) data.description = description ? String(description) : null;
    if (priority !== undefined) {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
      if (!validPriorities.includes(priority)) return res.status(400).json({ message: `priority phải là một trong: ${validPriorities.join(', ')}` });
      data.priority = priority;
    }
    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === '') data.dueDate = null;
      else {
        const d = new Date(dueDate);
        if (isNaN(d.getTime())) return res.status(400).json({ message: 'dueDate không hợp lệ' });
        data.dueDate = d;
      }
    }

    if (Object.keys(data).length > 0) {
      await prisma.task.update({ where: { id }, data });
    }

    if (assigneeIds !== undefined) {
      if (!Array.isArray(assigneeIds)) return res.status(400).json({ message: 'assigneeIds phải là mảng' });
      await prisma.taskAssignee.deleteMany({ where: { taskId: id } });
      const uniqueIds = [...new Set(assigneeIds)];
      for (const uid of uniqueIds) {
        if (!uid) continue;
        try {
          await prisma.taskAssignee.create({ data: { taskId: id, userId: uid } });
        } catch (e) {
          if (e.code !== 'P2002') console.warn('Assignee update warning:', e.message);
        }
      }
    }

    const updated = await prisma.task.findUnique({
      where: { id },
      include: {
        assignees: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { comments: true } },
      },
    });
    const formatted = {
      id: updated.id, groupId: updated.groupId, title: updated.title, description: updated.description,
      status: updated.status, priority: updated.priority, dueDate: updated.dueDate,
      createdById: updated.createdById, createdByName: updated.createdBy.fullName,
      createdAt: updated.createdAt, updatedAt: updated.updatedAt,
      commentCount: updated._count.comments,
      assignees: updated.assignees.map((a) => ({ userId: a.user.id, fullName: a.user.fullName, email: a.user.email })),
    };
    return res.json({ message: 'Cập nhật task thành công', task: formatted });
  } catch (error) {
    console.error('UpdateTask error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ message: 'Task không tồn tại' });
    const member = await checkGroupMember(task.groupId, req.userId);
    if (!member) return res.status(403).json({ message: 'Bạn không phải thành viên của group chứa task này' });
    const isAdmin = member.role === 'ADMIN';
    const isCreator = task.createdById === req.userId;
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Chỉ ADMIN của group hoặc người tạo task mới được xóa' });
    }
    await prisma.taskAssignee.deleteMany({ where: { taskId: id } });
    await prisma.comment.deleteMany({ where: { taskId: id } });
    await prisma.task.delete({ where: { id } });
    return res.json({ message: 'Xóa task thành công' });
  } catch (error) {
    console.error('DeleteTask error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = { createTask, getTasksByGroup, updateTaskStatus, updateTask, deleteTask };
