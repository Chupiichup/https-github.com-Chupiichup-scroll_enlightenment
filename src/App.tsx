/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Bell, 
  Settings, 
  MoreHorizontal, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Library,
  Book,
  ScrollText,
  Sparkles,
  ChevronRight,
  Calendar,
  Filter,
  User,
  Menu,
  X,
  Trash2,
  CheckSquare,
  Type,
  Tag as TagIcon,
  Calendar as CalendarIcon,
  MessageSquare,
  Zap,
  BarChart3,
  LayoutDashboard,
  Trophy,
  Target,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { breakdownTask, decomposeGoal } from "@/src/lib/gemini";
import ReactMarkdown from "react-markdown";
import confetti from 'canvas-confetti';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser 
} from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDocs,
  serverTimestamp
} from "firebase/firestore";
import { auth, db, googleProvider } from "@/src/lib/firebase";

// --- Types ---
interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Task {
  id: string;
  columnId: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  deadline: string;
  progress: number;
  tags: string[];
  checklist: ChecklistItem[];
  ownerId: string;
  linkedGoalId?: string;
}

interface Column {
  id: string;
  title: string;
  color: string;
  ownerId: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  level: "year" | "quarter" | "month" | "week";
  parentId?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  updateMethod: "manual" | "task-linked";
  linkedTaskIds?: string[];
  startDate: string;
  endDate: string;
  createdAt: any;
}

// --- Mock Data ---
const INITIAL_COLUMNS: Column[] = [
  { id: "todo", title: "Kinh Thư (Cần Học)", color: "border-silk", ownerId: "" },
  { id: "in-progress", title: "Đang Nghiên Cứu", color: "border-sage/30", ownerId: "" },
  { id: "review", title: "Ôn Tập Đạo Pháp", color: "border-cinnabar/20", ownerId: "" },
  { id: "done", title: "Công Thành Danh Toại", color: "border-sage", ownerId: "" },
];

const INITIAL_TASKS: Task[] = [
  { 
    id: "1", 
    columnId: "todo", 
    title: "Nghiên cứu React Server Components", 
    description: "Tìm hiểu về cơ chế hoạt động của RSC và cách tối ưu hóa hiệu năng.",
    priority: "High", 
    deadline: "2026-04-12",
    progress: 0,
    tags: ["React", "Advanced"],
    checklist: [],
    ownerId: ""
  },
  { 
    id: "2", 
    columnId: "in-progress", 
    title: "Luyện Ngữ Pháp IELTS", 
    description: "Tập trung vào các cấu trúc câu phức và từ vựng học thuật.",
    priority: "Medium", 
    deadline: "2026-04-10",
    progress: 45,
    tags: ["English", "IELTS"],
    checklist: [
      { id: "c1", text: "Học 20 từ vựng mới", completed: true },
      { id: "c2", text: "Làm bài tập câu bị động", completed: false }
    ],
    ownerId: ""
  },
  { 
    id: "3", 
    columnId: "review", 
    title: "Cấu Trúc Dữ Liệu & Giải Thuật", 
    description: "Ôn tập về cây nhị phân và đồ thị.",
    priority: "Urgent", 
    deadline: "2026-04-08",
    progress: 80,
    tags: ["CS", "Interview"],
    checklist: [],
    ownerId: ""
  },
  { 
    id: "4", 
    columnId: "done", 
    title: "Thiết Kế Giao Diện Thủy Mặc", 
    description: "Hoàn thiện các hiệu ứng watercolor cho ứng dụng LearnFlow.",
    priority: "Low", 
    deadline: "2026-04-05",
    progress: 100,
    tags: ["Design"],
    checklist: [],
    ownerId: ""
  },
];

