const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ message: 'email, password và fullName là bắt buộc' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
      },
      select: { id: true, email: true, fullName: true, avatar: true },
    });

    const token = generateToken(user.id);

    return res.status(201).json({
      message: 'Đăng ký thành công',
      token,
      user,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email và password là bắt buộc' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    const token = generateToken(user.id);

    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
    };

    return res.json({
      message: 'Đăng nhập thành công',
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    // req.user đã được gán bởi authMiddleware
    return res.json({ user: req.user });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// PUT /api/auth/me
const updateMe = async (req, res) => {
  try {
    const { fullName, avatar } = req.body;

    const existing = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!existing) return res.status(404).json({ message: 'Người dùng không tồn tại' });

    const data = {};
    if (fullName !== undefined) {
      if (typeof fullName !== 'string' || !fullName.trim()) {
        return res.status(400).json({ message: 'fullName không được để trống' });
      }
      data.fullName = fullName.trim();
    }
    if (avatar !== undefined) {
      if (avatar !== null && typeof avatar !== 'string') {
        return res.status(400).json({ message: 'avatar phải là URL dạng chuỗi' });
      }
      const trimmed = avatar === null ? null : String(avatar).trim();
      // cho phép chuỗi rỗng => xóa avatar
      data.avatar = trimmed ? trimmed : null;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Không có dữ liệu để cập nhật' });
    }

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: { id: true, email: true, fullName: true, avatar: true },
    });

    return res.json({ message: 'Cập nhật thông tin thành công', user: updated });
  } catch (error) {
    console.error('UpdateMe error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'oldPassword và newPassword là bắt buộc' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu cũ không đúng' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.userId }, data: { password: hashed } });

    return res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error('ChangePassword error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = { register, login, getMe, updateMe, changePassword };
