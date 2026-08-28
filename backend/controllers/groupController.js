const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper tạo inviteCode ngẫu nhiên 6 ký tự
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateUniqueInviteCode() {
  let code;
  let exists = true;
  // lặp đến khi không trùng
  while (exists) {
    code = generateInviteCode();
    const found = await prisma.group.findUnique({ where: { inviteCode: code } });
    exists = !!found;
  }
  return code;
}

// POST /api/groups
const createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Tên group là bắt buộc' });
    }

    const inviteCode = await generateUniqueInviteCode();

    const group = await prisma.group.create({
      data: {
        name,
        description: description || null,
        inviteCode,
        createdById: req.userId,
      },
    });

    const member = await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: req.userId,
        role: 'ADMIN',
      },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        group: true,
      },
    });

    return res.status(201).json({
      message: 'Tạo group thành công',
      group,
      member,
    });
  } catch (error) {
    console.error('CreateGroup error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// POST /api/groups/join
const joinGroup = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ message: 'inviteCode là bắt buộc' });
    }

    const group = await prisma.group.findUnique({ where: { inviteCode } });
    if (!group) {
      return res.status(404).json({ message: 'Không tìm thấy group với inviteCode này' });
    }

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: req.userId } },
    });
    if (existing) {
      return res.status(400).json({ message: 'Bạn đã là thành viên của group này' });
    }

    const member = await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: req.userId,
        role: 'MEMBER',
      },
      include: {
        group: true,
        user: { select: { id: true, email: true, fullName: true } },
      },
    });

    return res.json({ message: 'Tham gia group thành công', group, member });
  } catch (error) {
    console.error('JoinGroup error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// GET /api/groups
const getMyGroups = async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
      where: {
        members: { some: { userId: req.userId } },
      },
      include: {
        members: {
          include: { user: { select: { id: true, fullName: true, email: true } } },
        },
        _count: { select: { members: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = groups.map((g) => {
      const adminMember = g.members.find((m) => m.role === 'ADMIN');
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        inviteCode: g.inviteCode,
        createdById: g.createdById,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        memberCount: g._count.members,
        adminName: adminMember ? adminMember.user.fullName : g.createdBy.fullName,
        adminId: adminMember ? adminMember.user.id : g.createdById,
        members: g.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          fullName: m.user.fullName,
          email: m.user.email,
        })),
      };
    });

    return res.json({ groups: result });
  } catch (error) {
    console.error('GetMyGroups error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// GET /api/groups/:groupId
const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        _count: { select: { members: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });
    if (!group) return res.status(404).json({ message: 'Group không tồn tại' });

    const isMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!isMember) return res.status(403).json({ message: 'Bạn không phải thành viên của group này' });

    return res.json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        inviteCode: group.inviteCode,
        createdById: group.createdById,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        memberCount: group._count.members,
        adminName: group.createdBy.fullName,
      },
    });
  } catch (error) {
    console.error('GetGroupById error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// GET /api/groups/:groupId/members
const getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ message: 'Group không tồn tại' });

    const isMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!isMember) return res.status(403).json({ message: 'Bạn không phải thành viên của group này' });

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, fullName: true, email: true, avatar: true } } },
      orderBy: [{ role: 'desc' }, { joinedAt: 'asc' }],
    });

    const formatted = members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      fullName: m.user.fullName,
      email: m.user.email,
      avatar: m.user.avatar,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    return res.json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        inviteCode: group.inviteCode,
        createdById: group.createdById,
        createdAt: group.createdAt,
      },
      members: formatted,
    });
  } catch (error) {
    console.error('GetGroupMembers error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// DELETE /api/groups/:groupId/members/:userId  (ADMIN)
const removeMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ message: 'Group không tồn tại' });
    const requester = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!requester) return res.status(403).json({ message: 'Bạn không phải thành viên của group này' });
    if (requester.role !== 'ADMIN') return res.status(403).json({ message: 'Chỉ ADMIN mới được xóa thành viên' });
    const target = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!target) return res.status(404).json({ message: 'Thành viên không tồn tại trong group' });
    if (target.userId === req.userId && target.role === 'ADMIN') {
      const adminCount = await prisma.groupMember.count({ where: { groupId, role: 'ADMIN' } });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Không thể rời nhóm khi bạn là ADMIN duy nhất. Hãy chuyển quyền ADMIN cho người khác trước.' });
      }
    }
    const tasksInGroup = await prisma.task.findMany({ where: { groupId }, select: { id: true } });
    const taskIds = tasksInGroup.map((t) => t.id);
    if (taskIds.length > 0) {
      await prisma.taskAssignee.deleteMany({ where: { taskId: { in: taskIds }, userId } });
    }
    await prisma.groupMember.delete({ where: { groupId_userId: { groupId, userId } } });
    return res.json({ message: 'Xóa thành viên thành công' });
  } catch (error) {
    console.error('RemoveMember error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// PUT /api/groups/:groupId/members/:userId/role  (ADMIN)
const updateMemberRole = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const { role } = req.body;
    const validRoles = ['ADMIN', 'MEMBER'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: `role phải là một trong: ${validRoles.join(', ')}` });
    }
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ message: 'Group không tồn tại' });
    const requester = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!requester) return res.status(403).json({ message: 'Bạn không phải thành viên của group này' });
    if (requester.role !== 'ADMIN') return res.status(403).json({ message: 'Chỉ ADMIN mới được đổi role' });
    const target = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      include: { user: { select: { id: true, fullName: true, email: true, avatar: true } } },
    });
    if (!target) return res.status(404).json({ message: 'Thành viên không tồn tại trong group' });
    if (target.userId === req.userId && target.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await prisma.groupMember.count({ where: { groupId, role: 'ADMIN' } });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Không thể hạ quyền khi bạn là ADMIN duy nhất' });
      }
    }
    const updated = await prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { role },
      include: { user: { select: { id: true, fullName: true, email: true, avatar: true } } },
    });
    return res.json({
      message: 'Cập nhật role thành công',
      member: {
        id: updated.id, userId: updated.user.id, fullName: updated.user.fullName,
        email: updated.user.email, avatar: updated.user.avatar, role: updated.role, joinedAt: updated.joinedAt,
      },
    });
  } catch (error) {
    console.error('UpdateMemberRole error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// PUT /api/groups/:groupId  (ADMIN)
const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ message: 'Group không tồn tại' });
    const requester = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!requester) return res.status(403).json({ message: 'Bạn không phải thành viên của group này' });
    if (requester.role !== 'ADMIN') return res.status(403).json({ message: 'Chỉ ADMIN mới được cập nhật nhóm' });
    const data = {};
    if (name !== undefined) {
      if (!name || !String(name).trim()) return res.status(400).json({ message: 'Tên nhóm không được để trống' });
      data.name = String(name).trim();
    }
    if (description !== undefined) data.description = description ? String(description).trim() : null;
    if (Object.keys(data).length === 0) return res.status(400).json({ message: 'Không có dữ liệu để cập nhật' });
    const updated = await prisma.group.update({ where: { id: groupId }, data });
    return res.json({ message: 'Cập nhật nhóm thành công', group: updated });
  } catch (error) {
    console.error('UpdateGroup error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// DELETE /api/groups/:groupId  (ADMIN)
const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ message: 'Group không tồn tại' });
    const requester = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!requester) return res.status(403).json({ message: 'Bạn không phải thành viên của group này' });
    if (requester.role !== 'ADMIN') return res.status(403).json({ message: 'Chỉ ADMIN mới được giải tán nhóm' });
    const tasks = await prisma.task.findMany({ where: { groupId }, select: { id: true } });
    const taskIds = tasks.map((t) => t.id);
    if (taskIds.length > 0) {
      await prisma.comment.deleteMany({ where: { taskId: { in: taskIds } } });
      await prisma.taskAssignee.deleteMany({ where: { taskId: { in: taskIds } } });
      await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
    }
    await prisma.groupMember.deleteMany({ where: { groupId } });
    await prisma.group.delete({ where: { id: groupId } });
    return res.json({ message: 'Giải tán nhóm thành công' });
  } catch (error) {
    console.error('DeleteGroup error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = { createGroup, joinGroup, getMyGroups, getGroupById, getGroupMembers, removeMember, updateMemberRole, updateGroup, deleteGroup };