// --- Sortable Task Component ---
function SortableTask({ task, getStatusColor, onDelete, onOpen }: { 
  task: Task, 
  getStatusColor: (d: string) => string,
  onDelete: (id: string) => void,
  onOpen: (task: Task) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="oriental-card border-none group overflow-hidden mb-3 relative">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-6 h-6 text-cinnabar hover:bg-cinnabar/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
        
        <div 
          className="cursor-grab active:cursor-grabbing" 
          {...attributes} 
          {...listeners}
          onClick={() => onOpen(task)}
        >
          <CardHeader className="p-4 pb-2 space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex flex-wrap gap-1">
                {task.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0 font-medium border-silk text-sage">
                    {tag}
                  </Badge>
                ))}
              </div>
              <span className={`cinnabar-seal ${
                task.priority === "Urgent" ? "opacity-100" : "opacity-60"
              }`}>
                {task.priority}
              </span>
            </div>
            <CardTitle className="text-sm font-bold leading-tight group-hover:text-sage transition-colors pr-6">
              {task.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-medium text-sage/60">
                <span>Tiến độ</span>
                <span>{task.progress}%</span>
              </div>
              <div className="h-1 w-full bg-silk/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sage transition-all duration-500" 
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[10px] font-bold ${getStatusColor(task.deadline)}`}>
                <Clock className="w-3 h-3" />
                {new Date(task.deadline).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit' })}
              </div>
              
              <div className="flex -space-x-2">
                <div className="w-5 h-5 rounded-full border border-silk bg-paper flex items-center justify-center text-[8px] font-bold text-sage">
                  印
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}

// --- Goal Node Component ---
function GoalNode({ goal, allGoals, onDecompose, onToggle, isExpanded, expandedGoals, onUpdateValue, isAiLoading }: {
  goal: Goal,
  allGoals: Goal[],
  onDecompose: (g: Goal) => void,
  onToggle: (id: string) => void,
  isExpanded: boolean,
  expandedGoals: string[],
  onUpdateValue: (id: string, val: number) => void,
  isAiLoading: boolean
}) {
  const children = allGoals.filter(g => g.parentId === goal.id);
  const progress = goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0;
  
  const levelColors: any = {
    "year": "border-cinnabar text-cinnabar bg-cinnabar/5",
    "quarter": "border-sage text-sage bg-sage/5",
    "month": "border-ink text-ink bg-ink/5",
    "week": "border-silk text-ink bg-silk/5"
  };

  return (
    <div className="space-y-4">
      <div className={`p-6 border-l-4 ${levelColors[goal.level]} oriental-card relative group`}>
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{goal.level}</span>
              <h4 className="text-lg font-bold italic">{goal.title}</h4>
            </div>
            <p className="text-xs opacity-70">{goal.description}</p>
            
            <div className="flex items-center gap-4 mt-4">
              <div className="flex-1 h-1.5 bg-silk/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-current transition-all duration-1000" 
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold">{Math.round(progress)}%</span>
            </div>

            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <Input 
                  type="text" 
                  value={goal.currentValue === 0 ? "" : goal.currentValue.toLocaleString('vi-VN')}
                  placeholder="0"
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    onUpdateValue(goal.id, val ? parseInt(val, 10) : 0);
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-24 h-8 text-xs bg-white/50 border-silk rounded-none font-bold"
                />
                <span className="text-xs opacity-60">/ {goal.targetValue.toLocaleString('vi-VN')} {goal.unit}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {goal.level !== "week" && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onDecompose(goal)}
                disabled={isAiLoading}
                className="rounded-none border-current text-[10px] font-bold uppercase"
              >
                <Sparkles className="w-3 h-3 mr-1" /> Phân Rã AI
              </Button>
            )}
            {children.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onToggle(goal.id)}
                className="rounded-none text-[10px] font-bold uppercase"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {isExpanded ? "Thu Gọn" : `Xem ${children.length} Mục Tiêu Con`}
              </Button>
            )}
          </div>
        </div>
      </div>

      {isExpanded && children.length > 0 && (
        <div className="pl-8 border-l border-silk/30 space-y-4 ml-4">
          {children.map(child => (
            <GoalNode 
              key={child.id} 
              goal={child} 
              allGoals={allGoals} 
              onDecompose={onDecompose}
              onToggle={onToggle}
              isExpanded={expandedGoals.includes(child.id)}
              expandedGoals={expandedGoals}
              onUpdateValue={onUpdateValue}
              isAiLoading={isAiLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [currentView, setCurrentView] = useState<"board" | "calendar" | "stats" | "ai" | "library" | "milestones">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("All");
  const [aiMessage, setAiMessage] = useState("");
  const [aiChatHistory, setAiChatHistory] = useState<{role: string, content: string}[]>([]);
  const [isAiChatLoading, setIsAiChatLoading] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    level: "year",
    updateMethod: "manual",
    unit: "kg",
    targetValue: 0,
    currentValue: 0,
    title: "",
    description: ""
  });
  const [expandedGoals, setExpandedGoals] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listener
  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    // We'll use a single board for now for simplicity, or scope by ownerId
    const q = query(
      collection(db, "tasks"),
      where("ownerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(tasksData);
    }, (error) => {
      console.error("Firestore Error Tasks:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Firestore Columns Listener
  useEffect(() => {
    if (!user) {
      setColumns([]);
      return;
    }

    const q = query(
      collection(db, "columns"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Initialize default columns if none exist
        INITIAL_COLUMNS.forEach(async (col, index) => {
          await setDoc(doc(db, "columns", col.id), {
            ...col,
            ownerId: user.uid,
            createdAt: serverTimestamp(),
            order: index
          });
        });
        return;
      }
      const columnsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Column[];
      setColumns(columnsData);
    }, (error) => {
      console.error("Firestore Error Columns:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Firestore Goals Listener
  useEffect(() => {
    if (!user) {
      setGoals([]);
      return;
    }

    const q = query(
      collection(db, "goals"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const goalsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Goal[];
      setGoals(goalsData);
    }, (error) => {
      console.error("Firestore Error Goals:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Automatic Progress Calculation for Task-Linked Goals
  useEffect(() => {
    if (!user || goals.length === 0 || tasks.length === 0) return;

    goals.forEach(async (goal) => {
      if (goal.updateMethod === "task-linked" && goal.linkedTaskIds && goal.linkedTaskIds.length > 0) {
        const linkedTasks = tasks.filter(t => goal.linkedTaskIds?.includes(t.id));
        const completedCount = linkedTasks.filter(t => t.columnId === "done").length;
        
        if (goal.currentValue !== completedCount) {
          try {
            await updateDoc(doc(db, "goals", goal.id), { currentValue: completedCount });
          } catch (error) {
            console.error("Auto Update Goal Error:", error);
          }
        }
      }
    });
  }, [tasks, goals, user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error.code === 'auth/popup-blocked') {
        alert("Trình duyệt đã chặn cửa sổ đăng nhập. Vui lòng cho phép hiện popup hoặc thử mở ứng dụng trong tab mới.");
      } else if (error.code === 'auth/unauthorized-domain') {
        alert("Tên miền này chưa được ủy quyền trong Firebase Console. Vui lòng kiểm tra lại danh sách Authorized Domains.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        alert("Cửa sổ đăng nhập đã bị đóng trước khi hoàn tất. Vui lòng thử lại và không đóng cửa sổ cho đến khi đăng nhập xong. Nếu vẫn lỗi, hãy thử mở ứng dụng trong tab mới.");
      } else {
        alert("Lỗi đăng nhập: " + error.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  // Browser Notification Request & Deadline Check
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const checkDeadlines = () => {
      const now = new Date();
      tasks.forEach(task => {
        const due = new Date(task.deadline);
        const diffMs = due.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours > 0 && diffHours <= 24 && Notification.permission === "granted") {
          new Notification("Sắp đến hạn học tập!", {
            body: `Mục tiêu "${task.title}" sẽ hết hạn trong vòng 24 giờ tới.`,
            icon: "https://picsum.photos/seed/learn/100/100"
          });
        }
      });
    };

    const interval = setInterval(checkDeadlines, 1000 * 60 * 60); // Check every hour
    return () => clearInterval(interval);
  }, [tasks]);

  const getStatusColor = (deadline: string) => {
    const now = new Date();
    const due = new Date(deadline);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "text-cinnabar bg-cinnabar/5 border-cinnabar/20";
    if (diffDays <= 2) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-sage bg-sage/5 border-sage/10";
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveId(active.id);
    setActiveTask(tasks.find(t => t.id === active.id) || null);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveATask = tasks.some((t) => t.id === activeId);
    const isOverATask = tasks.some((t) => t.id === overId);

    if (!isActiveATask) return;

    // Dropping a Task over another Task
    if (isActiveATask && isOverATask) {
      const activeTask = tasks.find((t) => t.id === activeId);
      const overTask = tasks.find((t) => t.id === overId);

      if (activeTask && overTask && activeTask.columnId !== overTask.columnId) {
        updateDoc(doc(db, "tasks", activeId as string), {
          columnId: overTask.columnId
        });
      }
    }

    // Dropping a Task over a Column
    const isOverAColumn = columns.some((c) => c.id === overId);
    if (isActiveATask && isOverAColumn) {
      const activeTask = tasks.find((t) => t.id === activeId);
      if (activeTask && activeTask.columnId !== overId) {
        updateDoc(doc(db, "tasks", activeId as string), {
          columnId: overId as string
        });
      }
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over) {
      const activeTask = tasks.find(t => t.id === active.id);
      if (activeTask && over.id === "done" && activeTask.columnId !== "done") {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#5D6D5D', '#A63D33', '#D4C5B3']
        });
      }
    }
    setActiveId(null);
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const updateTask = async (updates: Partial<Task>) => {
    if (!selectedTask || !user) return;
    const updatedTask = { ...selectedTask, ...updates };
    
    // Calculate progress if checklist changed
    if (updates.checklist) {
      const total = updates.checklist.length;
      const completed = updates.checklist.filter(i => i.completed).length;
      updatedTask.progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    try {
      await updateDoc(doc(db, "tasks", selectedTask.id), updatedTask);
      setSelectedTask(updatedTask);
    } catch (error) {
      console.error("Update Task Error:", error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      setIsDetailOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error("Delete Task Error:", error);
    }
  };

  const handleAiAssist = async () => {
    if (!selectedTask) return;
    setIsAiLoading(true);
    const steps = await breakdownTask(selectedTask.title);
    if (steps.length > 0) {
      const newItems: ChecklistItem[] = steps.map(s => ({
        id: Math.random().toString(36).substr(2, 9),
        text: s,
        completed: false
      }));
      updateTask({ checklist: [...(selectedTask.checklist || []), ...newItems] });
    }
    setIsAiLoading(false);
  };

  const handleAiChat = async () => {
    if (!aiMessage.trim()) return;
    
    const userMsg = { role: "user", content: aiMessage };
    setAiChatHistory(prev => [...prev, userMsg]);
    setAiMessage("");
    setIsAiChatLoading(true);

    try {
      const response = await breakdownTask(`Hãy tư vấn cho tôi về mục tiêu tu luyện sau: ${aiMessage}. Hãy trả lời như một vị sư phụ thông thái trong một thư viện cổ, hướng dẫn đệ tử trên con đường giác ngộ.`);
      const aiMsg = { role: "assistant", content: response.join("\n\n") };
      setAiChatHistory(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAiChatLoading(false);
    }
  };

  const addNewColumn = async () => {
    if (!user || !newColumnTitle.trim()) return;
    const id = Math.random().toString(36).substr(2, 9);
    const newCol = {
      id,
      title: newColumnTitle,
      color: "border-silk",
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      order: columns.length
    };
    try {
      await setDoc(doc(db, "columns", id), newCol);
      setNewColumnTitle("");
      setIsAddingColumn(false);
    } catch (error) {
      console.error("Add Column Error:", error);
    }
  };

  const updateColumnTitle = async (columnId: string) => {
    if (!user || !editingColumnTitle.trim()) return;
    try {
      await updateDoc(doc(db, "columns", columnId), { title: editingColumnTitle });
      setEditingColumnId(null);
      setEditingColumnTitle("");
    } catch (error) {
      console.error("Update Column Error:", error);
    }
  };

  const deleteColumn = async (columnId: string) => {
    if (!user) return;
    if (!confirm("Bạn có chắc chắn muốn xóa cột này? Tất cả mục tiêu trong cột cũng sẽ bị xóa.")) return;
    try {
      // Delete tasks in column
      const tasksInCol = tasks.filter(t => t.columnId === columnId);
      for (const task of tasksInCol) {
        await deleteDoc(doc(db, "tasks", task.id));
      }
      // Delete column
      await deleteDoc(doc(db, "columns", columnId));
    } catch (error) {
      console.error("Delete Column Error:", error);
    }
  };

  const handleAddGoal = async () => {
    if (!user || !newGoal.title) return;
    try {
      const goalData = {
        ...newGoal,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
      };
      await addDoc(collection(db, "goals"), goalData);
      setIsAddingGoal(false);
      setNewGoal({
        level: "year",
        updateMethod: "manual",
        unit: "kg",
        targetValue: 0,
        currentValue: 0,
        title: "",
        description: ""
      });
    } catch (error) {
      console.error("Add Goal Error:", error);
      alert("Có lỗi xảy ra khi tạo đại nguyện. Vui lòng thử lại.");
    }
  };

  const handleDecomposeGoal = async (parentGoal: Goal) => {
    if (!parentGoal) return;
    setIsAiLoading(true);
    console.log("Decomposing goal:", parentGoal.title);
    try {
      const subGoals = await decomposeGoal(parentGoal.title, parentGoal.level, parentGoal.targetValue, parentGoal.unit);
      console.log("AI Response:", subGoals);
      
      if (subGoals && Array.isArray(subGoals)) {
        const nextLevel: any = {
          "year": "quarter",
          "quarter": "month",
          "month": "week"
        }[parentGoal.level];

        if (nextLevel) {
          // Use Promise.all for faster insertion
          await Promise.all(subGoals.map(sg => 
            addDoc(collection(db, "goals"), {
              title: sg.title,
              description: sg.description || "",
              targetValue: Number(sg.targetValue) || 0,
              currentValue: 0,
              unit: parentGoal.unit,
              level: nextLevel,
              parentId: parentGoal.id,
              ownerId: user.uid,
              updateMethod: parentGoal.updateMethod,
              createdAt: serverTimestamp(),
              startDate: parentGoal.startDate,
              endDate: parentGoal.endDate
            })
          ));
          setExpandedGoals(prev => [...prev, parentGoal.id]);
        }
      } else {
        alert("AI không thể phân rã mục tiêu này. Vui lòng thử lại với tên mục tiêu rõ ràng hơn.");
      }
    } catch (error) {
      console.error("Decompose Error:", error);
      alert("Lỗi kết nối AI. Vui lòng kiểm tra lại.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoals(prev => 
      prev.includes(goalId) ? prev.filter(id => id !== goalId) : [...prev, goalId]
    );
  };

  const updateGoalValue = async (goalId: string, newValue: number) => {
    try {
      await updateDoc(doc(db, "goals", goalId), { currentValue: newValue });
    } catch (error) {
      console.error("Update Goal Error:", error);
    }
  };

  const addNewTask = async (columnId: string) => {
    if (!user) return;
    const newTask = {
      columnId,
      title: "Mục tiêu mới",
      description: "",
      priority: "Medium",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 0,
      tags: ["Mới"],
      checklist: [],
      ownerId: user.uid,
      createdAt: serverTimestamp()
    };
    
    try {
      const docRef = await addDoc(collection(db, "tasks"), newTask);
      openTaskDetail({ id: docRef.id, ...newTask } as any);
    } catch (error) {
      console.error("Add Task Error:", error);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           task.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPriority = filterPriority === "All" || task.priority === filterPriority;
      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchQuery, filterPriority]);

  // --- Statistics Data ---
  const statsData = useMemo(() => {
    const columnCounts = columns.map(col => ({
      name: col.title,
      value: tasks.filter(t => t.columnId === col.id).length
    }));

    const priorityCounts = [
      { name: 'Thấp', value: tasks.filter(t => t.priority === 'Low').length, color: '#5D6D5D' },
      { name: 'Trung Bình', value: tasks.filter(t => t.priority === 'Medium').length, color: '#D4C5B3' },
      { name: 'Cao', value: tasks.filter(t => t.priority === 'High').length, color: '#A63D33' },
      { name: 'Khẩn Cấp', value: tasks.filter(t => t.priority === 'Urgent').length, color: '#8B0000' },
    ];

    return { columnCounts, priorityCounts };
  }, [tasks, columns]);

  if (isAuthLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-paper">
        <div className="text-center space-y-4">
          <Library className="w-12 h-12 text-sage animate-pulse mx-auto" />
          <p className="text-sm italic text-sage">Đang mở cổng thư viện...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-paper relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-sage rounded-full blur-[100px]"></div>
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-cinnabar rounded-full blur-[100px]"></div>
        </div>
        
        <Card className="w-full max-w-md oriental-card border-silk bg-white/80 backdrop-blur-xl relative z-10 p-12 text-center space-y-8">
          <div className="space-y-4">
            <div className="w-20 h-20 border-2 border-cinnabar rounded-full flex items-center justify-center mx-auto relative">
              <Library className="text-cinnabar w-10 h-10" />
              <div className="absolute -bottom-1 -right-1 bg-cinnabar text-paper text-[10px] px-1.5 font-bold">藏書</div>
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-widest uppercase">Scroll of Enlightenment</h1>
              <p className="text-xs text-sage font-medium uppercase tracking-[0.2em]">Cổ Thư Tu Tiên</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <p className="text-sm italic text-sage/80 leading-relaxed">
              "Hành trình vạn dặm bắt đầu từ một bước chân. <br/> Hãy đăng nhập để tiếp tục con đường giác ngộ của bạn."
            </p>
            <Button onClick={handleLogin} className="ink-button w-full h-12 text-base rounded-none shadow-xl group">
              <User className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
              Bước Vào Thư Viện
            </Button>
          </div>
          
          <div className="pt-8 border-t border-silk/30">
            <p className="text-[10px] text-sage/40 uppercase tracking-widest">Bản Toàn Năng © 2026</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-paper text-ink font-serif overflow-hidden">
      {/* Sidebar - Oriental Style */}
      <aside className="w-64 border-r border-silk bg-white/40 backdrop-blur-md flex flex-col">
        <div className="p-8 flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-2 border-cinnabar rounded-full flex items-center justify-center relative">
            <Library className="text-cinnabar w-8 h-8" />
            <div className="absolute -bottom-1 -right-1 bg-cinnabar text-paper text-[8px] px-1 font-bold">
              藏書
            </div>
          </div>
          <div className="text-center">
            <h1 className="font-bold text-2xl tracking-widest uppercase">Scroll of Enlightenment</h1>
            <p className="text-[10px] text-sage font-medium uppercase tracking-[0.2em]">Cổ Thư Tu Tiên</p>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-2">
          <Button 
            variant="ghost" 
            onClick={() => setCurrentView("board")}
            className={`w-full justify-start gap-4 rounded-none transition-all ${
              currentView === "board" ? "text-sage bg-sage/5 border-l-2 border-sage" : "text-ink/60 hover:text-sage hover:bg-sage/5"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Bảng Đạo Pháp
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setCurrentView("calendar")}
            className={`w-full justify-start gap-4 rounded-none transition-all ${
              currentView === "calendar" ? "text-sage bg-sage/5 border-l-2 border-sage" : "text-ink/60 hover:text-sage hover:bg-sage/5"
            }`}
          >
            <Calendar className="w-4 h-4" /> Lịch Trình
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setCurrentView("stats")}
            className={`w-full justify-start gap-4 rounded-none transition-all ${
              currentView === "stats" ? "text-sage bg-sage/5 border-l-2 border-sage" : "text-ink/60 hover:text-sage hover:bg-sage/5"
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Thống Kê Đạo Pháp
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setCurrentView("milestones")}
            className={`w-full justify-start gap-4 rounded-none transition-all ${
              currentView === "milestones" ? "text-sage bg-sage/5 border-l-2 border-sage" : "text-ink/60 hover:text-sage hover:bg-sage/5"
            }`}
          >
            <Trophy className="w-4 h-4" /> Đại Lộ Công Danh
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setCurrentView("library")}
            className={`w-full justify-start gap-4 rounded-none transition-all ${
              currentView === "library" ? "text-sage bg-sage/5 border-l-2 border-sage" : "text-ink/60 hover:text-sage hover:bg-sage/5"
            }`}
          >
            <Book className="w-4 h-4" /> Thư Viện Cổ
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setCurrentView("ai")}
            className={`w-full justify-start gap-4 rounded-none transition-all ${
              currentView === "ai" ? "text-sage bg-sage/5 border-l-2 border-sage" : "text-ink/60 hover:text-sage hover:bg-sage/5"
            }`}
          >
            <Sparkles className="w-4 h-4" /> AI Tiên Tri
          </Button>
        </nav>

        <div className="p-6 mt-auto">
          {/* Premium Access card removed */}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-paper/30">
        {/* Header */}
        <header className="h-20 border-b border-silk bg-white/20 backdrop-blur-sm px-10 flex items-center justify-between">
          <div className="flex items-center gap-6 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/40" />
              <Input 
                placeholder="Tìm kiếm kinh thư..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-paper/50 border-silk focus-visible:ring-sage rounded-none italic"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sage">
              <Filter className="w-4 h-4" />
              <select 
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-transparent border-none text-xs font-bold uppercase tracking-widest focus:ring-0 cursor-pointer"
              >
                <option value="All">Tất cả độ ưu tiên</option>
                <option value="Low">Thấp</option>
                <option value="Medium">Trung Bình</option>
                <option value="High">Cao</option>
                <option value="Urgent">Khẩn Cấp</option>
              </select>
            </div>
            <Button variant="ghost" size="icon" className="relative text-ink/70">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-cinnabar rounded-full"></span>
            </Button>
            <div className="flex items-center gap-3 pl-6 border-l border-silk">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold">{user?.displayName || "Học Giả"}</p>
                <p className="text-[9px] text-sage uppercase tracking-tighter">Học Giả</p>
              </div>
              <div className="w-10 h-10 rounded-full border border-silk p-0.5 group relative cursor-pointer">
                <div className="w-full h-full rounded-full bg-sage/10 flex items-center justify-center overflow-hidden">
                  <img src={user?.photoURL || "https://picsum.photos/seed/oriental/100/100"} alt="User" referrerPolicy="no-referrer" />
                </div>
                <div className="absolute top-full right-0 mt-2 w-32 bg-white border border-silk shadow-xl hidden group-hover:block z-50">
                  <Button 
                    variant="ghost" 
                    onClick={handleLogout}
                    className="w-full justify-start text-xs text-cinnabar hover:bg-cinnabar/5 rounded-none"
                  >
                    Đăng Xuất
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Board Area */}
        <div className="flex-1 p-10 overflow-hidden flex flex-col relative">
          {/* Watercolor Background Effect */}
          <div className="absolute inset-0 pointer-events-none opacity-10 mix-blend-multiply overflow-hidden">
            <div className="absolute -top-20 -left-20 w-96 h-96 bg-sage rounded-full blur-[100px]"></div>
            <div className="absolute top-1/2 -right-20 w-80 h-80 bg-cinnabar rounded-full blur-[120px]"></div>
            <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-silk rounded-full blur-[100px]"></div>
          </div>

          <div className="flex items-center justify-between mb-10 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-bold tracking-tight">
                  {currentView === "board" && "Bảng Đạo Pháp"}
                  {currentView === "calendar" && "Lịch Trình Tu Luyện"}
                  {currentView === "stats" && "Thống Kê Đạo Pháp"}
                  {currentView === "ai" && "AI Tiên Tri Tư Vấn"}
                  {currentView === "library" && "Thư Viện Cổ"}
                </h2>
                <div className="cinnabar-seal">Bản Toàn Năng</div>
              </div>
              <p className="text-sage/60 text-sm italic">
                {currentView === "board" && "Hành trình vạn dặm bắt đầu từ một bước chân."}
                {currentView === "calendar" && "Thời gian là vàng bạc, hãy trân trọng từng khắc."}
                {currentView === "stats" && "Nhìn lại chặng đường đã qua để vững bước tương lai."}
                {currentView === "ai" && "Hãy hỏi vị sư phụ về con đường giác ngộ của bạn."}
                {currentView === "library" && "Nơi lưu giữ những thành tựu và tri thức bạn đã đạt được."}
              </p>
            </div>
            {currentView === "board" && (
              <div className="flex gap-4">
                <Dialog open={isAddingColumn} onOpenChange={setIsAddingColumn}>
                  <Button variant="outline" className="border-silk text-sage gap-2 rounded-none" onClick={() => setIsAddingColumn(true)}>
                    <Plus className="w-4 h-4" /> Thêm Cột Mới
                  </Button>
                  <DialogContent className="oriental-card border-silk">
                    <DialogHeader>
                      <DialogTitle>Thêm Cột Đạo Pháp Mới</DialogTitle>
                      <DialogDescription>Đặt tên cho giai đoạn tu luyện mới của bạn.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Input 
                        placeholder="Tên cột (ví dụ: Đang Thử Nghiệm)" 
                        value={newColumnTitle}
                        onChange={(e) => setNewColumnTitle(e.target.value)}
                        className="border-silk focus-visible:ring-sage rounded-none"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setIsAddingColumn(false)}>Hủy</Button>
                      <Button onClick={addNewColumn} className="ink-button rounded-none">Khởi Tạo</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button onClick={() => addNewTask(columns[0]?.id || "todo")} className="ink-button gap-2 rounded-none shadow-lg">
                  <Plus className="w-4 h-4" /> Khởi Tạo Mục Tiêu
                </Button>
              </div>
            )}
          </div>

          {currentView === "board" && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <ScrollArea className="flex-1">
                <div className="flex gap-8 pb-8 min-h-[600px]">
                  {columns.map((column) => (
                    <div key={column.id} className="w-80 flex-shrink-0 flex flex-col gap-5">
                      <div className="flex items-center justify-between px-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full bg-sage`} />
                          {editingColumnId === column.id ? (
                            <Input 
                              autoFocus
                              value={editingColumnTitle}
                              onChange={(e) => setEditingColumnTitle(e.target.value)}
                              onBlur={() => updateColumnTitle(column.id)}
                              onKeyDown={(e) => e.key === 'Enter' && updateColumnTitle(column.id)}
                              className="h-7 py-0 px-2 text-sm font-bold border-silk focus-visible:ring-sage rounded-none w-40"
                            />
                          ) : (
                            <h3 
                              className="font-bold text-ink/80 text-sm uppercase tracking-widest cursor-pointer hover:text-sage"
                              onClick={() => {
                                setEditingColumnId(column.id);
                                setEditingColumnTitle(column.title);
                              }}
                            >
                              {column.title}
                            </h3>
                          )}
                          <span className="text-[10px] font-serif italic text-sage">({tasks.filter(t => t.columnId === column.id).length})</span>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-6 h-6 text-silk hover:text-cinnabar"
                            onClick={() => deleteColumn(column.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div className={`flex-1 rounded-sm p-4 bg-white/30 border-t-2 ${column.color} space-y-4 min-h-[150px]`}>
                        <SortableContext
                          items={filteredTasks.filter(t => t.columnId === column.id).map(t => t.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {filteredTasks
                            .filter((task) => task.columnId === column.id)
                            .map((task) => (
                              <SortableTask 
                                key={task.id} 
                                task={task} 
                                getStatusColor={getStatusColor}
                                onDelete={deleteTask}
                                onOpen={openTaskDetail}
                              />
                            ))}
                        </SortableContext>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start gap-2 text-xs text-sage/60 hover:text-sage hover:bg-sage/5 border border-dashed border-silk/50 rounded-none h-10"
                          onClick={() => addNewTask(column.id)}
                        >
                          <Plus className="w-3 h-3" /> Thêm thẻ mới...
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                  styles: {
                    active: {
                      opacity: '0.5',
                    },
                  },
                }),
              }}>
                {activeId && activeTask ? (
                  <div className="w-80">
                    <SortableTask 
                      task={activeTask} 
                      getStatusColor={getStatusColor}
                      onDelete={deleteTask}
                      onOpen={openTaskDetail}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

          {currentView === "calendar" && (
            <div className="flex-1 overflow-y-auto relative z-10">
              <div className="bg-white/60 border border-silk p-8 oriental-card">
                <div className="grid grid-cols-7 gap-px bg-silk/20 border border-silk">
                  {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                    <div key={day} className="bg-paper p-2 text-center text-[10px] font-bold text-sage uppercase tracking-widest border-b border-silk">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: 35 }).map((_, i) => {
                    const day = i - 3; // Simple offset for demo
                    const dateStr = `2026-04-${day < 10 ? '0' + day : day}`;
                    const dayTasks = tasks.filter(t => t.deadline === dateStr);
                    
                    return (
                      <div key={i} className="bg-white/40 min-h-[120px] p-2 border-r border-b border-silk last:border-r-0">
                        <span className={`text-[10px] font-bold ${day > 0 && day <= 30 ? 'text-ink' : 'text-ink/20'}`}>
                          {day > 0 && day <= 30 ? day : ''}
                        </span>
                        <div className="mt-2 space-y-1">
                          {dayTasks.map(task => (
                            <div 
                              key={task.id} 
                              onClick={() => openTaskDetail(task)}
                              className="text-[8px] p-1 bg-sage/10 border-l-2 border-sage truncate cursor-pointer hover:bg-sage/20 transition-colors"
                            >
                              {task.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {currentView === "stats" && (
            <div className="flex-1 overflow-y-auto relative z-10 space-y-8 pb-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="oriental-card border-silk bg-white/60">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Phân Bổ Mục Tiêu</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statsData.columnCounts}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#D4C5B3" vertical={false} />
                        <XAxis dataKey="name" stroke="#5D6D5D" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#5D6D5D" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#F4F1EA', border: '1px solid #D4C5B3', fontFamily: 'serif' }}
                          cursor={{ fill: '#5D6D5D10' }}
                        />
                        <Bar dataKey="value" fill="#5D6D5D" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="oriental-card border-silk bg-white/60">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Độ Ưu Tiên Tu Luyện</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statsData.priorityCounts}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {statsData.priorityCounts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#F4F1EA', border: '1px solid #D4C5B3', fontFamily: 'serif' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-4">
                      {statsData.priorityCounts.map(p => (
                        <div key={p.name} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="text-[10px] font-bold text-sage uppercase">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="oriental-card border-silk bg-white/60">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest">Tiến Độ Tổng Thể</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {tasks.slice(0, 5).map(task => (
                      <div key={task.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold italic">{task.title}</span>
                          <span className="text-[10px] font-bold text-sage">{task.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-silk/30 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-sage transition-all duration-1000" 
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentView === "milestones" && (
            <div className="flex-1 flex flex-col relative z-10 space-y-8 overflow-hidden">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold italic tracking-widest">Đại Lộ Công Danh</h2>
                  <p className="text-xs text-sage italic">Theo dõi lộ trình tu luyện từ Năm đến Tuần</p>
                </div>
                <Button onClick={() => setIsAddingGoal(true)} className="ink-button rounded-none gap-2">
                  <Plus className="w-4 h-4" /> Thiết Lập Đại Nguyện
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-6 pb-20">
                  {goals.filter(g => !g.parentId).map(yearGoal => (
                    <GoalNode 
                      key={yearGoal.id} 
                      goal={yearGoal} 
                      allGoals={goals} 
                      onDecompose={handleDecomposeGoal}
                      onToggle={toggleGoalExpansion}
                      isExpanded={expandedGoals.includes(yearGoal.id)}
                      expandedGoals={expandedGoals}
                      onUpdateValue={updateGoalValue}
                      isAiLoading={isAiLoading}
                    />
                  ))}
                  {goals.filter(g => !g.parentId).length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed border-silk/30 italic text-sage/40">
                      Chưa có đại nguyện nào được thiết lập. Hãy bắt đầu hành trình của bạn.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {currentView === "ai" && (
            <div className="flex-1 flex flex-col relative z-10 bg-white/40 border border-silk oriental-card overflow-hidden">
              <ScrollArea className="flex-1 p-8">
                <div className="space-y-6 max-w-3xl mx-auto">
                  {aiChatHistory.length === 0 && (
                    <div className="text-center py-20 space-y-4">
                      <Sparkles className="w-12 h-12 text-sage/20 mx-auto" />
                      <h3 className="text-xl font-bold italic">Chào mừng Học Giả</h3>
                      <p className="text-sm text-sage/60">Hãy đặt câu hỏi về mục tiêu học tập, tôi sẽ giúp bạn tìm ra con đường đúng đắn.</p>
                    </div>
                  )}
                  {aiChatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-4 rounded-none border ${
                        msg.role === 'user' 
                        ? 'bg-sage/10 border-sage/20 text-ink italic' 
                        : 'bg-white/80 border-silk text-ink font-serif'
                      }`}>
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isAiChatLoading && (
                    <div className="flex justify-start">
                      <div className="p-4 bg-white/80 border border-silk animate-pulse flex gap-2 items-center text-sage italic text-sm">
                        <Zap className="w-4 h-4 animate-bounce" /> Vị sư phụ đang suy ngẫm...
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-6 border-t border-silk bg-paper/50">
                <div className="max-w-3xl mx-auto flex gap-4">
                  <Input 
                    placeholder="Hỏi về mục tiêu học tập của bạn..."
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiChat()}
                    className="bg-white border-silk rounded-none italic"
                  />
                  <Button onClick={handleAiChat} disabled={isAiChatLoading} className="ink-button rounded-none">
                    Gửi Lời
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentView === "library" && (
            <div className="flex-1 overflow-y-auto relative z-10">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {tasks.filter(t => t.columnId === 'done').length === 0 && (
                  <div className="col-span-full py-20 text-center space-y-4">
                    <Book className="w-12 h-12 text-sage/20 mx-auto" />
                    <h3 className="text-xl font-bold italic">Thư Viện Đang Trống</h3>
                    <p className="text-sm text-sage/60">Hãy hoàn thành các mục tiêu để lưu giữ chúng vào thư viện cổ.</p>
                  </div>
                )}
                {tasks.filter(t => t.columnId === 'done').map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => openTaskDetail(task)}
                    className="group cursor-pointer"
                  >
                    <div className="relative aspect-[3/4] bg-white border-2 border-silk p-4 flex flex-col justify-between shadow-md group-hover:shadow-xl transition-all group-hover:-translate-y-2">
                      <div className="absolute left-2 top-0 bottom-0 w-1 bg-silk/20"></div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <Library className="w-4 h-4 text-sage/40" />
                          <div className="cinnabar-seal text-[8px] opacity-40">完</div>
                        </div>
                        <h4 className="font-bold text-sm leading-tight group-hover:text-sage transition-colors">{task.title}</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="h-px bg-silk/30 w-full"></div>
                        <p className="text-[9px] text-sage italic">Hoàn thành: {new Date().toLocaleDateString('vi-VN')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Goal Dialog */}
      <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
        <DialogContent className="bg-paper border-silk rounded-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold italic">Thiết Lập Đại Nguyện</DialogTitle>
            <DialogDescription className="text-xs italic">Đặt mục tiêu lớn để bắt đầu con đường tu luyện.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest">Tên Đại Nguyện</label>
              <Input 
                placeholder="Ví dụ: Giảm 20kg trong năm 2026"
                value={newGoal.title}
                onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                className="bg-white/50 border-silk rounded-none italic"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest">Cấp Độ</label>
                <select 
                  value={newGoal.level}
                  onChange={(e) => setNewGoal({...newGoal, level: e.target.value as any})}
                  className="w-full bg-white/50 border border-silk p-2 text-sm focus:ring-0 rounded-none"
                >
                  <option value="year">Năm</option>
                  <option value="quarter">Quý</option>
                  <option value="month">Tháng</option>
                  <option value="week">Tuần</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest">Đơn Vị</label>
                <Input 
                  placeholder="kg, trang, giờ..."
                  value={newGoal.unit}
                  onChange={(e) => setNewGoal({...newGoal, unit: e.target.value})}
                  className="bg-white/50 border-silk rounded-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest">Mục Tiêu (Con số)</label>
                <Input 
                  type="text"
                  value={newGoal.targetValue === 0 ? "" : newGoal.targetValue?.toLocaleString('vi-VN')}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setNewGoal({...newGoal, targetValue: val ? parseInt(val, 10) : 0});
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="Nhập số lượng..."
                  className="bg-white/50 border-silk rounded-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest">Phương Thức Cập Nhật</label>
                <select 
                  value={newGoal.updateMethod}
                  onChange={(e) => setNewGoal({...newGoal, updateMethod: e.target.value as any})}
                  className="w-full bg-white/50 border border-silk p-2 text-sm focus:ring-0 rounded-none"
                >
                  <option value="manual">Thủ công</option>
                  <option value="task-linked">Liên kết thẻ Kanban</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddingGoal(false)} className="rounded-none">Hủy</Button>
            <Button onClick={handleAddGoal} className="ink-button rounded-none">Xác Nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Modal - Premium Oriental Style */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl bg-paper border-silk p-0 overflow-hidden rounded-none shadow-2xl">
          {selectedTask && (
            <div className="flex flex-col h-[80vh]">
              <div className="p-8 border-b border-silk bg-white/40 flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <ScrollText className="w-5 h-5 text-sage" />
                    <Input 
                      value={selectedTask.title}
                      onChange={(e) => updateTask({ title: e.target.value })}
                      className="text-2xl font-bold bg-transparent border-none p-0 focus-visible:ring-0 h-auto"
                    />
                  </div>
                  <p className="text-xs text-sage italic">Trong danh mục: {columns.find(c => c.id === selectedTask.columnId)?.title}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsDetailOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="grid grid-cols-3 gap-8">
                  <div className="col-span-2 space-y-8">
                    {/* Description */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-ink/80">
                        <MessageSquare className="w-4 h-4" />
                        <h4 className="font-bold text-sm uppercase tracking-widest">Mô Tả Kinh Thư</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <Textarea 
                          placeholder="Ghi chú chi tiết về mục tiêu học tập này (Hỗ trợ Markdown)..."
                          value={selectedTask.description}
                          onChange={(e) => updateTask({ description: e.target.value })}
                          className="bg-white/50 border-silk rounded-none min-h-[120px] italic text-sm"
                        />
                        {selectedTask.description && (
                          <div className="p-4 bg-sage/5 border border-dashed border-sage/20 rounded-none prose prose-sm max-w-none italic text-sage/80">
                            <ReactMarkdown>{selectedTask.description}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Checklist */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-ink/80">
                          <CheckSquare className="w-4 h-4" />
                          <h4 className="font-bold text-sm uppercase tracking-widest">Các Bước Tu Luyện</h4>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleAiAssist}
                          disabled={isAiLoading}
                          className="gap-2 border-sage text-sage hover:bg-sage/5 rounded-none text-[10px] font-bold uppercase tracking-wider"
                        >
                          <Sparkles className={`w-3 h-3 ${isAiLoading ? 'animate-pulse' : ''}`} />
                          {isAiLoading ? 'Đang Tiên Tri...' : 'AI Tiên Tri'}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {selectedTask.checklist.map((item, idx) => (
                          <div key={item.id} className="flex items-center gap-3 group">
                            <input 
                              type="checkbox" 
                              checked={item.completed}
                              onChange={(e) => {
                                const newChecklist = [...selectedTask.checklist];
                                newChecklist[idx].completed = e.target.checked;
                                updateTask({ checklist: newChecklist });
                              }}
                              className="w-4 h-4 accent-sage border-silk"
                            />
                            <Input 
                              value={item.text}
                              onChange={(e) => {
                                const newChecklist = [...selectedTask.checklist];
                                newChecklist[idx].text = e.target.value;
                                updateTask({ checklist: newChecklist });
                              }}
                              className="bg-transparent border-none p-0 focus-visible:ring-0 text-sm italic"
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="opacity-0 group-hover:opacity-100 h-6 w-6 text-cinnabar"
                              onClick={() => {
                                const newChecklist = selectedTask.checklist.filter((_, i) => i !== idx);
                                updateTask({ checklist: newChecklist });
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-sage/60 italic text-xs p-0 h-auto hover:bg-transparent hover:text-sage"
                          onClick={() => {
                            const newItem = { id: Math.random().toString(36).substr(2, 9), text: "Bước mới...", completed: false };
                            updateTask({ checklist: [...selectedTask.checklist, newItem] });
                          }}
                        >
                          + Thêm bước mới...
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Info */}
                  <div className="space-y-6">
                    <div className="space-y-4 border border-silk p-4 bg-white/20">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-sage uppercase tracking-widest">Độ Ưu Tiên</p>
                        <select 
                          value={selectedTask.priority}
                          onChange={(e) => updateTask({ priority: e.target.value as any })}
                          className="w-full bg-transparent border-none text-sm font-bold text-cinnabar focus:ring-0"
                        >
                          <option value="Low">Thấp</option>
                          <option value="Medium">Trung Bình</option>
                          <option value="High">Cao</option>
                          <option value="Urgent">Khẩn Cấp</option>
                        </select>
                      </div>

                      <Separator className="bg-silk/50" />

                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-sage uppercase tracking-widest">Ngày Đến Hạn</p>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-3 h-3 text-sage" />
                          <input 
                            type="date" 
                            value={selectedTask.deadline}
                            onChange={(e) => updateTask({ deadline: e.target.value })}
                            className="bg-transparent border-none text-sm font-bold focus:ring-0"
                          />
                        </div>
                      </div>

                      <Separator className="bg-silk/50" />

                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-sage uppercase tracking-widest">Liên Kết Đại Nguyện</p>
                        <select 
                          value={selectedTask.linkedGoalId || ""}
                          onChange={(e) => {
                            const goalId = e.target.value;
                            updateTask({ linkedGoalId: goalId });
                            
                            // Also update the goal's linkedTaskIds
                            if (goalId) {
                              const goal = goals.find(g => g.id === goalId);
                              if (goal) {
                                const newLinkedTaskIds = [...(goal.linkedTaskIds || []), selectedTask.id];
                                updateDoc(doc(db, "goals", goalId), { linkedTaskIds: Array.from(new Set(newLinkedTaskIds)) });
                              }
                            }
                          }}
                          className="w-full bg-transparent border-none text-xs font-bold text-sage focus:ring-0"
                        >
                          <option value="">Không liên kết</option>
                          {goals.map(g => (
                            <option key={g.id} value={g.id}>{g.title} ({g.level})</option>
                          ))}
                        </select>
                      </div>

                      <Separator className="bg-silk/50" />

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-sage uppercase tracking-widest">Nhãn (Tags)</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedTask.tags.map(tag => (
                            <Badge key={tag} className="sage-badge text-[9px] rounded-none">
                              {tag}
                              <X className="w-2 h-2 ml-1 cursor-pointer" onClick={() => updateTask({ tags: selectedTask.tags.filter(t => t !== tag) })} />
                            </Badge>
                          ))}
                          <div className="flex items-center gap-1">
                            <Input 
                              placeholder="Thêm nhãn..."
                              className="h-6 text-[9px] w-20 bg-transparent border-dashed border-silk rounded-none p-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = (e.target as HTMLInputElement).value.trim();
                                  if (val && !selectedTask.tags.includes(val)) {
                                    updateTask({ tags: [...selectedTask.checklist.length > 0 ? selectedTask.tags : selectedTask.tags, val] });
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-2 text-cinnabar hover:bg-cinnabar/5 rounded-none text-xs font-bold uppercase tracking-widest"
                      onClick={() => deleteTask(selectedTask.id)}
                    >
                      <Trash2 className="w-4 h-4" /> Xóa Mục Tiêu
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
