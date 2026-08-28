import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2, User, Mail, Image as ImageIcon, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles, LogOut } from "lucide-react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
}

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState({ type: "", text: "" });
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setAvatar(user.avatar || "");
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveMsg({ type: "", text: "" });
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setSaveMsg({ type: "error", text: "Tên không được để trống" });
      return;
    }
    setSaving(true);
    try {
      const res = await api.put("/auth/me", { fullName: trimmedName, avatar: avatar.trim() || null });
      const updated = res.data.user;
      updateUser(updated);
      setSaveMsg({ type: "success", text: res.data.message || "Cập nhật thành công" });
    } catch (err) {
      setSaveMsg({ type: "error", text: err.response?.data?.message || "Cập nhật thất bại" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg({ type: "", text: "" });
    if (!oldPassword || !newPassword) {
      setPwMsg({ type: "error", text: "Vui lòng nhập đầy đủ mật khẩu cũ và mới" });
      return;
    }
    if (newPassword.length < 6) {
      setPwMsg({ type: "error", text: "Mật khẩu mới phải có ít nhất 6 ký tự" });
      return;
    }
    setPwLoading(true);
    try {
      const res = await api.put("/auth/change-password", { oldPassword, newPassword });
      setPwMsg({ type: "success", text: res.data.message || "Đổi mật khẩu thành công" });
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      setPwMsg({ type: "error", text: err.response?.data?.message || "Đổi mật khẩu thất bại" });
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-[64px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/groups" className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
              <ArrowLeft size={18} />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="font-bold text-slate-900 leading-none">Manage</p>
              <p className="text-xs text-slate-500">Hồ sơ cá nhân</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/groups" className="hidden sm:inline-flex text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100">Nhóm</Link>
            <button onClick={handleLogout} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 bg-white px-3 py-2 rounded-xl transition">
              <LogOut size={16} /> Đăng xuất
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hồ sơ cá nhân</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý thông tin ca nhan va bao mat tai khoan</p>
        </div>
        <div className="grid gap-6 md:grid-cols-[320px_1fr]">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm h-fit">
            <div className="flex flex-col items-center text-center">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.fullName} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">{initials(user?.fullName)}</div>
              )}
              <h2 className="mt-4 font-semibold text-slate-900">{user?.fullName}</h2>
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1"><Mail size={14} /> {user?.email}</p>
              <div className="mt-4 w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-left">
                <p className="text-xs font-medium text-slate-500">Email</p>
                <p className="text-sm text-slate-900 mt-0.5 break-all">{user?.email}</p>
                <p className="text-xs font-medium text-slate-500 mt-3">Ten hien thi</p>
                <p className="text-sm text-slate-900 mt-0.5">{user?.fullName}</p>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2"><User size={18} className="text-indigo-600" /> Thông tin cá nhân</h3>
              <p className="text-xs text-slate-500 mt-1">Cập nhật tên và ảnh đại diện (URL)</p>
              {saveMsg.text && (
                <div className={"mt-4 flex items-start gap-2 text-sm rounded-xl px-3 py-2 border " + (saveMsg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700")}>
                  {saveMsg.type === "success" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                  <span>{saveMsg.text}</span>
                </div>
              )}
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Họ và tên *</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nhập họ và tên" className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-sm bg-slate-50/50 focus:bg-white" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><ImageIcon size={14} /> Avatar URL</label>
                  <input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://example.com/avatar.jpg" className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-sm bg-slate-50/50 focus:bg-white" />
                  <p className="text-xs text-slate-500 mt-1.5">Để trống để xóa avatar - hệ thống sẽ hiển thị chữ cái đầu.</p>
                  {avatar.trim() && (
                    <div className="mt-3 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <img src={avatar.trim()} alt="preview" className="w-12 h-12 rounded-full object-cover border border-slate-200" onError={(e) => (e.currentTarget.style.display = "none")} />
                      <span className="text-xs text-slate-600">Xem trước avatar</span>
                    </div>
                  )}
                </div>
                <button type="submit" disabled={saving} className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-3 rounded-xl text-sm shadow-lg shadow-indigo-200 transition">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu thay đổi
                </button>
              </div>
            </form>
            <form onSubmit={handleChangePassword} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Lock size={18} className="text-indigo-600" /> Đổi mật khẩu</h3>
              <p className="text-xs text-slate-500 mt-1">Mật khẩu mới phải có ít nhất 6 ký tự</p>
              {pwMsg.text && (
                <div className={"mt-4 flex items-start gap-2 text-sm rounded-xl px-3 py-2 border " + (pwMsg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700")}>
                  {pwMsg.type === "success" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                  <span>{pwMsg.text}</span>
                </div>
              )}
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Mật khẩu cũ *</label>
                  <div className="relative mt-1.5">
                    <input type={showOld ? "text" : "password"} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Nhập mật khẩu hiện tại" className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-sm bg-slate-50/50 focus:bg-white" />
                    <button type="button" onClick={() => setShowOld((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700">{showOld ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Mật khẩu mới *</label>
                  <div className="relative mt-1.5">
                    <input type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nhập mật khẩu mới" className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-sm bg-slate-50/50 focus:bg-white" />
                    <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700">{showNew ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>
                <button type="submit" disabled={pwLoading} className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-medium py-3 rounded-xl text-sm transition">{pwLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />} Đổi mật khẩu</button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
