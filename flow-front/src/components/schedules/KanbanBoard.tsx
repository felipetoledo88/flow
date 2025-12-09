import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Task, TaskStatusEntity } from '@/types/schedule';
import { useTaskStatus } from '@/hooks/use-task-status';
import { TaskStatusService } from '@/services/api/task-status.service';
import { Clock, CheckCircle2, AlertTriangle, PlayCircle, User, Calendar, Plus, GripVertical, AlertCircle, CalendarX } from 'lucide-react';
import CreateTaskStatusModal from './CreateTaskStatusModal';
import StatusOptionsMenu from './StatusOptionsMenu';
import DeleteStatusModal from './DeleteStatusModal';
import TaskDetailsModal from './TaskDetailsModal';
import { toast } from '@/hooks/use-toast';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  closestCorners,
  DragOverEvent,
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
    return 'bg-blue-500';
  };

  const getProgressPercentage = () => {
    const actualHours = Number(task.actualHours) || 0;
    const estimatedHours = Number(task.estimatedHours) || 0;
    
    if (estimatedHours === 0) return 0;
    return Math.min((actualHours / estimatedHours) * 100, 100);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent click during drag
    if (isDragging) return;
    e.stopPropagation();
    onTaskClick(task);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-sm font-medium text-gray-900 flex-1 line-clamp-2">
          {task.title}
        </h4>
        <Badge variant="outline" className="text-xs shrink-0">
          #{task.id}
        </Badge>
      </div>

      {/* Barra de progresso das horas */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{task.actualHours}h / {task.estimatedHours}h</span>
            {Number(task.actualHours) > Number(task.estimatedHours) && (
              <AlertCircle className="h-3 w-3 text-orange-500" />
            )}
          </div>
          <span>{Math.round(getProgressPercentage())}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${getProgressColor()}`}
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Calendar className="h-3 w-3" />
          <span>{formatDate(task.startDate)} - {formatDate(task.endDate)}</span>
        </div>

        <div className="flex items-center gap-2">
          {task.assignee && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600 max-w-[80px] truncate">
                {task.assignee.name}
              </span>
            </div>
          )}
        </div>
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
  onTaskClick: (task: Task) => void;
}> = ({ column, onStatusDelete, onTaskClick }) => {
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
    <Card 
      ref={setNodeRef}
      style={style}
      className={`${column.bgColor} border-0 h-full w-80 flex-shrink-0 flex flex-col transition-all duration-200 ${
        isOver ? 'ring-2 ring-blue-500 ring-opacity-50 shadow-lg' : ''
      } ${isDragging ? 'z-50 shadow-2xl scale-105' : ''}`}
    >
      <CardHeader 
        className="pb-3 cursor-move" 
        {...attributes} 
        {...listeners}
      >
        <CardTitle className={`text-sm font-medium ${column.textColor} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 cursor-move text-gray-400 hover:text-gray-600" />
            {column.name}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-white/70">
              {column.tasks.length}
            </Badge>
            <StatusOptionsMenu
              status={column.status}
              onDelete={onStatusDelete}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex-1 overflow-hidden">
        <div className="space-y-3 h-full overflow-y-auto pr-2">
          {column.tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">
                Nenhuma tarefa neste status
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
      </CardContent>
    </Card>
  );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, projectId, onTaskStatusChange, onTaskUpdate }) => {
  const { statuses, isLoading, refreshStatuses, deleteStatus } = useTaskStatus(projectId);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks || []);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<KanbanColumn | null>(null);
  const [isCreateStatusModalOpen, setIsCreateStatusModalOpen] = useState(false);
  const [deleteStatusModal, setDeleteStatusModal] = useState<{ isOpen: boolean; status: TaskStatusEntity | null }>({ isOpen: false, status: null });
  const [isUpdating, setIsUpdating] = useState(false);
  const [taskDetailsModal, setTaskDetailsModal] = useState<{ isOpen: boolean; task: Task | null }>({ isOpen: false, task: null });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Menor distância para ativação mais responsiva
      },
    })
  );

  const getStatusStyle = (status: TaskStatusEntity, index: number) => {
    const colorVariants = [
      {
        icon: <PlayCircle className="h-5 w-5" />,
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200'
      },
      {
        icon: <Clock className="h-5 w-5" />,
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200'
      },
      {
        icon: <AlertTriangle className="h-5 w-5" />,
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200'
      },
      {
        icon: <CheckCircle2 className="h-5 w-5" />,
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200'
      },
      {
        icon: <User className="h-5 w-5" />,
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-700',
        borderColor: 'border-purple-200'
      },
      {
        icon: <Calendar className="h-5 w-5" />,
        bgColor: 'bg-indigo-50',
        textColor: 'text-indigo-700',
        borderColor: 'border-indigo-200'
      }
    ];
    
    const knownStatusMappings: Record<string, number> = {
      'todo': 0,
      'in_progress': 1,
      'blocked': 2,
      'completed': 3
    };
    
    const variantIndex = knownStatusMappings[status.code] !== undefined 
      ? knownStatusMappings[status.code] 
      : (index % colorVariants.length);

    return colorVariants[variantIndex];
  };

  // Sincronizar localTasks com as props tasks
  React.useEffect(() => {
    if (tasks) {
      setLocalTasks(tasks);
    }
  }, [tasks]);

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
    
    // Ordena os status pela coluna 'order' do banco de dados
    const sortedStatuses = statuses.sort((a, b) => {
      // Se ambos têm valor de order, ordena por order
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // Se apenas um tem order, ele vem primeiro
      if (a.order !== undefined && b.order === undefined) return -1;
      if (a.order === undefined && b.order !== undefined) return 1;
      // Se nenhum tem order, ordena por ID como fallback
      return a.id - b.id;
    });

    return sortedStatuses.map((status, index) => {
      const style = getStatusStyle(status, index);
      const statusTasks = filteredTasks.filter(task => task.status.id === status.id);
      return {
        id: status.id,
        code: status.code,
        name: status.name,
        tasks: statusTasks,
        status: status,
        ...style,
      };
    });
  }, [statuses, filteredTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    
    if (active.id.toString().startsWith('column-')) {
      // Está arrastando uma coluna
      const columnId = parseInt(active.id.toString().replace('column-', ''));
      const column = columns.find(col => col.id === columnId);
      setActiveColumn(column || null);
      setActiveTask(null);
    } else {
      // Está arrastando uma tarefa
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

    // Verifica se está movendo uma coluna
    if (active.id.toString().startsWith('column-')) {
      const activeColumnId = parseInt(active.id.toString().replace('column-', ''));
      
      let overColumnId: number | null = null;
      
      // Verifica se foi dropado diretamente em uma coluna
      if (over.id.toString().startsWith('column-')) {
        overColumnId = parseInt(over.id.toString().replace('column-', ''));
      } else {
        // Foi dropado em uma tarefa - encontrar a coluna pai da tarefa
        const targetTask = filteredTasks.find(t => t.id.toString() === over.id.toString());
        if (targetTask) {
          overColumnId = targetTask.status.id;
        } else {
          // Tentar encontrar a coluna pelo ID direto
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

    // Lógica existente para mover tarefas
    const taskId = active.id as number;
    let newStatusId: number;
    
    // Verifica se foi dropado em uma coluna (status)
    if (over.id.toString().startsWith('column-')) {
      const columnId = parseInt(over.id.toString().replace('column-', ''));
      newStatusId = columnId;
    } else {
      const targetColumn = columns.find(col => col.id.toString() === over.id.toString());
      if (targetColumn) {
        // Dropado diretamente na coluna
        newStatusId = targetColumn.id;
      } else {
        // Dropado em uma tarefa - pega o status da tarefa alvo
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

    try {
      await onTaskStatusChange(taskId, newStatusId);
    } catch (error) {
      console.error('Erro ao atualizar status da tarefa:', error);
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
    // Atualizar o estado local das tarefas
    setLocalTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    );
    
    // Atualizar o modal com a tarefa atualizada
    setTaskDetailsModal(prev => ({
      ...prev,
      task: updatedTask
    }));
    
    // Notificar o componente pai
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
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600">Carregando status das tarefas...</p>
        </div>
      </div>
    );
  }

  if (!columns.length) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold mb-2">Nenhum status configurado</h3>
        <p className="text-gray-600">Configure os status das tarefas para usar o Kanban.</p>
      </div>
    );
  }

  // Verifica se há tarefas em Sprints "Em andamento"
  if (filteredTasks.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa em Sprint ativa</h3>
        <p className="text-gray-600">O Kanban exibe apenas tarefas de Sprints com status "Em andamento".</p>
        <p className="text-sm text-gray-500 mt-2">
          Certifique-se de que há Sprints ativas e tarefas atribuídas a elas.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 flex justify-between items-center">
        {activeSprint && (
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
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
          className="flex items-center gap-2"
          variant="outline"
          size="sm"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={columns.map(col => `column-${col.id}`)} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-6 overflow-x-auto h-[calc(100vh-300px)]">
            {columns.map((column) => (
              <div key={column.id}>
                <SortableContext items={column.tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                  <KanbanColumnComponent 
                    column={column} 
                    onStatusDelete={handleDelete}
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
    </>
  );
};

export default KanbanBoard;