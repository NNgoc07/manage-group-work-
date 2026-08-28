const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTaskGroupMember(taskId, userId) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { groupId: true } });
  if (!task) return { error: 'Task không tồn tại', status: 404 };
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: task.groupId, userId } },
  });
  if (!member) return { error: 'Bạn không phải thành viên của group chứa task này', status: 403 };
  return { task };
}

const createComment = async (req, res) => {
  try {
    const { taskId, content } = req.body;
    if (!taskId || !content) {
      return res.status(400).json({ message: 'taskId và content là bắt buộc' });
    }
    const check = await checkTaskGroupMember(taskId, req.userId);
    if (check.error) return res.status(check.status).json({ message: check.error });

    const comment = await prisma.comment.create({
      data: { taskId, userId: req.userId, content },
      include: { user: { select: { id: true, fullName: true, email: true, avatar: true } } },
    });

    return res.status(201).json({ message: 'Tạo comment thành công', comment });
  } catch (error) {
    console.error('CreateComment error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const getCommentsByTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const check = await checkTaskGroupMember(taskId, req.userId);
    if (check.error) return res.status(check.status).json({ message: check.error });

    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: { user: { select: { id: true, fullName: true, email: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({ comments });
  } catch (error) {
    console.error('GetComments error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = { createComment, getCommentsByTask };
