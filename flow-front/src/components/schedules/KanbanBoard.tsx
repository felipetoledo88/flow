import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Task, TaskStatusEntity } from '@/types/schedule';
import { useTaskStatus } from '@/hooks/use-task-status';
import { TaskStatusService } from '@/services/api/task-status.service';
import { Clock, CheckCircle2, AlertTriangle, PlayCircle, Plus, AlertCircle, Calendar, CalendarX } from 'lucide-react';
import CreateTaskStatusModal from './CreateTaskStatusModal';
import EditTaskStatusModal from './EditTaskStatusModal';
import StatusOptionsMenu from './StatusOptionsMenu';
import DeleteStatusModal from './DeleteStatusModal';
import TaskDetailsModal from './TaskDetailsModal';
import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { getStatusColorsFromEntity } from '@/utils/status-colors';
import { formatHoursToDisplay } from '@/lib/time-utils';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface KanbanBoardProps {
  tasks: Task[];
  projectId?: number;
  onTaskStatusChange: (taskId: number, newStatusId: number) => Promise<void>;
  onTaskUpdate?: (updatedTask: Task) => void;
}

interface KanbanColumn {
  id: number;
  code: string;
  name: string;
  tasks: Task[];
  status: TaskStatusEntity;
  bgColor: string;
  textColor: string;
  borderColor: string;
  bgSolid: string;
}

interface TaskCardProps {
  task: Task;
  onTaskClick: (task: Task) => void;
}

