'use client';

import { useEffect, useMemo, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  listTaskColumns,
  listTasks,
  seedTaskColumns,
  createTaskColumn,
  updateTaskColumn,
  deleteTaskColumn,
  createTask,
  updateTask,
  deleteTask,
} from '@/lib/firestore';
import type { Task, TaskColumn, TaskPriority } from '@/lib/types';
import { tsToDate } from '@/lib/utils';

const COLUMN_ACCENT: Record<TaskPriority, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
  idea: 'bg-violet-500',
  custom: 'bg-gray-400',
};

const COLUMN_TINT: Record<TaskPriority, string> = {
  high: 'bg-red-50/40',
  medium: 'bg-amber-50/40',
  low: 'bg-blue-50/40',
  idea: 'bg-violet-50/40',
  custom: 'bg-gray-50/40',
};

const COLOR_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'high', label: 'Rot · Hoch' },
  { value: 'medium', label: 'Gelb · Mittel' },
  { value: 'low', label: 'Blau · Niedrig' },
  { value: 'idea', label: 'Violett · Ideen' },
  { value: 'custom', label: 'Grau · Neutral' },
];

export default function AufgabenPage() {
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Task | null>(null);
  const [creatingColumn, setCreatingColumn] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const reload = async () => {
    const [c, t] = await Promise.all([listTaskColumns(), listTasks()]);
    setColumns(c);
    setTasks(t);
  };

  useEffect(() => {
    (async () => {
      await seedTaskColumns();
      await reload();
      setLoading(false);
    })();
  }, []);

  const tasksByColumn = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const c of columns) m.set(c.id, []);
    for (const t of tasks) {
      const list = m.get(t.columnId);
      if (list) list.push(t);
    }
    for (const list of m.values()) list.sort((a, b) => a.order - b.order);
    return m;
  }, [columns, tasks]);

  const activeTask = useMemo(
    () => (activeDragId ? tasks.find((t) => t.id === activeDragId) : null),
    [activeDragId, tasks],
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(String(e.active.id));
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Über einer Spalte (Drop-Zone): in deren Liste verschieben.
    const overColumn = columns.find((c) => c.id === overId);
    if (overColumn && activeTask.columnId !== overColumn.id) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, columnId: overColumn.id } : t,
        ),
      );
      return;
    }

    // Über einer Karte: auf die Position der Karte verschieben.
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && activeTask.columnId !== overTask.columnId) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, columnId: overTask.columnId } : t,
        ),
      );
    }
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Innerhalb der gleichen Spalte sortieren (über Karten gezogen).
    const overTask = tasks.find((t) => t.id === overId);
    if (
      overTask &&
      activeTask.columnId === overTask.columnId &&
      activeTask.id !== overTask.id
    ) {
      const colTasks = tasks
        .filter((t) => t.columnId === activeTask.columnId)
        .sort((a, b) => a.order - b.order);
      const oldIndex = colTasks.findIndex((t) => t.id === activeId);
      const newIndex = colTasks.findIndex((t) => t.id === overId);
      const reordered = arrayMove(colTasks, oldIndex, newIndex);
      setTasks((prev) => {
        const others = prev.filter(
          (t) => t.columnId !== activeTask.columnId,
        );
        return [
          ...others,
          ...reordered.map((t, i) => ({ ...t, order: i })),
        ];
      });
      await Promise.all(
        reordered.map((t, i) => updateTask(t.id, { order: i })),
      );
      return;
    }

    // Über einer Spalte abgelegt: ans Ende der Spalte hängen.
    const overColumn = columns.find((c) => c.id === overId);
    if (overColumn) {
      const colTasks = tasks
        .filter((t) => t.columnId === overColumn.id)
        .filter((t) => t.id !== activeId)
        .sort((a, b) => a.order - b.order);
      const newOrder = colTasks.length;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId
            ? { ...t, columnId: overColumn.id, order: newOrder }
            : t,
        ),
      );
      await updateTask(activeId, {
        columnId: overColumn.id,
        order: newOrder,
      });
      return;
    }

    // Spaltenwechsel via Karte (während Drag-Over) — wir persistieren
    // den columnId-Wechsel + setzen Order.
    if (overTask && activeTask.columnId !== activeTask.columnId) {
      // (Wird nicht erreicht, ist nur Sicherheits-Fallback.)
      return;
    }

    // Fallback: aktuelle UI-Werte persistieren.
    await updateTask(activeId, {
      columnId: activeTask.columnId,
      order: activeTask.order,
    });
  };

  const quickAddTask = async (columnId: string, title: string) => {
    if (!title.trim()) return;
    const colTasks = tasks
      .filter((t) => t.columnId === columnId)
      .sort((a, b) => a.order - b.order);
    const newOrder = colTasks.length;
    await createTask({
      columnId,
      title: title.trim(),
      description: '',
      deadline: null,
      order: newOrder,
    });
    await reload();
  };

  const handleAddColumn = async (label: string, color: TaskPriority) => {
    if (!label.trim()) return;
    await createTaskColumn({
      label: label.trim(),
      color,
      order: columns.length,
    });
    await reload();
    setCreatingColumn(false);
  };

  const handleRenameColumn = async (
    column: TaskColumn,
    nextLabel: string,
    nextColor: TaskPriority,
  ) => {
    if (!nextLabel.trim()) return;
    await updateTaskColumn(column.id, {
      label: nextLabel.trim(),
      color: nextColor,
    });
    await reload();
  };

  const handleDeleteColumn = async (column: TaskColumn) => {
    const cnt = (tasksByColumn.get(column.id) ?? []).length;
    const msg =
      cnt > 0
        ? `Spalte "${column.label}" und ${cnt} Aufgabe${cnt === 1 ? '' : 'n'} löschen?`
        : `Spalte "${column.label}" löschen?`;
    if (!confirm(msg)) return;
    await deleteTaskColumn(column.id);
    await reload();
  };

  if (loading) {
    return <div className="card text-sm text-gray-500">Lädt Aufgaben…</div>;
  }

  const totalTasks = tasks.length;
  const overdueCount = tasks.filter((t) => {
    const d = tsToDate(t.deadline);
    return d && d.getTime() < startOfDay(new Date()).getTime();
  }).length;

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Aufgaben</h1>
          <p className="mt-1 text-sm text-gray-500">
            {totalTasks} {totalTasks === 1 ? 'Aufgabe' : 'Aufgaben'}
            {overdueCount > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                · {overdueCount} überfällig
              </span>
            )}
          </p>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          {columns.map((column) => {
            const cTasks = tasksByColumn.get(column.id) ?? [];
            return (
              <Column
                key={column.id}
                column={column}
                tasks={cTasks}
                onAdd={(title) => quickAddTask(column.id, title)}
                onRename={(label, color) =>
                  handleRenameColumn(column, label, color)
                }
                onDelete={() => handleDeleteColumn(column)}
                onEditTask={(task) => setEditing(task)}
              />
            );
          })}

          <div className="w-72 shrink-0">
            {creatingColumn ? (
              <NewColumnInline
                onCreate={handleAddColumn}
                onCancel={() => setCreatingColumn(false)}
              />
            ) : (
              <button
                onClick={() => setCreatingColumn(true)}
                className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-colors"
              >
                + Neue Spalte
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeTask ? <TaskCardView task={activeTask} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {editing && (
        <TaskEditor
          task={editing}
          columns={columns}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await updateTask(editing.id, patch);
            await reload();
            setEditing(null);
          }}
          onDelete={async () => {
            await deleteTask(editing.id);
            await reload();
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// ===================================================================
// Column
// ===================================================================

interface ColumnProps {
  column: TaskColumn;
  tasks: Task[];
  onAdd: (title: string) => void;
  onRename: (label: string, color: TaskPriority) => void;
  onDelete: () => void;
  onEditTask: (task: Task) => void;
}

function Column({
  column,
  tasks,
  onAdd,
  onRename,
  onDelete,
  onEditTask,
}: ColumnProps) {
  const [quickAdd, setQuickAdd] = useState('');
  const [renaming, setRenaming] = useState(false);
  const { setNodeRef, isOver } = useSortable({ id: column.id });

  return (
    <div className="w-72 shrink-0">
      <div
        className={`rounded-xl border border-gray-200 ${COLUMN_TINT[column.color]} flex flex-col`}
      >
        <div
          className={`h-1 w-full rounded-t-xl ${COLUMN_ACCENT[column.color]}`}
        />

        <div className="px-3 py-2.5 flex items-center justify-between gap-2">
          {renaming ? (
            <RenameRow
              column={column}
              onSave={(l, c) => {
                onRename(l, c);
                setRenaming(false);
              }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <>
              <button
                onClick={() => setRenaming(true)}
                className="text-sm font-semibold text-gray-900 flex items-center gap-2 hover:opacity-70"
                title="Spalte umbenennen"
              >
                {column.label}
                <span className="text-xs font-medium text-gray-500">
                  {tasks.length}
                </span>
              </button>
              <button
                onClick={onDelete}
                className="text-xs text-gray-400 hover:text-red-600"
                title="Spalte löschen"
              >
                ×
              </button>
            </>
          )}
        </div>

        <div
          ref={setNodeRef}
          className={`flex-1 px-2 pb-2 min-h-[120px] transition-colors ${isOver ? 'bg-white/60' : ''}`}
        >
          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {tasks.map((t) => (
                <SortableTaskCard key={t.id} task={t} onClick={onEditTask} />
              ))}
            </div>
          </SortableContext>

          <div className="mt-2">
            <input
              type="text"
              value={quickAdd}
              onChange={(e) => setQuickAdd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onAdd(quickAdd);
                  setQuickAdd('');
                }
              }}
              placeholder="+ Aufgabe (Enter)"
              className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-white/70 border border-transparent hover:border-gray-200 focus:border-gray-300 focus:bg-white focus:outline-none placeholder-gray-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RenameRow({
  column,
  onSave,
  onCancel,
}: {
  column: TaskColumn;
  onSave: (label: string, color: TaskPriority) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(column.label);
  const [color, setColor] = useState<TaskPriority>(column.color);
  return (
    <div className="flex-1 flex items-center gap-1">
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(label, color);
          if (e.key === 'Escape') onCancel();
        }}
        className="flex-1 min-w-0 px-2 py-1 text-sm rounded border border-gray-300 focus:outline-none focus:border-brand-blue"
      />
      <select
        value={color}
        onChange={(e) => setColor(e.target.value as TaskPriority)}
        className="text-xs rounded border border-gray-300 px-1 py-1 focus:outline-none focus:border-brand-blue"
      >
        {COLOR_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        onClick={() => onSave(label, color)}
        className="text-xs px-2 py-1 rounded bg-brand-blue text-white"
      >
        ✓
      </button>
    </div>
  );
}

function NewColumnInline({
  onCreate,
  onCancel,
}: {
  onCreate: (label: string, color: TaskPriority) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState<TaskPriority>('custom');
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
      <input
        autoFocus
        placeholder="Name der Spalte"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCreate(label, color);
          if (e.key === 'Escape') onCancel();
        }}
        className="input"
      />
      <select
        value={color}
        onChange={(e) => setColor(e.target.value as TaskPriority)}
        className="input text-sm"
      >
        {COLOR_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          onClick={() => onCreate(label, color)}
          className="btn-primary flex-1 text-sm"
          disabled={!label.trim()}
        >
          Anlegen
        </button>
        <button onClick={onCancel} className="btn-secondary text-sm">
          Abbrechen
        </button>
      </div>
    </div>
  );
}

// ===================================================================
// Task Card
// ===================================================================

function SortableTaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick: (task: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Klick statt Drag: Editor öffnen.
        if (!isDragging) onClick(task);
      }}
    >
      <TaskCardView task={task} />
    </div>
  );
}

function TaskCardView({
  task,
  dragging = false,
}: {
  task: Task;
  dragging?: boolean;
}) {
  const deadlineInfo = deadlineBadge(task.deadline);
  return (
    <div
      className={`rounded-lg bg-white border border-gray-200 p-3 cursor-pointer hover:border-gray-300 ${dragging ? 'shadow-lg ring-2 ring-brand-blue' : 'shadow-sm'}`}
    >
      <p className="text-sm font-medium text-gray-900 leading-snug">
        {task.title}
      </p>
      {task.description && (
        <p className="mt-1 text-xs text-gray-500 line-clamp-2">
          {task.description}
        </p>
      )}
      {deadlineInfo && (
        <div
          className={`inline-flex items-center gap-1 mt-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${deadlineInfo.classes}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            className="w-3 h-3"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {deadlineInfo.label}
        </div>
      )}
    </div>
  );
}

function deadlineBadge(
  deadline: { toDate: () => Date } | null,
): { label: string; classes: string } | null {
  const d = tsToDate(deadline);
  if (!d) return null;
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );

  const formatted = d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  if (diffDays < 0) {
    return {
      label: `Überfällig · ${formatted}`,
      classes: 'bg-red-100 text-red-700',
    };
  }
  if (diffDays === 0) {
    return { label: `Heute`, classes: 'bg-amber-100 text-amber-800' };
  }
  if (diffDays === 1) {
    return { label: `Morgen`, classes: 'bg-amber-100 text-amber-800' };
  }
  if (diffDays <= 7) {
    return {
      label: `in ${diffDays} Tagen`,
      classes: 'bg-blue-100 text-blue-700',
    };
  }
  return { label: formatted, classes: 'bg-gray-100 text-gray-700' };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// ===================================================================
// Task Editor Modal
// ===================================================================

interface TaskEditorProps {
  task: Task;
  columns: TaskColumn[];
  onClose: () => void;
  onSave: (patch: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  onDelete: () => Promise<void>;
}

function TaskEditor({
  task,
  columns,
  onClose,
  onSave,
  onDelete,
}: TaskEditorProps) {
  const initialDeadline = tsToDate(task.deadline);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [columnId, setColumnId] = useState(task.columnId);
  const [deadline, setDeadline] = useState(
    initialDeadline ? toDateInputValue(initialDeadline) : '',
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        columnId,
        deadline: deadline
          ? Timestamp.fromDate(new Date(deadline))
          : null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Aufgabe bearbeiten
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Titel</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Spalte</label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="input"
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={onDelete}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Löschen
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">
              Abbrechen
            </button>
            <button
              onClick={save}
              className="btn-primary"
              disabled={saving || !title.trim()}
            >
              {saving ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
