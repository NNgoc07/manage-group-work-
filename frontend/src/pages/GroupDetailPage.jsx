import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  ArrowLeft, Copy, Check, Plus, X, Loader2, Calendar, Flag,
  Users, Hash, Crown, AlertCircle, MessageSquare, Send, Clock, User,
  Sparkles, LogOut, GripVertical, CheckCircle2, Circle, Timer
} from "lucide-react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

const COLUMNS = [
  { id: "TODO", title: "Việc cần làm", short: "TODO", bg: "bg-slate-50", headerBg: "bg-slate-100", dot: "bg-slate-400", icon: Circle },
  { id: "IN_PROGRESS", title: "Đang thực hiện", short: "IN PROGRESS", bg: "bg-blue-50/70", headerBg: "bg-blue-100", dot: "bg-blue-500", icon: Timer },
  { id: "DONE", title: "Hoàn thành", short: "DONE", bg: "bg-emerald-50/70", headerBg: "bg-emerald-100", dot: "bg-emerald-500", icon: CheckCircle2 },
];

const priorityMeta = {
  LOW: { label: "Thấp", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  MEDIUM: { label: "Trung bình", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  HIGH: { label: "Cao", cls: "bg-red-100 text-red-700 border-red-200" },
};

function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
}
function formatDate(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return d; }
}
function isOverdue(d) {
  if (!d) return false;
  return new Date(d) < new Date(new Date().toDateString());
}

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [cTitle, setCTitle] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cPriority, setCPriority] = useState("MEDIUM");
  const [cDueDate, setCDueDate] = useState("");
  const [cAssignees, setCAssignees] = useState([]);
  const [cLoading, setCLoading] = useState(false);
  const [cError, setCError] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const [dragError, setDragError] = useState("");
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let membersData = [];
      let groupData = null;
      try {
        const mRes = await api.get(`/groups/${groupId}/members`);
        membersData = mRes.data.members || [];
        groupData = mRes.data.group || null;
      } catch (e) {
        if (e.response?.status === 404) throw e;
        try {
          const gRes = await api.get(`/groups/${groupId}`);
          groupData = gRes.data.group || null;
        } catch {
          const listRes = await api.get("/groups");
          const found = (listRes.data.groups || []).find((g) => g.id === groupId);
          if (found) {
            groupData = { id: found.id, name: found.name, description: found.description, inviteCode: found.inviteCode };
            membersData = (found.members || []).map((m) => ({ userId: m.userId, fullName: m.fullName, email: m.email, role: m.role, avatar: null }));
          }
        }
      }
      const tRes = await api.get(`/tasks/group/${groupId}`);
      const tasksData = tRes.data.tasks || [];
      if (!groupData) {
        try {
          const listRes = await api.get("/groups");
          const found = (listRes.data.groups || []).find((g) => g.id === groupId);
          if (found) groupData = { id: found.id, name: found.name, description: found.description, inviteCode: found.inviteCode };
        } catch {}
      }
      setGroup(groupData);
      setMembers(membersData);
      setTasks(tasksData);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải dữ liệu nhóm");
    } finally { setLoading(false); }
  }, [groupId]);
  useEffect(() => { fetchAll(); }, [fetchAll]);
  const tasksByStatus = useMemo(() => {
    const map = { TODO: [], IN_PROGRESS: [], DONE: [] };
    for (const t of tasks) {
      const s = map[t.status] ? t.status : "TODO";
      map[s].push(t);
    }
    return map;
  }, [tasks]);
  const copyInvite = async () => {
    if (!group?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const newStatus = destination.droppableId;
    const taskId = draggableId;
    const prevTasks = tasks;
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    setDragError("");
    try { await api.put(`/tasks/${taskId}/status`, { status: newStatus }); }
    catch (err) {
      setTasks(prevTasks);
      setDragError(err.response?.data?.message || "Cập nhật trạng thái thất bại");
      setTimeout(() => setDragError(""), 3000);
    }
  };
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!cTitle.trim()) { setCError("Tiêu đề là bắt buộc"); return; }
    setCLoading(true); setCError("");
    try {
      const payload = { groupId, title: cTitle.trim(), description: cDesc.trim() || undefined, priority: cPriority, dueDate: cDueDate || undefined, assigneeIds: cAssignees };
      const res = await api.post("/tasks", payload);
      const nt = res.data.task;
      const normalized = {
        id: nt.id, groupId: nt.groupId, title: nt.title, description: nt.description, status: nt.status,
        priority: nt.priority, dueDate: nt.dueDate, createdById: nt.createdById, createdByName: nt.createdBy?.fullName || user?.fullName,
        createdAt: nt.createdAt, updatedAt: nt.updatedAt,
        assignees: (nt.assignees || []).map((a) => ({ userId: a.userId, fullName: a.fullName, email: a.email })),
        commentCount: 0,
      };
      setTasks((prev) => [normalized, ...prev]);
      setShowCreate(false);
      setCTitle(""); setCDesc(""); setCPriority("MEDIUM"); setCDueDate(""); setCAssignees([]);
    } catch (err) { setCError(err.response?.data?.message || "Tạo task thất bại"); } finally { setCLoading(false); }
  };
  const openTaskDetail = async (task) => {
    setSelectedTask(task);
    setComments([]); setCommentsLoading(true);
    try { const res = await api.get(`/comments/task/${task.id}`); setComments(res.data.comments || []); }
    catch { setComments([]); } finally { setCommentsLoading(false); }
  };
  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!commentInput.trim() || !selectedTask) return;
    setCommentSending(true);
    try {
      const res = await api.post("/comments", { taskId: selectedTask.id, content: commentInput.trim() });
      setComments((prev) => [...prev, res.data.comment]);
      setCommentInput("");
      setTasks((prev) => prev.map((t) => t.id === selectedTask.id ? { ...t, commentCount: (t.commentCount || 0) + 1 } : t));
    } catch {} finally { setCommentSending(false); }
  };
  const toggleAssignee = (userId) => {
    setCAssignees((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="h-[64px] bg-white border-b border-slate-200 flex items-center px-4 sm:px-6"><div className="w-8 h-8 rounded-xl bg-slate-200 animate-pulse" /></header>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500 py-20">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <p className="text-sm">Đang tải nhóm...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-[64px] flex items-center justify-between">
            <Link to="/groups" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft size={18} /> Quay lại danh sách nhóm</Link>
          </div>
        </header>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-8 text-center">
            <AlertCircle className="mx-auto mb-2" size={28} />
            <p className="font-medium">{error}</p>
            <div className="flex justify-center gap-3 mt-4">
              <button onClick={fetchAll} className="bg-white border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm font-medium">Thử lại</button>
              <button onClick={() => navigate("/groups")} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium">Về danh sách nhóm</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-[64px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/groups" className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 shrink-0"><ArrowLeft size={18} /></Link>
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 shrink-0"><Sparkles size={18} /></div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-slate-900 leading-none truncate max-w-[150px]">{user?.fullName}</p>
              <p className="text-xs text-slate-500 truncate max-w-[150px]">{user?.email}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-semibold sm:hidden">{user?.fullName?.charAt(0)?.toUpperCase() || "U"}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 items-center justify-center text-white text-sm font-semibold">{user?.fullName?.charAt(0)?.toUpperCase() || "U"}</div>
            <button onClick={logout} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 bg-white px-3 py-2 rounded-xl transition"><LogOut size={16} /> <span className="hidden sm:inline">Đăng xuất</span></button>
          </div>
        </div>
      </header>
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{group?.name || "Nhóm"}</h1>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full"><Users size={12} /> {members.length} thành viên</span>
              </div>
              {group?.description && <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">{group.description}</p>}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <Hash size={14} className="text-slate-400" />
                  <span className="font-mono text-sm font-medium text-slate-700">{group?.inviteCode}</span>
                  <button onClick={copyInvite} className="ml-1 p-1 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition">{copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-slate-500" />}</button>
                </div>
                {dragError && <span className="text-xs bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-xl">{dragError}</span>}
              </div>
              {members.length > 0 && (
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <span className="text-xs font-medium text-slate-500">Thành viên:</span>
                  <div className="flex -space-x-2">
                    {members.slice(0, 8).map((m) => (
                      <div key={m.userId} title={`${m.fullName} (${m.role})`} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold text-white shadow-sm" style={{ background: m.role === "ADMIN" ? "#4f46e5" : "#64748b" }}>{initials(m.fullName)}</div>
                    ))}
                    {members.length > 8 && <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">+{members.length - 8}</div>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 ml-1">
                    {members.map((m) => (
                      <span key={m.userId} className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 px-2 py-1 rounded-full">{m.fullName} {m.role === "ADMIN" && <Crown size={10} className="text-amber-500" />}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200 transition text-sm"><Plus size={18} /> Tạo Task</button>
            </div>
          </div>
        </div>
      </div>
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "thin" }}>
            {COLUMNS.map((col) => {
              const Icon = col.icon;
              const list = tasksByStatus[col.id] || [];
              return (
                <Droppable key={col.id} droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className={`shrink-0 w-[85vw] sm:w-[360px] lg:w-[380px] xl:flex-1 rounded-2xl border border-slate-200 flex flex-col max-h-[calc(100vh-240px)] min-h-[420px] snap-center ${col.bg} ${snapshot.isDraggingOver ? "ring-2 ring-indigo-200 border-indigo-300" : ""} transition`}>
                      <div className={`sticky top-0 z-10 px-4 py-3 rounded-t-2xl border-b border-slate-200 flex items-center justify-between ${col.headerBg}`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                          <Icon size={16} className="text-slate-600" />
                          <h3 className="font-semibold text-slate-900 text-sm">{col.title}</h3>
                        </div>
                        <span className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full">{list.length}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {list.length === 0 ? (
                          <div className="border border-dashed border-slate-300 rounded-xl py-10 px-4 text-center bg-white/60">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-2 text-slate-400"><Icon size={18} /></div>
                            <p className="text-sm font-medium text-slate-600">Chưa có task</p>
                            <p className="text-xs text-slate-500 mt-1">Kéo thả task vào đây hoặc tạo mới</p>
                          </div>
                        ) : (
                          list.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided2, snapshot2) => (
                                <div ref={provided2.innerRef} {...provided2.draggableProps} {...provided2.dragHandleProps} onClick={() => openTaskDetail(task)} className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition cursor-pointer group ${snapshot2.isDragging ? "shadow-xl rotate-1 ring-2 ring-indigo-200" : ""}`}>
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-medium text-slate-900 text-sm leading-snug line-clamp-2 flex-1">{task.title}</h4>
                                    <GripVertical size={14} className="text-slate-300 group-hover:text-slate-400 shrink-0 mt-0.5" />
                                  </div>
                                  {task.description && <p className="text-xs text-slate-500 line-clamp-2 mt-1.5">{task.description}</p>}
                                  <div className="flex flex-wrap items-center gap-2 mt-3">
                                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold border px-2 py-0.5 rounded-full ${priorityMeta[task.priority]?.cls || priorityMeta.MEDIUM.cls}`}><Flag size={10} /> {priorityMeta[task.priority]?.label || task.priority}</span>
                                    {task.dueDate && <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${isOverdue(task.dueDate) && task.status !== "DONE" ? "bg-red-50 border-red-200 text-red-700" : "bg-slate-50 border-slate-200 text-slate-600"}`}><Calendar size={11} /> {formatDate(task.dueDate)}</span>}
                                  </div>
                                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                    <div className="flex items-center gap-1.5">
                                      {task.assignees && task.assignees.length > 0 ? (
                                        <div className="flex -space-x-1.5">
                                          {task.assignees.slice(0, 3).map((a) => (
                                            <div key={a.userId} title={a.fullName} className="w-7 h-7 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[11px] font-semibold text-indigo-700">{initials(a.fullName)}</div>
                                          ))}
                                          {task.assignees.length > 3 && <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[11px] font-semibold text-slate-600">+{task.assignees.length - 3}</div>}
                                        </div>
                                      ) : <span className="text-xs text-slate-400 flex items-center gap-1"><User size={12} /> Chưa gán</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                      {task.commentCount > 0 && <span className="inline-flex items-center gap-1"><MessageSquare size={12} /> {task.commentCount}</span>}
                                      <span className="inline-flex items-center gap-1"><Clock size={12} /> {formatDate(task.createdAt)}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      </main>
      {showCreate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Plus size={18} className="text-indigo-600" /> Tạo Task mới</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateTask} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {cError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">{cError}</div>}
              <div>
                <label className="text-sm font-medium text-slate-700">Tiêu đề *</label>
                <input value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="VD: Thiết kế giao diện Kanban" className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-sm bg-slate-50/50 focus:bg-white" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Mô tả</label>
                <textarea value={cDesc} onChange={(e) => setCDesc(e.target.value)} placeholder="Mô tả chi tiết task..." rows={3} className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-sm bg-slate-50/50 focus:bg-white resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Ưu tiên</label>
                  <select value={cPriority} onChange={(e) => setCPriority(e.target.value)} className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-sm bg-slate-50/50 focus:bg-white">
                    <option value="LOW">Thấp (LOW)</option>
                    <option value="MEDIUM">Trung bình (MEDIUM)</option>
                    <option value="HIGH">Cao (HIGH)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Hạn chót</label>
                  <input type="date" value={cDueDate} onChange={(e) => setCDueDate(e.target.value)} className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-sm bg-slate-50/50 focus:bg-white" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Gán cho (chọn nhiều)</label>
                <div className="mt-1.5 border border-slate-200 rounded-xl bg-slate-50/30 max-h-40 overflow-y-auto divide-y divide-slate-100">
                  {members.length === 0 ? <p className="text-xs text-slate-500 p-3">Chưa có thành viên</p> : members.map((m) => (
                    <label key={m.userId} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white cursor-pointer">
                      <input type="checkbox" checked={cAssignees.includes(m.userId)} onChange={() => toggleAssignee(m.userId)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200" />
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">{initials(m.fullName)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{m.fullName} {m.role === "ADMIN" && <Crown size={12} className="inline text-amber-500 ml-1" />}</p>
                        <p className="text-xs text-slate-500 truncate">{m.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {cAssignees.length > 0 && <p className="text-xs text-slate-500 mt-1.5">Đã chọn {cAssignees.length} người</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-xl text-sm">Hủy</button>
                <button type="submit" disabled={cLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-xl text-sm inline-flex items-center justify-center gap-2">{cLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Tạo task</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedTask && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedTask(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900 leading-snug">{selectedTask.title}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold border px-2.5 py-1 rounded-full ${priorityMeta[selectedTask.priority]?.cls || priorityMeta.MEDIUM.cls}`}><Flag size={12} /> {priorityMeta[selectedTask.priority]?.label}</span>
                  <span className="inline-flex items-center gap-1 text-xs bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full">{COLUMNS.find((c) => c.id === selectedTask.status)?.title || selectedTask.status}</span>
                  {selectedTask.dueDate && <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${isOverdue(selectedTask.dueDate) && selectedTask.status !== "DONE" ? "bg-red-50 border-red-200 text-red-700" : "bg-white border-slate-200 text-slate-600"}`}><Calendar size={12} /> Hạn: {formatDate(selectedTask.dueDate)}</span>}
                </div>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 shrink-0"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-slate-500">Người tạo</p>
                  <p className="font-medium text-slate-900 mt-1 flex items-center gap-1.5"><User size={14} /> {selectedTask.createdByName || selectedTask.createdById}</p>
                  <p className="text-xs text-slate-500 mt-1">{formatDate(selectedTask.createdAt)} • {new Date(selectedTask.createdAt).toLocaleTimeString("vi-VN")}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-slate-500">Người thực hiện</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedTask.assignees && selectedTask.assignees.length > 0 ? selectedTask.assignees.map((a) => (
                      <span key={a.userId} className="inline-flex items-center gap-2 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs"><span className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">{initials(a.fullName)}</span>{a.fullName}</span>
                    )) : <span className="text-xs text-slate-500">Chưa gán</span>}
                  </div>
                </div>
              </div>
              {selectedTask.description && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Mô tả</h3>
                  <p className="text-sm text-slate-600 mt-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3 whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><MessageSquare size={16} /> Bình luận ({comments.length})</h3>
                <div className="mt-3 space-y-3 max-h-64 overflow-y-auto pr-1">
                  {commentsLoading ? <div className="flex items-center gap-2 text-sm text-slate-500 py-4 justify-center"><Loader2 size={16} className="animate-spin" /> Đang tải bình luận...</div>
                    : comments.length === 0 ? <div className="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl py-6 text-center">Chưa có bình luận</div>
                    : comments.map((c) => (
                      <div key={c.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">{initials(c.user?.fullName)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                            <div className="flex items-center gap-2"><span className="text-sm font-semibold text-slate-900">{c.user?.fullName}</span><span className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleString("vi-VN")}</span></div>
                            <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap break-words">{c.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                <form onSubmit={handleSendComment} className="mt-4 flex gap-2">
                  <input value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="Nhập bình luận..." className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-sm bg-white" />
                  <button type="submit" disabled={commentSending || !commentInput.trim()} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5 text-sm font-medium">{commentSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Gửi</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
