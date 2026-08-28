import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, LogOut, Loader2, X, Copy, Check, UserPlus, FolderKanban, Crown, Calendar, Hash, ArrowUpRight, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

export default function GroupListPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  // create form
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // join form
  const [inviteCode, setInviteCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");

  const [copiedId, setCopiedId] = useState(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/groups");
      setGroups(res.data.groups || []);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải danh sách nhóm");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createName.trim()) {
      setCreateError("Tên nhóm là bắt buộc");
      return;
    }
    setCreateLoading(true);
    setCreateError("");
    try {
      await api.post("/groups", { name: createName.trim(), description: createDesc.trim() || undefined });
      setCreateName("");
      setCreateDesc("");
      setShowCreate(false);
      await fetchGroups();
    } catch (err) {
      setCreateError(err.response?.data?.message || "Tạo nhóm thất bại");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setJoinError("Vui lòng nhập invite code");
      return;
    }
    setJoinLoading(true);
    setJoinError("");
    try {
      await api.post("/groups/join", { inviteCode: inviteCode.trim() });
      setInviteCode("");
      setShowJoin(false);
      await fetchGroups();
    } catch (err) {
      setJoinError(err.response?.data?.message || "Tham gia nhóm thất bại");
    } finally {
      setJoinLoading(false);
    }
  };

  const copyInvite = async (code, id) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[64px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="font-bold text-slate-900 leading-none">Manage</p>
              <p className="text-xs text-slate-500">Nhóm của bạn</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-slate-900 leading-none">{user?.fullName}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-semibold">
              {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 bg-white px-3 py-2 rounded-xl transition"
            >
              <LogOut size={16} /> Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Title + actions */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FolderKanban className="text-indigo-600" /> Danh sách nhóm
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">Quản lý, tạo mới hoặc tham gia nhóm bằng mã mời</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowJoin(true)}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-medium px-4 py-2.5 rounded-xl transition text-sm shadow-sm"
            >
              <UserPlus size={18} className="text-indigo-600" /> Tham gia nhóm
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200 transition text-sm"
            >
              <Plus size={18} /> Tạo nhóm mới
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-sm">Đang tải danh sách nhóm...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchGroups} className="font-semibold underline">Thử lại</button>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Users size={28} />
            </div>
            <h3 className="font-semibold text-slate-900">Chưa có nhóm nào</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">Tạo nhóm mới hoặc tham gia bằng mã mời để bắt đầu cộng tác.</p>
            <div className="flex justify-center gap-3 mt-6">
              <button onClick={() => setShowCreate(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-2"><Plus size={16}/> Tạo nhóm</button>
              <button onClick={() => setShowJoin(true)} className="bg-white border border-slate-200 hover:bg-slate-50 px-5 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-2"><UserPlus size={16}/> Tham gia</button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <div key={g.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FolderKanban size={20} />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                    <Users size={12}/> {g.memberCount} thành viên
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 line-clamp-1">{g.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px] mt-1">{g.description || "Không có mô tả"}</p>
                <div className="space-y-2 mt-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5"><Crown size={12} className="text-amber-500"/> Admin: <span className="font-medium text-slate-700">{g.adminName}</span></div>
                  <div className="flex items-center gap-1.5"><Calendar size={12}/> {new Date(g.createdAt).toLocaleDateString("vi-VN")}</div>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <Hash size={12} className="text-slate-400 shrink-0"/>
                    <span className="font-mono font-medium text-slate-700 truncate">{g.inviteCode}</span>
                    <button onClick={() => copyInvite(g.inviteCode, g.id)} className="ml-auto p-1 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition">
                      {copiedId === g.id ? <Check size={14} className="text-green-600"/> : <Copy size={14} className="text-slate-500"/>}
                    </button>
                  </div>
                </div>
                <button onClick={() => navigate(`/groups/${g.id}`)} className="mt-4 w-full inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-black text-white text-sm font-medium py-2.5 rounded-xl transition">
                  Mở <ArrowUpRight size={16}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Plus size={18} className="text-indigo-600"/> Tạo nhóm mới</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X size={18}/></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {createError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">{createError}</div>}
              <div>
                <label className="text-sm font-medium text-slate-700">Tên nhóm *</label>
                <input value={createName} onChange={(e)=>setCreateName(e.target.value)} placeholder="VD: Nhóm Đồ án Web" className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-sm bg-slate-50/50 focus:bg-white" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Mô tả</label>
                <textarea value={createDesc} onChange={(e)=>setCreateDesc(e.target.value)} placeholder="Mô tả ngắn về nhóm..." rows={3} className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-sm bg-slate-50/50 focus:bg-white resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowCreate(false)} className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-xl text-sm">Hủy</button>
                <button type="submit" disabled={createLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-xl text-sm inline-flex items-center justify-center gap-2">
                  {createLoading ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/> } Tạo nhóm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoin && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowJoin(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><UserPlus size={18} className="text-indigo-600"/> Tham gia nhóm</h2>
              <button onClick={() => setShowJoin(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X size={18}/></button>
            </div>
            <form onSubmit={handleJoin} className="space-y-4">
              {joinError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">{joinError}</div>}
              <div>
                <label className="text-sm font-medium text-slate-700">Invite code *</label>
                <input value={inviteCode} onChange={(e)=>setInviteCode(e.target.value)} placeholder="VD: aB3xYz" className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-sm bg-slate-50/50 focus:bg-white font-mono" />
                <p className="text-xs text-slate-500 mt-1.5">Nhập mã 6 ký tự được chia sẻ từ admin nhóm</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowJoin(false)} className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-xl text-sm">Hủy</button>
                <button type="submit" disabled={joinLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-xl text-sm inline-flex items-center justify-center gap-2">
                  {joinLoading ? <Loader2 size={16} className="animate-spin"/> : <UserPlus size={16}/> } Tham gia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
