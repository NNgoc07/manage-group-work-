import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  ArrowLeft, Copy, Check, Plus, X, Loader2, Calendar, Flag,
  Users, Hash, Crown, AlertCircle, MessageSquare, Send, Clock, User,
  Sparkles, LogOut, GripVertical, CheckCircle2, Circle, Timer,
  Pencil, Trash2, Settings, Shield, UserMinus, Save, Trash,
  Moon, Sun, BarChart3, PieChart, Wand2, Lightbulb
} from "lucide-react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const COLUMNS = [
  { id: "TODO", title: "Việc cần làm", short: "TODO", bg: "bg-slate-50", darkBg: "dark:bg-slate-800", headerBg: "bg-slate-100 dark:bg-slate-700", dot: "bg-slate-400", icon: Circle },
  { id: "IN_PROGRESS", title: "Đang thực hiện", short: "IN PROGRESS", bg: "bg-blue-50/70 dark:bg-blue-950/30", headerBg: "bg-blue-100 dark:bg-blue-900/50", dot: "bg-blue-500", icon: Timer },
  { id: "DONE", title: "Hoàn thành", short: "DONE", bg: "bg-emerald-50/70 dark:bg-emerald-950/20", headerBg: "bg-emerald-100 dark:bg-emerald-900/40", dot: "bg-emerald-500", icon: CheckCircle2 },
];