// Componente do card de tarefa arrastável
const TaskCard: React.FC<TaskCardProps> = React.memo(({ task, onTaskClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  };

  const getProgressColor = () => {
    const actualHours = Number(task.actualHours) || 0;
    const estimatedHours = Number(task.estimatedHours) || 0;

    if (actualHours > estimatedHours) return 'bg-orange-500';

    const statusColors = getStatusColorsFromEntity(task.status);
    return statusColors.bgSolid;
  };

  const getProgressPercentage = () => {
    const actualHours = Number(task.actualHours) || 0;
    const estimatedHours = Number(task.estimatedHours) || 0;

    if (estimatedHours === 0) return 0;
    return Math.min((actualHours / estimatedHours) * 100, 100);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    e.stopPropagation();
    onTaskClick(task);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className="group bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200 cursor-grab active:cursor-grabbing active:shadow-xl"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-sm font-medium text-gray-900 flex-1 line-clamp-2 leading-snug">
          {task.title}
        </h4>
        <Badge variant="outline" className="text-[10px] shrink-0 font-mono bg-gray-50">
          #{task.id}
        </Badge>
      </div>

      {/* Barra de progresso das horas */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span className="font-medium">{formatHoursToDisplay(task.actualHours)} / {formatHoursToDisplay(task.estimatedHours)}</span>
            {Number(task.actualHours) > Number(task.estimatedHours) && (
              <AlertCircle className="h-3 w-3 text-orange-500" />
            )}
          </div>
          <span className="font-semibold text-gray-700">{Math.round(getProgressPercentage())}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Calendar className="h-3 w-3" />
          <span>{formatDate(task.endDate)}</span>
        </div>

        {task.assignee && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <span className="text-[10px] font-medium text-gray-600">
                {getInitials(task.assignee.name)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.actualHours === nextProps.task.actualHours &&
    prevProps.task.estimatedHours === nextProps.task.estimatedHours &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.assignee?.name === nextProps.task.assignee?.name &&
    prevProps.task.startDate === nextProps.task.startDate &&
    prevProps.task.endDate === nextProps.task.endDate
  );
});

// Componente da coluna do Kanban
const KanbanColumnComponent: React.FC<{
  column: KanbanColumn;
  onStatusDelete: (statusId: number) => void;
  onStatusEdit: (status: TaskStatusEntity) => void;
  onTaskClick: (task: Task) => void;
}> = ({ column, onStatusDelete, onStatusEdit, onTaskClick }) => {
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: `${column.id}`,
  });

  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${column.id}`,
    data: {
      type: 'Column',
      column,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const setNodeRef = (node: HTMLElement | null) => {
    setDroppableNodeRef(node);
    setSortableNodeRef(node);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${column.bgColor} rounded-2xl h-full w-80 flex-shrink-0 flex flex-col transition-all duration-200 ${
        isOver ? 'ring-2 ring-offset-2 ring-blue-400 shadow-xl scale-[1.02]' : ''
      } ${isDragging ? 'z-50 shadow-2xl scale-105' : ''}`}
    >
      {/* Header da coluna */}
      <div
        className="p-4 cursor-move"
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-1 h-8 rounded-full ${column.bgSolid}`} />
            <div>
              <h3 className={`text-sm font-semibold ${column.textColor}`}>
                {column.name}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {column.tasks.length} {column.tasks.length === 1 ? 'tarefa' : 'tarefas'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <StatusOptionsMenu
              status={column.status}
              onDelete={onStatusDelete}
              onEdit={onStatusEdit}
            />
          </div>
        </div>
      </div>

      {/* Conteúdo da coluna */}
      <div className="flex-1 overflow-hidden px-3 pb-3">
        <div className="space-y-3 h-full overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          {column.tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className={`w-12 h-12 rounded-full ${column.bgColor} flex items-center justify-center mb-3`}>
                <CheckCircle2 className={`h-6 w-6 ${column.textColor} opacity-40`} />
              </div>
              <p className="text-sm text-gray-400 text-center">
                Nenhuma tarefa
              </p>
            </div>
          ) : (
            column.tasks.map((task) => (
              <TaskCard
                key={`${task.id}-${task.actualHours}-${task.estimatedHours}`}
                task={task}
                onTaskClick={onTaskClick}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, projectId, onTaskStatusChange, onTaskUpdate }) => {
  const { statuses, isLoading, refreshStatuses, deleteStatus } = useTaskStatus(projectId);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks || []);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<KanbanColumn | null>(null);
  const [isCreateStatusModalOpen, setIsCreateStatusModalOpen] = useState(false);
  const [deleteStatusModal, setDeleteStatusModal] = useState<{ isOpen: boolean; status: TaskStatusEntity | null }>({ isOpen: false, status: null });
  const [editStatusModal, setEditStatusModal] = useState<{ isOpen: boolean; status: TaskStatusEntity | null }>({ isOpen: false, status: null });
  const [isUpdating, setIsUpdating] = useState(false);
  const [taskDetailsModal, setTaskDetailsModal] = useState<{ isOpen: boolean; task: Task | null }>({ isOpen: false, task: null });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  // Sincronizar localTasks com as props tasks
  // Usar JSON.stringify para comparar o conteúdo real das tasks
  const tasksKey = React.useMemo(() => {
    return JSON.stringify(tasks?.map(t => ({ id: t.id, statusId: t.status?.id, actualHours: t.actualHours })));
  }, [tasks]);

  React.useEffect(() => {
    if (tasks) {
      setLocalTasks(tasks);
    }
  }, [tasksKey]);

  const filteredTasks = useMemo(() => {
    return localTasks?.filter(task => {
      if (!task.sprint || !task.sprint.statusSprint) {
        return false;
      }
      return task.sprint.statusSprint.name === 'Em andamento';
    }) || [];
  }, [localTasks]);

  const activeSprint = useMemo(() => {
    const firstActiveTask = filteredTasks.find(task =>
      task.sprint && task.sprint.statusSprint?.name === 'Em andamento'
    );
    return firstActiveTask?.sprint || null;
  }, [filteredTasks]);

  const formatSprintDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  };

  const columns: KanbanColumn[] = useMemo(() => {
    if (!statuses.length) return [];

    const sortedStatuses = statuses.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined && b.order === undefined) return -1;
      if (a.order === undefined && b.order !== undefined) return 1;
      return a.id - b.id;
    });

    return sortedStatuses.map((status, index) => {
      const colors = getStatusColorsFromEntity(status, index);
      const statusTasks = filteredTasks.filter(task => task.status.id === status.id);
      return {
        id: status.id,
        code: status.code,
        name: status.name,
        tasks: statusTasks,
        status: status,
        bgColor: colors.bg,
        textColor: colors.text,
        borderColor: colors.border,
        bgSolid: colors.bgSolid,
      };
    });
  }, [statuses, filteredTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;

    if (active.id.toString().startsWith('column-')) {
      const columnId = parseInt(active.id.toString().replace('column-', ''));
      const column = columns.find(col => col.id === columnId);
      setActiveColumn(column || null);
      setActiveTask(null);
    } else {
      const task = filteredTasks.find(t => t.id === active.id);
      setActiveTask(task || null);
      setActiveColumn(null);
    }
  };

  const handleColumnReorder = async (activeColumnId: number, overColumnId: number) => {
    try {
      const activeIndex = columns.findIndex(col => col.id === activeColumnId);
      const overIndex = columns.findIndex(col => col.id === overColumnId);

      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
        return;
      }

      const reorderedColumns = [...columns];
      const [movedColumn] = reorderedColumns.splice(activeIndex, 1);
      reorderedColumns.splice(overIndex, 0, movedColumn);

      const reorderData = reorderedColumns.map((column, index) => ({
        statusId: column.id,
        newOrder: index + 1
      }));

      await TaskStatusService.reorder(reorderData);
      await refreshStatuses();

      toast({
        title: "Colunas reordenadas",
        description: "A ordem das colunas foi atualizada com sucesso.",
      });

    } catch (error) {
      await refreshStatuses();
      toast({
        title: "Erro",
        description: "Não foi possível reordenar as colunas. Verifique o backend.",
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveTask(null);
      setActiveColumn(null);
      return;
    }

    if (active.id.toString().startsWith('column-')) {
      const activeColumnId = parseInt(active.id.toString().replace('column-', ''));

      let overColumnId: number | null = null;

      if (over.id.toString().startsWith('column-')) {
        overColumnId = parseInt(over.id.toString().replace('column-', ''));
      } else {
        const targetTask = filteredTasks.find(t => t.id.toString() === over.id.toString());
        if (targetTask) {
          overColumnId = targetTask.status.id;
        } else {
          const targetColumn = columns.find(col => col.id.toString() === over.id.toString());
          if (targetColumn) {
            overColumnId = targetColumn.id;
          }
        }
      }

      if (overColumnId && activeColumnId !== overColumnId) {
        await handleColumnReorder(activeColumnId, overColumnId);
      }

      setActiveTask(null);
      setActiveColumn(null);
      return;
    }

    const taskId = active.id as number;
    let newStatusId: number;

    if (over.id.toString().startsWith('column-')) {
      const columnId = parseInt(over.id.toString().replace('column-', ''));
      newStatusId = columnId;
    } else {
      const targetColumn = columns.find(col => col.id.toString() === over.id.toString());
      if (targetColumn) {
        newStatusId = targetColumn.id;
      } else {
        const targetTask = filteredTasks.find(t => t.id.toString() === over.id.toString());
        if (!targetTask) {
          setActiveTask(null);
          setActiveColumn(null);
          return;
        }
        newStatusId = targetTask.status.id;
      }
    }

    const currentTask = filteredTasks.find(t => t.id === taskId);
    if (!currentTask || currentTask.status.id === newStatusId) {
      setActiveTask(null);
      setActiveColumn(null);
      return;
    }

    const newStatus = statuses.find(s => s.id === newStatusId);
    const isMovingToCompleted = newStatus?.code === 'completed';

    if (isMovingToCompleted && Number(currentTask.actualHours) <= 0) {
      sonnerToast.error('Não é possível marcar a atividade como concluída sem lançar horas. Acesse "Lançar Horas" primeiro.');
      setActiveTask(null);
      setActiveColumn(null);
      return;
    }

    if (newStatus) {
      setLocalTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, status: newStatus, statusId: newStatusId }
            : task
        )
      );
    }

    try {
      await onTaskStatusChange(taskId, newStatusId);
    } catch (error) {
      console.error('Erro ao atualizar status da tarefa:', error);
      setLocalTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, status: currentTask.status, statusId: currentTask.status.id }
            : task
        )
      );
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status da tarefa. Tente novamente.",
        variant: "destructive",
      });
    }

    setActiveTask(null);
    setActiveColumn(null);
  };

  const handleStatusCreated = async () => {
    await refreshStatuses();
  };

  const handleTaskClick = (task: Task) => {
    setTaskDetailsModal({ isOpen: true, task });
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setLocalTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      )
    );

    setTaskDetailsModal(prev => ({
      ...prev,
      task: updatedTask
    }));

    if (onTaskUpdate) {
      onTaskUpdate(updatedTask);
    }
  };


  const handleDelete = (statusId: number) => {
    const status = statuses.find(s => s.id === statusId);
    if (status) {
      const tasksWithStatus = filteredTasks.filter(task => task.status.id === statusId);
      if (tasksWithStatus.length > 0) {
        toast({
          title: "Não é possível excluir",
          description: `O status "${status.name}" possui ${tasksWithStatus.length} tarefa(s). Mova as tarefas para outro status antes de excluir.`,
          variant: "destructive",
        });
        return;
      }
      setDeleteStatusModal({ isOpen: true, status });
    }
  };

  const handleEdit = (status: TaskStatusEntity) => {
    setEditStatusModal({ isOpen: true, status });
  };

  const handleEditStatusUpdated = async () => {
    await refreshStatuses();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteStatusModal.status) return;

    setIsUpdating(true);
    try {
      const result = await deleteStatus(deleteStatusModal.status.id);
      if (result.success) {
        toast({
          title: "Status excluído",
          description: result.message,
          variant: "default",
        });
        setDeleteStatusModal({ isOpen: false, status: null });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Não foi possível excluir o status. Tente novamente.';

      toast({
        title: "Erro ao excluir status",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!columns.length) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold mb-2 text-gray-700">Nenhum status configurado</h3>
        <p className="text-gray-500">Configure os status das tarefas para usar o Kanban.</p>
      </div>
    );
  }

  if (filteredTasks.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold mb-2 text-gray-700">Nenhuma tarefa em Sprint ativa</h3>
        <p className="text-gray-500">O Kanban exibe apenas tarefas de Sprints com status "Em andamento".</p>
        <p className="text-sm text-gray-400 mt-2">
          Certifique-se de que há Sprints ativas e tarefas atribuídas a elas.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        {activeSprint && (
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full px-4"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {activeSprint.name}
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-lg">{activeSprint.name}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Início:</span>
                    <span>{formatSprintDate(activeSprint.expectDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarX className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Término:</span>
                    <span>{formatSprintDate(activeSprint.expectEndDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Total de atividades:</span>
                    <span className="font-semibold text-blue-600">{filteredTasks.length}</span>
                  </div>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        )}

        <Button
          onClick={() => setIsCreateStatusModalOpen(true)}
          className="flex items-center gap-2 rounded-full"
          variant="outline"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Status</span>
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={columns.map(col => `column-${col.id}`)} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)]">
            {columns.map((column) => (
              <div key={column.id}>
                <SortableContext items={column.tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                  <KanbanColumnComponent
                    column={column}
                    onStatusDelete={handleDelete}
                    onStatusEdit={handleEdit}
                    onTaskClick={handleTaskClick}
                  />
                </SortableContext>
              </div>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeTask && (
            <TaskCard
              key={`overlay-${activeTask.id}-${activeTask.actualHours}-${activeTask.estimatedHours}`}
              task={activeTask}
              onTaskClick={handleTaskClick}
            />
          )}
          {activeColumn && (
            <KanbanColumnComponent
              key={`overlay-column-${activeColumn.id}`}
              column={activeColumn}
              onStatusDelete={() => {}}
              onStatusEdit={() => {}}
              onTaskClick={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>

      <CreateTaskStatusModal
        isOpen={isCreateStatusModalOpen}
        onClose={() => setIsCreateStatusModalOpen(false)}
        onStatusCreated={handleStatusCreated}
        projectId={projectId}
      />

      <DeleteStatusModal
        isOpen={deleteStatusModal.isOpen}
        status={deleteStatusModal.status}
        onClose={() => setDeleteStatusModal({ isOpen: false, status: null })}
        onConfirm={handleDeleteConfirm}
        isLoading={isUpdating}
      />

      <TaskDetailsModal
        isOpen={taskDetailsModal.isOpen}
        task={taskDetailsModal.task}
        onClose={() => setTaskDetailsModal({ isOpen: false, task: null })}
        onUpdateTask={handleTaskUpdate}
      />

      <EditTaskStatusModal
        isOpen={editStatusModal.isOpen}
        status={editStatusModal.status}
        onClose={() => setEditStatusModal({ isOpen: false, status: null })}
        onStatusUpdated={handleEditStatusUpdated}
        projectId={projectId}
      />
    </>
  );
};

export default KanbanBoard;
