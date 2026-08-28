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

module.exports = { createGroup, joinGroup, getMyGroups };
