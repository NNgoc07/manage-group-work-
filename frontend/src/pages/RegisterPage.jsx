import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Mail, Lock, User, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName || !email || !password) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, fullName);
      navigate("/groups");
    } catch (err) {
      setError(err.response?.data?.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 mb-4">
            <Sparkles size={28} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tạo tài khoản</h1>
          <p className="text-slate-500 mt-2 text-sm">Tham gia để cộng tác cùng nhóm</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-slate-400" /> Họ và tên
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none transition text-sm"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail size={14} className="text-slate-400" /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none transition text-sm"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Lock size={14} className="text-slate-400" /> Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none transition text-sm"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl shadow-lg shadow-indigo-200 transition text-sm"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
              {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Đã có tài khoản?{" "}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">
              Đăng nhập <ArrowRight size={14} />
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">© 2025 Manage App — Indigo & Slate theme</p>
      </div>
    </div>
  );
}