const priorityMeta = {
  LOW: { label: "Thấp", cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700" },
  MEDIUM: { label: "Trung bình", cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700" },
  HIGH: { label: "Cao", cls: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700" },
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

function toDateInputValue(d) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch { return ""; }
}

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("board");
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
  // edit task
  const [showEdit, setShowEdit] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [eTitle, setETitle] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [ePriority, setEPriority] = useState("MEDIUM");
  const [eDueDate, setEDueDate] = useState("");
  const [eAssignees, setEAssignees] = useState([]);
  const [eLoading, setELoading] = useState(false);
  const [eError, setEError] = useState("");
  // group management
  const [showManage, setShowManage] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [gName, setGName] = useState("");
  const [gDesc, setGDesc] = useState("");
  const [gLoading, setGLoading] = useState(false);
  const [gError, setGError] = useState("");
  const [manageMsg, setManageMsg] = useState("");
  // AI states
  const [showAI, setShowAI] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiTasks, setAiTasks] = useState([]);
  const [aiAdding, setAiAdding] = useState(false);
  const [aiAddError, setAiAddError] = useState("");
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
  const isAdmin = useMemo(() => {
    if (!user?.id || !members.length) return false;
    const me = members.find((m) => m.userId === user.id);
    return me?.role === "ADMIN";
  }, [members, user]);
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "DONE").length;
    const doing = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const todo = tasks.filter((t) => t.status === "TODO").length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, doing, todo, percent };
  }, [tasks]);
  const pieStyle = useMemo(() => {
    const { total, done, doing, todo } = stats;
    if (total === 0) return { background: "#e2e8f0" };
    const donePct = (done / total) * 100;
    const doingPct = (doing / total) * 100;
    return { background: `conic-gradient(#10b981 0% ${donePct}%, #3b82f6 ${donePct}% ${donePct + doingPct}%, #cbd5e1 ${donePct + doingPct}% 100%)` };
  }, [stats]);
  const canManageTask = useCallback((task) => {
    if (!user?.id) return false;
    if (isAdmin) return true;
    return task.createdById === user.id;
  }, [isAdmin, user]);
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
  const handleAIBreakdown = async () => {
    if (!aiTopic.trim()) { setAiError("Vui lòng nhập tên đề tài / bài tập lớn"); return; }
    setAiLoading(true); setAiError(""); setAiTasks([]);
    try {
      const res = await api.post("/ai/breakdown", { topic: aiTopic.trim() });
      const data = Array.isArray(res.data) ? res.data : res.data.tasks || [];
      if (!Array.isArray(data) || data.length === 0) setAiError("AI không trả về task nào");
      else {
        const normalized = data.map((t) => ({
          title: t.title || "Untitled", description: t.description || "",
          priority: ["LOW","MEDIUM","HIGH"].includes(t.priority) ? t.priority : "MEDIUM", checked: true,
        }));
        setAiTasks(normalized);
      }
    } catch (err) { setAiError(err.response?.data?.message || "Gọi AI thất bại"); } finally { setAiLoading(false); }
  };
  const handleAddAllAI = async () => {
    const selected = aiTasks.filter((t) => t.checked);
    if (selected.length === 0) { setAiAddError("Vui lòng chọn ít nhất 1 task"); return; }
    setAiAdding(true); setAiAddError("");
    try {
      const newTasks = [];
      for (const t of selected) {
        const res = await api.post("/tasks", { groupId, title: t.title, description: t.description, priority: t.priority, assigneeIds: [] });
        const nt = res.data.task;
        const normalized = {
          id: nt.id, groupId: nt.groupId, title: nt.title, description: nt.description, status: nt.status,
          priority: nt.priority, dueDate: nt.dueDate, createdById: nt.createdById, createdByName: nt.createdBy?.fullName || user?.fullName,
          createdAt: nt.createdAt, updatedAt: nt.updatedAt,
          assignees: (nt.assignees || []).map((a) => ({ userId: a.userId, fullName: a.fullName, email: a.email })),
          commentCount: nt.commentCount ?? nt._count?.comments ?? 0,
        };
        newTasks.push(normalized);
      }
      setTasks((prev) => [...newTasks, ...prev]);
      setShowAI(false); setAiTopic(""); setAiTasks([]); setAiError("");
    } catch (err) { setAiAddError(err.response?.data?.message || "Thêm task thất bại"); } finally { setAiAdding(false); }
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
  const toggleEditAssignee = (userId) => {
    setEAssignees((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };
  const openEditTask = (task) => {
    setEditTask(task);
    setETitle(task.title || "");
    setEDesc(task.description || "");
    setEPriority(task.priority || "MEDIUM");
    setEDueDate(toDateInputValue(task.dueDate));
    setEAssignees((task.assignees || []).map((a) => a.userId));
    setEError("");
    setShowEdit(true);
  };
  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editTask) return;
    if (!eTitle.trim()) { setEError("Tiêu đề là bắt buộc"); return; }
    setELoading(true); setEError("");
    try {
      const payload = { title: eTitle.trim(), description: eDesc.trim(), priority: ePriority, dueDate: eDueDate || null, assigneeIds: eAssignees };
      const res = await api.put(`/tasks/${editTask.id}`, payload);
      const updated = res.data.task;
      setTasks((prev) => prev.map((t) => t.id === updated.id ? { ...t, ...updated } : t));
      if (selectedTask && selectedTask.id === updated.id) setSelectedTask((prev) => ({ ...prev, ...updated }));
      setShowEdit(false);
      setEditTask(null);
    } catch (err) { setEError(err.response?.data?.message || "Cập nhật task thất bại"); } finally { setELoading(false); }
  };
  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Xóa task "${task.title}" ?`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      if (selectedTask?.id === task.id) setSelectedTask(null);
    } catch (err) {
      alert(err.response?.data?.message || "Xóa task thất bại");
    }
  };
  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Xóa thành viên ${member.fullName} khỏi nhóm?`)) return;
    setManageMsg("");
    try {
      await api.delete(`/groups/${groupId}/members/${member.userId}`);
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
      setManageMsg("Đã xóa thành viên");
      setTimeout(() => setManageMsg(""), 2000);
    } catch (err) { alert(err.response?.data?.message || "Xóa thành viên thất bại"); }
  };
  const handleChangeRole = async (member, newRole) => {
    try {
      const res = await api.put(`/groups/${groupId}/members/${member.userId}/role`, { role: newRole });
      const updated = res.data.member;
      setMembers((prev) => prev.map((m) => m.userId === updated.userId ? { ...m, role: updated.role } : m));
      setManageMsg("Đã cập nhật role");
      setTimeout(() => setManageMsg(""), 2000);
    } catch (err) { alert(err.response?.data?.message || "Đổi role thất bại"); }
  };
  const openEditGroup = () => {
    setGName(group?.name || "");
    setGDesc(group?.description || "");
    setGError("");
    setShowEditGroup(true);
  };
  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    if (!gName.trim()) { setGError("Tên nhóm không được để trống"); return; }
    setGLoading(true); setGError("");
    try {
      const res = await api.put(`/groups/${groupId}`, { name: gName.trim(), description: gDesc.trim() });
      setGroup(res.data.group);
      setShowEditGroup(false);
      setManageMsg("Đã cập nhật nhóm");
      setTimeout(() => setManageMsg(""), 2000);
    } catch (err) { setGError(err.response?.data?.message || "Cập nhật nhóm thất bại"); } finally { setGLoading(false); }
  };
  const handleDeleteGroup = async () => {
    if (!window.confirm("Bạn chắc chắn muốn giải tán nhóm? Toàn bộ task, comment sẽ bị xóa vĩnh viễn!")) return;
    const confirm2 = window.prompt('Nhập tên nhóm để xác nhận: "' + (group?.name || "") + '"');
    if (confirm2 !== null && confirm2 !== group?.name) { alert("Tên nhóm không khớp, hủy thao tác"); return; }
    if (confirm2 === null) return;
    try {
      await api.delete(`/groups/${groupId}`);
      navigate("/groups");
    } catch (err) { alert(err.response?.data?.message || "Giải tán nhóm thất bại"); }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
        <header className="h-[64px] bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 sm:px-6"><div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" /></header>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400 py-20">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <p className="text-sm">Đang tải nhóm...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-[64px] flex items-center justify-between">
            <Link to="/groups" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900"><ArrowLeft size={18} /> Quay lại danh sách nhóm</Link>
          </div>
        </header>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl px-5 py-8 text-center">
            <AlertCircle className="mx-auto mb-2" size={28} />
            <p className="font-medium">{error}</p>
            <div className="flex justify-center gap-3 mt-4">
              <button onClick={fetchAll} className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-2 rounded-xl text-sm font-medium">Thử lại</button>
              <button onClick={() => navigate("/groups")} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium">Về danh sách nhóm</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-[64px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/groups" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0"><ArrowLeft size={18} /></Link>
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 dark:shadow-none shrink-0"><Sparkles size={18} /></div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={toggleTheme} title={isDark ? "Light mode" : "Dark mode"} className="p-2.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200">{isDark ? <Sun size={16} /> : <Moon size={16} />}</button>
            <Link to="/profile" className="hidden sm:flex items-center gap-2 hover:opacity-80 transition">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-slate-900 leading-none truncate max-w-[150px]">{user?.fullName}</p>
                <p className="text-xs text-slate-500 truncate max-w-[150px]">{user?.email}</p>
              </div>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.fullName} className="w-8 h-8 rounded-full object-cover border border-slate-200 hidden sm:block" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              ) : null}
              <div className="hidden sm:flex w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 items-center justify-center text-white text-sm font-semibold" style={{ display: user?.avatar ? "none" : undefined }}>{user?.fullName?.charAt(0)?.toUpperCase() || "U"}</div>
            </Link>
            <Link to="/profile" className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex sm:hidden items-center justify-center text-white text-sm font-semibold shrink-0" style={user?.avatar ? { backgroundImage: `url(${user.avatar})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
              {!user?.avatar && (user?.fullName?.charAt(0)?.toUpperCase() || "U")}
            </Link>
            <Link to="/profile" className="hidden sm:inline-flex text-sm font-medium text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 bg-white px-3 py-2 rounded-xl transition">Hồ sơ</Link>
            <button onClick={logout} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 bg-white px-3 py-2 rounded-xl transition"><LogOut size={16} /> <span className="hidden sm:inline">Đăng xuất</span></button>
          </div>
        </div>
      </header>
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{group?.name || "Nhóm"}</h1>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full"><Users size={12} /> {members.length} thành viên</span>
                {isAdmin && <span className="inline-flex items-center gap-1 text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 px-2.5 py-1 rounded-full"><Shield size={12} /> ADMIN</span>}
              </div>
              {group?.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-2xl">{group.description}</p>}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <Hash size={14} className="text-slate-400" />
                  <span className="font-mono text-sm font-medium text-slate-700">{group?.inviteCode}</span>
                  <button onClick={copyInvite} className="ml-1 p-1 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition">{copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-slate-500" />}</button>
                </div>
                {dragError && <span className="text-xs bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-xl">{dragError}</span>}
                {manageMsg && <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-xl">{manageMsg}</span>}
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
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
                <button onClick={() => setActiveTab("board")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === "board" ? "bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>Kanban</button>
                <button onClick={() => setActiveTab("stats")} className={`px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 transition ${activeTab === "stats" ? "bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}><BarChart3 size={14} /> Thống kê</button>
              </div>
              {dragError && <span className="text-xs bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-3 py-1.5 rounded-full">{dragError}</span>}
              {manageMsg && <span className="text-xs bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full">{manageMsg}</span>}
              {isAdmin && (
                <>
                  <button onClick={() => setShowAI(true)} className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-purple-200 dark:shadow-none transition text-sm"><Sparkles size={14} /> Gợi ý Task bằng AI</button>
                  <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition text-sm"><Plus size={18} /> Tạo Task</button>
                  <div className="relative">
                    <button onClick={() => setShowManage((v) => !v)} className="inline-flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium px-4 py-2.5 rounded-xl text-sm"><Settings size={16} /> Quản lý</button>
                    {showManage && (
                      <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-30 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Quản lý nhóm</p>
                          <button onClick={() => setShowManage(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X size={16} /></button>
                        </div>
                        <div className="p-3 space-y-3 max-h-[420px] overflow-y-auto">
                          <button onClick={() => { setShowManage(false); openEditGroup(); }} className="w-full flex items-center gap-2 text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2.5 rounded-xl"><Pencil size={16} /> Chỉnh sửa tên / mô tả nhóm</button>
                          <button onClick={handleDeleteGroup} className="w-full flex items-center gap-2 text-sm bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl"><Trash size={16} /> Giải tán nhóm</button>
                          <div className="pt-2 border-t border-slate-100">
                            <p className="text-xs font-semibold text-slate-600 mb-2">Thành viên ({members.length})</p>
                            <div className="space-y-2">
                              {members.map((m) => (
                                <div key={m.userId} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">{initials(m.fullName)}</div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-900 truncate">{m.fullName} {m.userId === user.id && <span className="text-slate-500">(bạn)</span>}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{m.email}</p>
                                  </div>
                                  <select value={m.role} onChange={(e) => handleChangeRole(m, e.target.value)} className="text-xs border border-slate-200 rounded-lg px-1.5 py-1 bg-white">
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="MEMBER">MEMBER</option>
                                  </select>
                                  <button onClick={() => handleRemoveMember(m)} title="Xóa thành viên" className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600"><UserMinus size={14} /></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === "stats" && (
          <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><PieChart size={18} className="text-indigo-600" /> Thống kê tiến độ</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-2xl p-4"><p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tổng số task</p><p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{stats.total}</p><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tất cả công việc trong nhóm</p></div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4"><p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Đang làm</p><p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-2">{stats.doing}</p><p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">IN_PROGRESS</p></div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4"><p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Chưa làm</p><p className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-2">{stats.todo}</p><p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">TODO</p></div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4"><p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Hoàn thành</p><p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mt-2">{stats.done}</p><p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">DONE</p></div>
            </div>
            <div className="grid lg:grid-cols-2 gap-6 mt-6">
              <div className="bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Tiến độ hoàn thành</h3>
                <div className="mt-4"><div className="flex items-center justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">Đã hoàn thành {stats.done}/{stats.total}</span><span className="font-bold text-indigo-600 dark:text-indigo-400">{stats.percent}%</span></div><div className="mt-2 h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all" style={{ width: `${stats.percent}%` }} /></div><p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{stats.percent === 100 ? "Tuyệt vời! Đã hoàn thành tất cả!" : stats.percent >= 50 ? "Đang tiến triển tốt!" : "Hãy tiếp tục cố gắng!"}</p></div>
                <div className="mt-6 grid grid-cols-3 gap-2 text-center"><div><p className="text-lg font-bold text-slate-900 dark:text-white">{stats.todo}</p><p className="text-xs text-slate-500">TODO</p></div><div><p className="text-lg font-bold text-blue-600">{stats.doing}</p><p className="text-xs text-slate-500">Đang làm</p></div><div><p className="text-lg font-bold text-emerald-600">{stats.done}</p><p className="text-xs text-slate-500">Xong</p></div></div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-2xl p-5 flex flex-col items-center">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white self-start">Biểu đồ tròn (CSS)</h3>
                <div className="relative mt-6 w-40 h-40 rounded-full shadow-inner border-4 border-white dark:border-slate-600" style={pieStyle}>
                  <div className="absolute inset-4 bg-white dark:bg-slate-800 rounded-full flex flex-col items-center justify-center shadow"><span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.percent}%</span><span className="text-xs text-slate-500 dark:text-slate-400">hoàn thành</span></div>
                </div>
                <div className="flex items-center gap-4 mt-6 text-xs dark:text-slate-300"><span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Hoàn thành</span><span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" /> Đang làm</span><span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-300" /> Chưa làm</span></div>
                {stats.total === 0 && <p className="text-xs text-slate-500 mt-2">Chưa có task nào</p>}
              </div>
            </div>
          </section>
        )}
        {activeTab === "board" && (
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
                                  {canManageTask(task) && (
                                    <div className="flex items-center gap-1.5 mt-3" onClick={(e) => e.stopPropagation()}>
                                      <button onClick={() => openEditTask(task)} className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-medium bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 px-2 py-1.5 rounded-lg transition"><Pencil size={12} /> Chỉnh sửa</button>
                                      <button onClick={() => handleDeleteTask(task)} className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-medium bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-700 hover:text-red-700 px-2 py-1.5 rounded-lg transition"><Trash2 size={12} /> Xóa</button>
                                    </div>
                                  )}
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
        )}
      </main>
      {showAI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !aiLoading && !aiAdding && setShowAI(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <h2 className="text-lg font-bold flex items-center gap-2"><Wand2 size={18} /> Gợi ý Task bằng AI</h2>
              <button onClick={() => !aiLoading && !aiAdding && setShowAI(false)} className="p-2 rounded-xl hover:bg-white/20"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Lightbulb size={14} className="text-amber-500" /> Tên đề tài / Bài tập lớn *</label>
                <div className="mt-2 flex gap-2">
                  <input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} onKeyDown={(e)=> e.key==='Enter' && handleAIBreakdown()} placeholder="VD: Xây dựng website bán hàng bằng React + Node.js" className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-purple-300 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900 outline-none text-sm bg-slate-50/50 dark:bg-slate-700 focus:bg-white dark:focus:bg-slate-700 dark:text-white" />
                  <button onClick={handleAIBreakdown} disabled={aiLoading} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl text-sm font-semibold inline-flex items-center gap-2 shrink-0">{aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Gợi ý</button>
                </div>
                {aiError && <p className="text-sm text-red-600 dark:text-red-400 mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-3 py-2">{aiError}</p>}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">AI sẽ chia nhỏ đề tài thành 3-5 task con với tiêu đề, mô tả và mức ưu tiên.</p>
              </div>
              {aiLoading && <div className="flex flex-col items-center gap-3 py-8 text-slate-500 dark:text-slate-400"><Loader2 size={28} className="animate-spin text-purple-600" /><p className="text-sm">Đang gọi AI, vui lòng đợi...</p></div>}
              {!aiLoading && aiTasks.length > 0 && (
                <div>
                  <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Danh sách task AI gợi ý ({aiTasks.length})</h3><label className="text-xs flex items-center gap-1.5 cursor-pointer dark:text-slate-300"><input type="checkbox" checked={aiTasks.every(t=>t.checked)} onChange={(e)=> setAiTasks(prev=> prev.map(t=> ({...t, checked: e.target.checked})))} className="rounded" /> Chọn tất cả</label></div>
                  <div className="mt-3 space-y-3 max-h-64 overflow-y-auto pr-1">
                    {aiTasks.map((t, idx2) => (
                      <label key={idx2} className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition ${t.checked ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700" : "bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600"}`}>
                        <input type="checkbox" checked={t.checked} onChange={()=> setAiTasks(prev=> prev.map((x,i)=> i===idx2 ? {...x, checked: !x.checked}:x))} className="mt-1 w-4 h-4 rounded text-purple-600" />
                        <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-semibold text-slate-900 dark:text-white">{t.title}</p><span className={`text-[11px] font-semibold border px-2 py-0.5 rounded-full ${priorityMeta[t.priority]?.cls || priorityMeta.MEDIUM.cls}`}>{priorityMeta[t.priority]?.label || t.priority}</span></div><p className="text-xs text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">{t.description}</p></div>
                      </label>
                    ))}
                  </div>
                  {aiAddError && <p className="text-sm text-red-600 dark:text-red-400 mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-3 py-2">{aiAddError}</p>}
                  <button onClick={handleAddAllAI} disabled={aiAdding} className="mt-4 w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm inline-flex items-center justify-center gap-2">{aiAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Thêm toàn bộ vào Kanban ({aiTasks.filter(t=>t.checked).length})</button>
                </div>
              )}
              {!aiLoading && aiTasks.length === 0 && !aiError && <div className="text-center py-6 text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50/50 dark:bg-slate-700/20">Nhập đề tài và bấm <b>Gợi ý</b> để AI tạo danh sách task</div>}
            </div>
          </div>
        </div>
      )}
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
                <button type="submit" disabled={cLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm inline-flex items-center justify-center gap-2">{cLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Tạo task</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEdit && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowEdit(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Pencil size={18} className="text-indigo-600" /> Chỉnh sửa Task</h2>
              <button onClick={() => setShowEdit(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateTask} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {eError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">{eError}</div>}
              <div>
                <label className="text-sm font-medium text-slate-700">Tiêu đề *</label>
                <input value={eTitle} onChange={(e) => setETitle(e.target.value)} className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-sm bg-slate-50/50 focus:bg-white" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Mô tả</label>
                <textarea value={eDesc} onChange={(e) => setEDesc(e.target.value)} rows={3} className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-sm bg-slate-50/50 focus:bg-white resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Ưu tiên</label>
                  <select value={ePriority} onChange={(e) => setEPriority(e.target.value)} className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-sm bg-slate-50/50 focus:bg-white">
                    <option value="LOW">Thấp (LOW)</option>
                    <option value="MEDIUM">Trung bình (MEDIUM)</option>
                    <option value="HIGH">Cao (HIGH)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Hạn chót</label>
                  <input type="date" value={eDueDate} onChange={(e) => setEDueDate(e.target.value)} className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-sm bg-slate-50/50 focus:bg-white" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Gán cho</label>
                <div className="mt-1.5 border border-slate-200 rounded-xl bg-slate-50/30 max-h-40 overflow-y-auto divide-y divide-slate-100">
                  {members.map((m) => (
                    <label key={m.userId} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white cursor-pointer">
                      <input type="checkbox" checked={eAssignees.includes(m.userId)} onChange={() => toggleEditAssignee(m.userId)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200" />
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">{initials(m.fullName)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{m.fullName}</p>
                        <p className="text-xs text-slate-500 truncate">{m.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-xl text-sm">Hủy</button>
                <button type="submit" disabled={eLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm inline-flex items-center justify-center gap-2">{eLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditGroup && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowEditGroup(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Settings size={18} className="text-indigo-600" /> Chỉnh sửa nhóm</h2>
              <button onClick={() => setShowEditGroup(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateGroup} className="px-6 py-5 space-y-4">
              {gError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">{gError}</div>}
              <div>
                <label className="text-sm font-medium text-slate-700">Tên nhóm *</label>
                <input value={gName} onChange={(e) => setGName(e.target.value)} className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Mô tả</label>
                <textarea value={gDesc} onChange={(e) => setGDesc(e.target.value)} rows={3} className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-sm resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditGroup(false)} className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-xl text-sm">Hủy</button>
                <button type="submit" disabled={gLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm inline-flex items-center justify-center gap-2">{gLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedTask && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedTask(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-slate-900 truncate pr-4">{selectedTask.title}</h2>
              <button onClick={() => setSelectedTask(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 shrink-0"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-slate-500">Trạng thái</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{selectedTask.status}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-slate-500">Ưu tiên</p>
                  <span className={`inline-flex mt-1 text-xs font-semibold border px-2 py-1 rounded-full ${priorityMeta[selectedTask.priority]?.cls || priorityMeta.MEDIUM.cls}`}>{priorityMeta[selectedTask.priority]?.label || selectedTask.priority}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-slate-500">Hạn chót</p>
                  <p className="text-sm font-medium text-slate-900 mt-1">{selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString("vi-VN") : "Không có"}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-slate-500">Ngày tạo</p>
                  <p className="text-sm font-medium text-slate-900 mt-1">{new Date(selectedTask.createdAt).toLocaleDateString("vi-VN")}</p>
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
