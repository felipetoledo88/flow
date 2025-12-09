import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { NewLoader } from '@/components/ui/new-loader';
import TaskFormModal from '@/components/schedules/TaskFormModal';
import EditProjectModal from '@/components/projects/EditProjectModal';
import UpdateTaskHoursModal from '@/components/schedules/UpdateTaskHoursModal';
import ScheduleFormModal from '@/components/schedules/ScheduleFormModal';
import SprintFormModal from '@/components/sprints/SprintFormModal';
import TaskImportModal from '@/components/schedules/TaskImportModal';
import KanbanBoard from '@/components/schedules/KanbanBoard';
import { SchedulesService } from '@/services/api/schedules.service';
import { ProjectsService } from '@/services/api/projects.service';
import { SprintsService, Sprint, StatusSprint } from '@/services/api/sprints.service';
import { Schedule, Task as ScheduleTask, UpdateTaskDto as UpdateScheduleTaskDto, TaskStatusCode, ScheduleStatus } from '@/types/schedule';
import { useTaskStatus } from '@/hooks';
import { AuthService } from '@/services/api/auth.service';
import { User } from '@/types/auth';
import {
  Calendar,
  Plus,
  ArrowLeft,
  MoreVertical,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  BarChart3,
  List,
  Kanban,
  Upload,
  Check,
  ChevronsUpDown,
  RefreshCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { FastReorderProvider } from '@/components/ui/fast-reorder';
import { FastTaskTable } from '@/components/schedules/FastTaskTable';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardMetrics from '@/components/dashboard/DashboardMetrics';
import DashboardVelocityChart from '@/components/dashboard/DashboardVelocityChart';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardCalculations } from '@/hooks/useDashboardCalculations';
import { useProjectStore } from '@/stores/project/project.store';

const ScheduleDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const { statuses, getStatusId } = useTaskStatus(schedule?.project?.id);
  const [loading, setLoading] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduleTask | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<ScheduleTask | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isBacklogCardCollapsed, setIsBacklogCardCollapsed] = useState(true);
  const [actualExpectedEndDate, setActualExpectedEndDate] = useState<Date | null>(null);
  
  // Calcula a data fim prevista atual em tempo real
  const calculatedActualExpectedEndDate = useMemo(() => {
    if (!schedule?.tasks) return null;
    const activeTasks = schedule.tasks.filter(t => !t.isBacklog && t.endDate);
    if (activeTasks.length === 0) return null;
    
    const latestEndDate = activeTasks.reduce((latest, task) => {
      const taskEndDate = new Date(task.endDate);
      return taskEndDate > latest ? taskEndDate : latest;
    }, new Date(activeTasks[0].endDate));
    
    return latestEndDate;
  }, [schedule?.tasks?.map(t => `${t.id}-${t.endDate}-${t.isBacklog}`).join(',')]);
  
  const [collapsedSprints, setCollapsedSprints] = useState<Set<number>>(new Set());
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [statusSprints, setStatusSprints] = useState<StatusSprint[]>([]);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [isUpdatingTasks, setIsUpdatingTasks] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [openAssigneeCombo, setOpenAssigneeCombo] = useState(false);
  const { setSelectedProject, setShowAllProjects } = useProjectStore();
  const [sprintFilter, setSprintFilter] = useState<string>('all');


  const [transferTasksModal, setTransferTasksModal] = useState<{ isOpen: boolean; sprintId: number; sprintName: string; nextSprintName: string; incompleteTasksCount: number; statusSprintId: number; }>({
    isOpen: false,
    sprintId: 0,
    sprintName: '',
    nextSprintName: '',
    incompleteTasksCount: 0,
    statusSprintId: 0,
  });

  const [confirmationDialog, setConfirmationDialog] = useState<{ isOpen: boolean; title: string; description: string; onConfirm: () => void; }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });
  const {
    dashboardData,
    projectInfo,
    loading: dashboardLoading,
    refreshDashboard,
  } = useDashboardData();

    // Encontrar os dados da sprint selecionada
  const selectedSprintData = useMemo(() => {
    if (sprintFilter && sprintFilter !== 'all') {
      return sprints.find(sprint => sprint.name === sprintFilter);
    }
    return null;
  }, [sprintFilter, sprints]);

  const { metrics, velocityData } = useDashboardCalculations(
    dashboardData, 
    projectInfo, 
    sprintFilter,
    selectedSprintData ? { expectDate: selectedSprintData.expectDate, expectEndDate: selectedSprintData.expectEndDate } : undefined
  );

  const currentPath = location.pathname;

  useEffect(() => {
    const handleProjectDatesUpdated = async (event: any) => {
      const { projectId } = event.detail;

      if (schedule?.project?.id.toString() === projectId.toString()) {
        try {
          await SchedulesService.forceRecalculateSchedule(schedule.project.id);

          setTimeout(() => {
            loadScheduleData(true);
          }, 1000);
          
        } catch (error) {
          console.error('Erro ao sincronizar atividades na tela:', error);
          setTimeout(() => {
            loadScheduleData(true);
          }, 1000);
        }
      }
    };

    window.addEventListener('projectDatesUpdated', handleProjectDatesUpdated);
    return () => {
      window.removeEventListener('projectDatesUpdated', handleProjectDatesUpdated);
    };
  }, [schedule?.project?.id]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      const timeoutId = setTimeout(async () => {
        await refreshDashboard();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [activeTab, refreshDashboard]);

  // Inicializa a data fim prevista atual quando o schedule é carregado
  useEffect(() => {
    if (schedule?.tasks && schedule.tasks.length > 0) {
      const activeTasks = schedule.tasks.filter(t => !t.isBacklog && t.endDate);
      if (activeTasks.length > 0) {
        const latestEndDate = activeTasks.reduce((latest, task) => {
          const taskEndDate = new Date(task.endDate);
          return taskEndDate > latest ? taskEndDate : latest;
        }, new Date(activeTasks[0].endDate));
        setActualExpectedEndDate(latestEndDate);
      }
    }
  }, [schedule?.id, schedule?.tasks?.length]);

  // Monitora mudanças no valor calculado
  useEffect(() => {
    if (!calculatedActualExpectedEndDate || !schedule?.id) return;
    const dateString = calculatedActualExpectedEndDate.toISOString().split("T")[0];
    const sync = async () => {
      await ProjectsService.updateProject(schedule.id, {
        actualExpectedEndDate: dateString
      });
      await refreshDashboard();

      setSchedule(prev => ({
        ...prev!,
        project: {
          ...prev!.project!,
          actualExpectedEndDate: dateString
        }
      }));
    };
    sync();
  }, [calculatedActualExpectedEndDate, schedule?.id]);


  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const loadScheduleData = async (showLoading = true) => {
    if (!id) return;

    try {
      if (showLoading) {
        setLoading(true);
      }
      const isProjectRoute = location.pathname.includes('/projects/');
      let scheduleData;

      if (isProjectRoute) {
        scheduleData = await ProjectsService.getProjectAsSchedule(id);
      } else {
        const schedule = await SchedulesService.getSchedule(parseInt(id));
        if (schedule?.projectId) {
          scheduleData = await ProjectsService.getProjectAsSchedule(schedule.projectId.toString());
        } else {
          throw new Error('Cronograma não está associado a um projeto');
        }
      }
      setSchedule(scheduleData);
      if (scheduleData.project) {
        setSelectedProject({
          id: scheduleData.project.id.toString(),
          name: scheduleData.project.name,
          description: scheduleData.project.description || ''
        });
        setShowAllProjects(false);
      }
      const backlogTasksFromAPI = (scheduleData.tasks || []).filter(task => task.isBacklog);
      setBacklogTasks();
      if (scheduleData.project?.id) {
        await loadSprints(scheduleData.project.id);
      }
    } catch (error: any) {
      toast.error(`Erro ao carregar cronograma: ${error.message}`);
      const isProjectRoute = location.pathname.includes('/projects/');
      if (isProjectRoute) {
        navigate('/projects');
      } else {
        navigate('/schedules');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const loadSprints = async (projectId: number) => {
    try {
      const projectSprints = await SprintsService.getSprints(projectId);
      setSprints(projectSprints);
    } catch (error: any) {
      toast.error('Erro ao carregar sprints');
    }
  };

  const loadStatusSprints = async () => {
    try {
      const statusSprintsData = await SprintsService.getStatusSprints();
      setStatusSprints(statusSprintsData);
    } catch (error: any) {
      toast.error('Erro ao carregar status de sprints');
    }
  };

  const refreshTasksOnly = async () => {
    if (!id || !schedule) return;

    try {
      setIsUpdatingTasks(true);
      const updatedTasks = await SchedulesService.getTasksOnly(parseInt(id));
      const updatedSchedule = {
        ...schedule,
        tasks: updatedTasks
      };
      
      setSchedule(updatedSchedule);
      const backlogTasksFromAPI = updatedTasks.filter(task => task.isBacklog);
      setBacklogTasks();
      await refreshDashboard();
    } catch (error) {
      await loadScheduleData(false);
    } finally {
      setIsUpdatingTasks(false);
    }
  };

  useEffect(() => {
    const authData = AuthService.getAuthData();
    if (authData.user) {
      setCurrentUser(authData.user);
    }
  }, []);

  useEffect(() => {
    loadScheduleData();
    loadStatusSprints();
  }, [id]);

  const canEditSchedule = () => {
    return currentUser && !['user', 'client', 'qa'].includes(currentUser.role);
  };

  const toggleBacklogCard = () => {
    setIsBacklogCardCollapsed(!isBacklogCardCollapsed);
  };

  const toggleSprintCard = (sprintId: number) => {
    const newCollapsedSprints = new Set(collapsedSprints);
    if (newCollapsedSprints.has(sprintId)) {
      newCollapsedSprints.delete(sprintId);
    } else {
      newCollapsedSprints.add(sprintId);
    }
    setCollapsedSprints(newCollapsedSprints);
  };

  const handleCreateSprint = () => {
    setSelectedSprint(null);
    setIsSprintModalOpen(true);
  };

  const handleEditSprint = (sprint: Sprint) => {
    setSelectedSprint(sprint);
    setIsSprintModalOpen(true);
  };

  const handleCompleteSprint = async (sprintId: number, statusSprintId: number) => {
    try {
      const currentSprint = sprints.find(s => s.id === sprintId);
      if (!currentSprint) return;
      const nextSprint = await SprintsService.getNextSprint(sprintId);
      
      if (!nextSprint) {
        await updateSprintStatusDirectly(sprintId, statusSprintId);
        return;
      }

      const currentSprintTasks = getSprintTasks(sprintId);
      const incompleteTasks = currentSprintTasks.filter(task => task.status.code !== 'completed');
      if (incompleteTasks.length === 0) {
        await updateSprintStatusDirectly(sprintId, statusSprintId);
        return;
      }

      setTransferTasksModal({
        isOpen: true,
        sprintId,
        sprintName: currentSprint.name,
        nextSprintName: nextSprint.name,
        incompleteTasksCount: incompleteTasks.length,
        statusSprintId,
      });
    } catch (error: any) {
      toast.error('Erro ao verificar próxima sprint');
    }
  };

  const handleConfirmTransferTasks = async () => {
    try {
      const { sprintId, statusSprintId } = transferTasksModal;
      const transferResult = await SprintsService.transferIncompleteTasksToNextSprint(sprintId);
      await updateSprintStatusDirectly(sprintId, statusSprintId);

      try {
        await SchedulesService.forceRecalculateSchedule(schedule?.project?.id || parseInt(id!));
      } catch (recalcError) {
        console.warn('Erro ao recalcular após transferência:', recalcError);
      }

      setTransferTasksModal(prev => ({ ...prev, isOpen: false }));
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshTasksOnly();
      
      toast.success(
        `Sprint concluída! ${transferResult.transferredCount} atividades transferidas para "${transferResult.nextSprintName}"`
      );
    } catch (error: any) {
      setTransferTasksModal(prev => ({ ...prev, isOpen: false })); 
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Erro desconhecido ao concluir sprint';
      toast.error(`Erro ao concluir sprint: ${errorMessage}`);
    }
  };

  const handleCancelTransferTasks = () => {
    setTransferTasksModal(prev => ({ ...prev, isOpen: false }));
    // Não atualiza o status da sprint, mantém o status anterior
  };

  const getSprintStatusBadgeColor = (statusName: string) => {
    switch (statusName) {
      case 'Em andamento':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Concluído':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleUpdateSprintStatus = async (sprintId: number, statusSprintId: number) => {
    try {
      const selectedStatus = statusSprints.find(status => status.id === statusSprintId);
      if (selectedStatus?.name === 'Concluído') {
        await handleCompleteSprint(sprintId, statusSprintId);
        return;
      }

      if (selectedStatus?.name === 'Em andamento') {
        const sprintsInProgress = sprints.filter(
          s => s.statusSprint?.name === 'Em andamento' && s.id !== sprintId
        );

        if (sprintsInProgress.length > 0) {
          toast.error(`Não é possível alterar o status para "Em andamento". O projeto já possui uma sprint em andamento: "${sprintsInProgress[0].name}"`);
          return;
        }
      }

      const updatedSprint = await SprintsService.updateSprintStatus(sprintId, statusSprintId);
      setSprints(currentSprints => 
        currentSprints.map(sprint => 
          sprint.id === sprintId 
            ? { ...sprint, statusSprintId: updatedSprint.statusSprintId, statusSprint: updatedSprint.statusSprint }
            : sprint
        )
      );

      if (schedule?.project?.id) {
        setTimeout(() => {
          loadSprints(schedule.project.id);
        }, 100);
      }
      toast.success('Status da sprint atualizado com sucesso!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao atualizar status da sprint';
      toast.error(errorMessage);
    }
  };

  const updateSprintStatusDirectly = async (sprintId: number, statusSprintId: number) => {
    const updatedSprint = await SprintsService.updateSprintStatus(sprintId, statusSprintId);
    const statusSprintName = statusSprints.find(s => s.id === statusSprintId)?.name;
    const isSprintCompleted = statusSprintName === 'Concluído';
    
    setSprints(currentSprints => 
      currentSprints.map(sprint => 
        sprint.id === sprintId 
          ? { ...sprint, statusSprintId: updatedSprint.statusSprintId, statusSprint: updatedSprint.statusSprint }
          : sprint
      )
    );

    if (isSprintCompleted) {
      try {
        const reorderResult = await SchedulesService.reorderTasksAfterSprintCompletion(sprintId);
        if (reorderResult.reorderedCount > 0) {
          await refreshTasksOnly();
          toast.success(`Sprint concluída! ${reorderResult.reorderedCount} atividades reordenadas (concluídas primeiro).`);
        } else {
          toast.success('Sprint marcada como concluída!');
        }
      } catch (reorderError) {
        console.warn('Erro ao reordenar após conclusão:', reorderError);
        toast.success('Sprint marcada como concluída!');
      }
    } else {
      toast.success('Status da sprint atualizado!');
    }
    
    if (schedule?.project?.id) {
      setTimeout(() => {
        loadSprints(schedule.project.id);
      }, 100);
    }
  };

  const handleDeleteSprint = async (sprint: Sprint) => {
    setConfirmationDialog({
      isOpen: true,
      title: 'Excluir Sprint',
      description: `Tem certeza que deseja excluir a sprint "${sprint.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        try {
          await SprintsService.deleteSprint(sprint.id);
          toast.success('Sprint excluída com sucesso!');
          if (schedule?.project?.id) {
            await loadSprints(schedule.project.id);
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Erro ao excluir sprint';
          toast.error(errorMessage);
        }
      },
    });
  };

  const onSprintSaved = () => {
    setIsSprintModalOpen(false);
    setSelectedSprint(null);
    if (schedule?.project?.id) {
      loadSprints(schedule.project.id);
    }
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: ScheduleTask) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleUpdateHours = (task: ScheduleTask) => {
    setSelectedTask(task);
    setIsHoursModalOpen(true);
  };

  const handleDeleteTask = (task: ScheduleTask) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      await SchedulesService.deleteTask(taskToDelete.id);
      toast.success('Atividade excluída com sucesso');
      await loadScheduleData(false);
      await refreshDashboard();
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao excluir atividade';
      toast.error(errorMessage);
    } finally {
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  const onTaskSaved = async (taskWasCompleted?: boolean, forceRecalculate?: boolean) => {
    setIsTaskModalOpen(false);
    setIsHoursModalOpen(false);
    const wasSelectedTask = selectedTask;
    setSelectedTask(null);
    try {
      if (taskWasCompleted || (wasSelectedTask && wasSelectedTask.status?.code === ScheduleStatus.COMPLETED) || forceRecalculate) {
        await SchedulesService.forceRecalculateSchedule(schedule?.project?.id || parseInt(id!));
        await loadScheduleData(false);
        if (forceRecalculate && !taskWasCompleted) {
          toast.success('Datas recalculadas automaticamente após alteração das horas estimadas');
        } else {
          toast.success('Datas recalculadas automaticamente após conclusão da atividade');
        }
      } else {
        await refreshTasksOnly();
      }
      await refreshDashboard();
    } catch (error) {
      toast.error('Erro ao atualizar dados');
    }
  };

  const handleEditProjectSaved = async (datesChanged?: boolean) => {
    setIsEditProjectModalOpen(false);
    loadScheduleData(true);
  };

  const handleUpdateAssignee = async (taskId: number, assigneeId: number) => {
    try {
      const updateData: UpdateScheduleTaskDto = {
        assigneeId: assigneeId
      };
      await SchedulesService.updateTask(taskId, updateData);
      toast.success('Responsável atualizado com sucesso');
      await refreshTasksOnly();
    } catch (error: any) {
      toast.error('Erro ao atualizar responsável');
    }
  };

  const handleUpdateStatus = async (taskId: number, statusId: number) => {
    const completedStatusId = getStatusId(TaskStatusCode.COMPLETED);
    const currentTask = [...(schedule?.tasks || [])].find(t => t.id === taskId);
    const wasCompleted = currentTask && currentTask.statusId === completedStatusId;
    const isBeingCompleted = completedStatusId && statusId === completedStatusId;

    if (isBeingCompleted) {
      if (currentTask && Number(currentTask.actualHours) <= 0) {
        toast.error('Não é possível marcar a atividade como concluída sem lançar horas. Acesse "Lançar Horas" primeiro.');
        return;
      }
    }
    try {
      const updateData: UpdateScheduleTaskDto = {
        statusId: statusId
      };
      await SchedulesService.updateTask(taskId, updateData);
      const needsRecalculation = isBeingCompleted || wasCompleted;
      if (needsRecalculation) {
        await SchedulesService.forceRecalculateSchedule(schedule?.project?.id || parseInt(id!));
        await loadScheduleData(false);
        if (wasCompleted && !isBeingCompleted) {
          toast.success('Status atualizado e cronograma recalculado após alterar atividade concluída');
        } else if (isBeingCompleted) {
          toast.success('Status atualizado e cronograma recalculado automaticamente');
        }
      } else {
        if (schedule) {
          const updatedSchedule = { ...schedule };
          const taskToUpdate = updatedSchedule.tasks?.find(t => t.id === taskId);
          if (taskToUpdate) {
            taskToUpdate.statusId = statusId;
          }
          setSchedule(updatedSchedule);
        }
      }
    } catch (error: any) {
      toast.error(`Erro ao atualizar status: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleTaskUpdate = (updatedTask: ScheduleTask) => {
    if (schedule) {
      const updatedSchedule = { ...schedule };
      if (updatedSchedule.tasks) {
        const taskIndex = updatedSchedule.tasks.findIndex(t => t.id === updatedTask.id);
        if (taskIndex !== -1) {
          updatedSchedule.tasks[taskIndex] = updatedTask;
          setSchedule(updatedSchedule);
        }
      }
      updateActualExpectedEndDate();
    }
  };

  const onScheduleSaved = () => {
    setIsScheduleModalOpen(false);
    loadScheduleData();
  };

  const handleSprintChange = async (taskId: number, sprintId: number | null, moveToBacklog: boolean) => {
    try {
      if (moveToBacklog) {
        const task = getAllTasks().find(t => t.id === taskId);
        const originalActualHours = task?.actualHours;
        const originalEstimatedHours = task?.estimatedHours;

        if (task?.sprintId) {
          await SchedulesService.updateTaskSprint(taskId, null);
        }
        const updatedTask = await SchedulesService.updateTaskBacklogStatus(taskId, true);
        
        // Verificar se as horas foram resetadas pelo backend e corrigi-las
        if ((updatedTask.actualHours === 0 || updatedTask.actualHours === 0 || updatedTask.actualHours === 0.00) && originalActualHours && Number(originalActualHours) > 0) {
          try {
            await SchedulesService.updateTask(taskId, {
              actualHours: Number(originalActualHours),
              estimatedHours: originalEstimatedHours ? Number(originalEstimatedHours) : undefined
            });
          } catch (restoreError) {
            console.error(`[DEBUG] Erro ao restaurar horas:`, restoreError);
          }
        }
        
        toast.success('Atividade movida para o backlog!');
      } else if (sprintId !== null) {
        const task = getAllTasks().find(t => t.id === taskId);
        if (task?.isBacklog) {
          await SchedulesService.updateTaskBacklogStatus(taskId, false);
        }
        await SchedulesService.updateTaskSprint(taskId, sprintId);
        const sprint = sprints.find(s => s.id === sprintId);
        toast.success(`Atividade movida para a sprint "${sprint?.name}"!`);
      }
      await refreshTasksOnly();
      
      // Debug: Log das horas depois da operação
      if (moveToBacklog) {
        const taskAfter = getAllTasks().find(t => t.id === taskId);
      }
    } catch (error: any) {
      toast.error('Erro ao alterar sprint da atividade');
    }
  };

  const getStatusBadge = (status: ScheduleTask['status']) => {
    const variants: Record<string, { color: string }> = {
      todo: { color: 'bg-gray-100 text-gray-800' },
      in_progress: { color: 'bg-blue-100 text-blue-800' },
      blocked: { color: 'bg-red-100 text-red-800' },
      completed: { color: 'bg-green-100 text-green-800' },
    };
    const config = variants[status.code] || variants.todo;
    return (
      <Badge className={config.color}>{status.name}</Badge>
    );
  };

  const getStatusColors = (status: ScheduleTask['status']) => {
    const variants: Record<string, { bg: string; text: string; border: string }> = {
      todo: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
      blocked: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    };
    return variants[status.code] || variants.todo;
  };

  const getTeamMembers = () => {
    if (!schedule?.team?.members) return [];
    return schedule.team.members
      .filter(m => m.user)
      .map(m => ({
        id: m.userId.toString(),
        name: m.user.name,
        email: m.user.email,
      }));
  };

  const applyFilters = (tasks: ScheduleTask[]) => {
    let filteredTasks = tasks;

    if (selectedAssignees.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        selectedAssignees.includes(task.assigneeId?.toString() || '')
      );
    }

    if (selectedStatus !== 'all') {
      filteredTasks = filteredTasks.filter(task => 
        task.statusId?.toString() === selectedStatus
      );
    }
    
    return filteredTasks;
  };

  const getSprintTasks = (sprintId: number) => {
    if (!schedule?.tasks) return [];
    const sprintTasks = schedule.tasks.filter(task => task.sprintId === sprintId && !task.isBacklog);
    return applyFilters(sprintTasks);
  };

  const getFilteredBacklogTasks = () => {
    if (!schedule?.tasks) return [];
    const backlogTasks = schedule.tasks.filter(task => task.isBacklog);
    return applyFilters(backlogTasks);
  };

  const getFilteredAllTasks = () => {
    if (!schedule?.tasks) return [];
    return applyFilters(schedule.tasks);
  };

  const getAllTasks = (): ScheduleTask[] => {
    return schedule?.tasks || [];
  };

  const setBacklogTasks = (): ScheduleTask[] => {
    if (!schedule?.tasks) return [];
    return schedule.tasks.filter(task => task.isBacklog);
  };

  const getSelectedAssigneesText = () => {
    if (selectedAssignees.length === 0) return 'Todos os Responsáveis';
    if (selectedAssignees.length === 1) {
      const member = getTeamMembers().find(m => m.id === selectedAssignees[0]);
      return member?.name || 'Todos os Responsáveis';
    }
    return `${selectedAssignees.length} responsáveis selecionados`;
  };

  const toggleAssignee = (assigneeId: string) => {
    if (assigneeId === 'all') {
      setSelectedAssignees([]);
      return;
    }
    
    setSelectedAssignees(prev => {
      if (prev.includes(assigneeId)) {
        return prev.filter(id => id !== assigneeId);
      } else {
        return [...prev, assigneeId];
      }
    });
  };

  const calculateProgress = (task: ScheduleTask) => {
    const estimated = Number(task.estimatedHours);
    const actual = Number(task.actualHours);
    if (estimated === 0) return 0;
    return Math.min(Math.round((actual / estimated) * 100), 100);
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  };

  const calculateActualExpectedEndDate = () => {
    if (!schedule?.tasks) return null;
    const activeTasks = schedule.tasks.filter(t => !t.isBacklog && t.endDate);
    if (activeTasks.length === 0) return null;
    const latestEndDate = activeTasks.reduce((latest, task) => {
      const taskEndDate = new Date(task.endDate);
      return taskEndDate > latest ? taskEndDate : latest;
    }, new Date(activeTasks[0].endDate));
    return latestEndDate.toISOString().split('T')[0];
  };

  const updateActualExpectedEndDate = async () => {
    if (!schedule?.id) return;
    
    try {
      const actualExpectedEndDate = calculateActualExpectedEndDate();
      if (!actualExpectedEndDate) return;
      
      await ProjectsService.updateProject(schedule.id, {
        actualExpectedEndDate
      });

      await refreshDashboard();
    } catch (error) {
      console.error('Erro ao atualizar data fim prevista atual:', error);
    }
  };

  const handleRecalculateAssignee = async () => {
    try {
      setLoading(true);
      const assigneeIds = new Set<number>();
      schedule?.tasks?.forEach(task => {
        if (task.assigneeId && !task.isBacklog) {
          assigneeIds.add(task.assigneeId);
        }
      });
      const projectId = schedule?.project?.id || parseInt(id!);
      for (const assigneeId of assigneeIds) {
        await SchedulesService.recalculateAssigneeOrder(projectId, assigneeId);
      }
      
      await loadScheduleData(false);
      await refreshDashboard();
      toast.success(`Order recalculado para ${assigneeIds.size} responsável(is) com sucesso`);
    } catch (error: any) {
      toast.error('Erro ao recalcular order das atividades');
    } finally {
      setLoading(false);
    }
  };

  const handleFastReorder = async (sourceId: string, targetId: string, insertPosition: 'before' | 'after') => {
    try {
      const sourceTask = getAllTasks().find(t => t.id.toString() === sourceId);
      const targetTask = getAllTasks().find(t => t.id.toString() === targetId);
      if (!sourceTask || !targetTask) {
        return;
      }

      const isSourceInBacklog = sourceTask.isBacklog;
      const isTargetInBacklog = targetTask.isBacklog;
      
      if (isSourceInBacklog && isTargetInBacklog) {
        const sortedBacklog = setBacklogTasks().sort((a, b) => a.order - b.order);
        const sourceIndex = sortedBacklog.findIndex(t => t.id.toString() === sourceId);
        const targetIndex = sortedBacklog.findIndex(t => t.id.toString() === targetId);
        if (sourceIndex === -1 || targetIndex === -1) return;
        const newIndex = insertPosition === 'before' ? targetIndex : targetIndex + 1;
        const reorderedTasks = [...sortedBacklog];
        const [movedTask] = reorderedTasks.splice(sourceIndex, 1);
        reorderedTasks.splice(newIndex > sourceIndex ? newIndex - 1 : newIndex, 0, movedTask);
        const reorderData = reorderedTasks.map((task, index) => ({
          taskId: task.id,
          newOrder: index
        }));
        
        await SchedulesService.reorderTasks(parseInt(id!), reorderData);
        await refreshTasksOnly();
        toast.success('Ordem das atividades no backlog atualizada!');
      } else if (!isSourceInBacklog && !isTargetInBacklog && sourceTask.sprintId === targetTask.sprintId) {
        const sprintTasks = [...(schedule?.tasks || [])].filter(t => 
          t.sprintId === sourceTask.sprintId && !t.isBacklog
        ).sort((a, b) => a.order - b.order);
        
        const sourceSprintIndex = sprintTasks.findIndex(t => t.id.toString() === sourceId);
        const targetSprintIndex = sprintTasks.findIndex(t => t.id.toString() === targetId);
        
        if (sourceSprintIndex === -1 || targetSprintIndex === -1) return;
        
        const newSprintIndex = insertPosition === 'before' ? targetSprintIndex : targetSprintIndex + 1;
        const reorderedSprintTasks = [...sprintTasks];
        const [movedTask] = reorderedSprintTasks.splice(sourceSprintIndex, 1);
        reorderedSprintTasks.splice(newSprintIndex > sourceSprintIndex ? newSprintIndex - 1 : newSprintIndex, 0, movedTask);
        
        // Recalcular apenas a ordem dentro da sprint, preservando a ordem global existente
        const reorderData = reorderedSprintTasks.map((task, sprintIndex) => {
          // Encontrar a menor ordem global disponível para esta sprint
          const baseOrder = Math.min(...sprintTasks.map(t => t.order));
          return {
            taskId: task.id,
            newOrder: baseOrder + sprintIndex
          };
        });
        
        if (schedule) {
          const updatedSchedule = { ...schedule };
          reorderData.forEach(({ taskId, newOrder }) => {
            const taskToUpdate = updatedSchedule.tasks?.find(t => t.id === taskId);
            if (taskToUpdate) {
              taskToUpdate.order = newOrder;
            }
          });
          setSchedule(updatedSchedule);
        }
        
        await SchedulesService.reorderTasks(parseInt(id!), reorderData);
        await refreshTasksOnly();
        const sprint = sprints.find(s => s.id === sourceTask.sprintId);
        toast.success(`Ordem das atividades na sprint "${sprint?.name}" atualizada!`);
        
      } else {
        const sourceContainerId = isSourceInBacklog ? 'backlog' : `sprint-${sourceTask.sprintId}`;
        const targetContainerId = isTargetInBacklog ? 'backlog' : `sprint-${targetTask.sprintId}`;
        if (sourceContainerId !== targetContainerId) {
          await handleFastMove(sourceTask.id, targetContainerId);
        }
      }
    } catch (error) {
      toast.error('Erro ao reorganizar atividades. Tente novamente.');
      await refreshTasksOnly();
    }
  };

  const handleFastMove = async (taskId: number, targetContainerId: string) => {
    try {
      const task = getAllTasks().find(t => t.id === taskId);
      if (!task) {
        return;
      }
      if (targetContainerId === 'backlog') {
        const originalActualHours = task.actualHours;
        const originalEstimatedHours = task.estimatedHours;
        
        if (task.sprintId) {
          const sprint = sprints.find(s => s.id === task.sprintId);
          await SchedulesService.updateTaskSprint(taskId, null);
          const updatedTask = await SchedulesService.updateTaskBacklogStatus(taskId, true);

          if ((updatedTask.actualHours === 0 || updatedTask.actualHours === 0 || updatedTask.actualHours === 0.00) && originalActualHours && Number(originalActualHours) > 0) {
            try {
              await SchedulesService.updateTask(taskId, {
                actualHours: Number(originalActualHours),
                estimatedHours: originalEstimatedHours ? Number(originalEstimatedHours) : undefined
              });
            } catch (restoreError) {
              console.error(`[DEBUG] Drag&Drop - Erro ao restaurar horas:`, restoreError);
            }
          }
          
          toast.success(`Atividade removida da sprint "${sprint?.name}" e movida para o backlog!`);
        } else {
          const updatedTask = await SchedulesService.updateTaskBacklogStatus(taskId, true);
          if ((updatedTask.actualHours === 0 || updatedTask.actualHours === 0 || updatedTask.actualHours === 0.00) && originalActualHours && Number(originalActualHours) > 0) {
            try {
              await SchedulesService.updateTask(taskId, {
                actualHours: Number(originalActualHours),
                estimatedHours: originalEstimatedHours ? Number(originalEstimatedHours) : undefined
              });
            } catch (restoreError) {
              console.error(`[DEBUG] Drag&Drop - Erro ao restaurar horas:`, restoreError);
            }
          }
          
          toast.success('Atividade movida para o backlog!');
        }
      } else if (targetContainerId.startsWith('sprint-')) {
        const sprintId = parseInt(targetContainerId.replace('sprint-', ''));
        const targetSprint = sprints.find(s => s.id === sprintId);
        if (task.isBacklog) {
          await SchedulesService.updateTaskBacklogStatus(taskId, false);
          await SchedulesService.updateTaskSprint(taskId, sprintId);
          toast.success(`Atividade movida do backlog para a sprint "${targetSprint?.name}"!`);
        } else if (task.sprintId && task.sprintId !== sprintId) {
          const sourceSprint = sprints.find(s => s.id === task.sprintId);
          await SchedulesService.updateTaskSprint(taskId, sprintId);
          toast.success(`Atividade movida da sprint "${sourceSprint?.name}" para "${targetSprint?.name}"!`);
        }
      }
      await refreshTasksOnly();

      if (targetContainerId === 'backlog') {
        const taskAfter = getAllTasks().find(t => t.id === taskId);
      }
      
    } catch (error) {
      toast.error('Erro ao mover atividade. Tente novamente.');
      await refreshTasksOnly();
    }
  };

  const BacklogDropZone: React.FC = () => {
    return (
      <div 
        className="text-center py-8 min-h-[100px] flex flex-col justify-center items-center cursor-pointer hover:bg-muted/50 transition-colors"
        onMouseEnter={(e) => {
          if ((window as any).fastReorderUpdateHover) {
            (window as any).fastReorderUpdateHover('backlog-drop', 'after');
          }
        }}
        onMouseLeave={() => {
          if ((window as any).fastReorderUpdateHover) {
            (window as any).fastReorderUpdateHover(null, null);
          }
        }}
        data-drop-zone="backlog"
      >
        <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">
          Arraste atividades aqui para movê-las para o backlog
        </p>
      </div>
    );
  };

  const useDragState = () => {
    const [isDragging, setIsDragging] = useState(false);
    React.useEffect(() => {
      const checkDragState = () => {
        const dragState = (window as any).fastReorderDragState;
        setIsDragging(dragState?.isDragging || false);
      };
      const interval = setInterval(checkDragState, 100);
      checkDragState();
      return () => clearInterval(interval);
    }, []); 
    return isDragging;
  };

  // Componente para área de drop no cabeçalho de sprint
  const SprintHeaderDropZone: React.FC<{ sprintId: number; sprintName: string }> = ({ sprintId, sprintName }) => {
    const isDragging = useDragState();
    
    if (!isDragging) return null;
    
    return (
      <div 
        className="absolute inset-0 pointer-events-none"
        onMouseEnter={() => {
          if ((window as any).fastReorderUpdateHover) {
            (window as any).fastReorderUpdateHover(`sprint-${sprintId}-drop`, 'after');
          }
        }}
        onMouseLeave={() => {
          if ((window as any).fastReorderUpdateHover) {
            (window as any).fastReorderUpdateHover(null, null);
          }
        }}
        data-drop-zone={`sprint-${sprintId}`}
      >
        <div className="pointer-events-auto opacity-0 hover:opacity-100 hover:bg-blue-50 hover:border-2 hover:border-blue-300 hover:border-dashed rounded transition-all duration-200 flex items-center justify-center h-full">
          <div className="text-blue-600 font-medium text-sm">
            Solte aqui para mover para {sprintName}
          </div>
        </div>
      </div>
    );
  };

  // Componente para área de drop no cabeçalho de backlog
  const BacklogHeaderDropZone: React.FC = () => {
    const isDragging = useDragState();
    
    if (!isDragging) return null;
    
    return (
      <div 
        className="absolute inset-0 pointer-events-none"
        onMouseEnter={() => {
          if ((window as any).fastReorderUpdateHover) {
            (window as any).fastReorderUpdateHover('backlog-drop', 'after');
          }
        }}
        onMouseLeave={() => {
          if ((window as any).fastReorderUpdateHover) {
            (window as any).fastReorderUpdateHover(null, null);
          }
        }}
        data-drop-zone="backlog"
      >
        <div className="pointer-events-auto opacity-0 hover:opacity-100 hover:bg-orange-50 hover:border-2 hover:border-orange-300 hover:border-dashed rounded transition-all duration-200 flex items-center justify-center h-full">
          <div className="text-orange-600 font-medium text-sm">
            Solte aqui para mover para Backlog
          </div>
        </div>
      </div>
    );
  };

  if (loading || !schedule) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <Header onToggleSidebar={toggleSidebar} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} currentPath={currentPath} />
          <main className="flex-1 flex items-center justify-center">
            <NewLoader
              message="Carregando cronograma..."
              submessage="Preparando dados"
              size="lg"
              color="blue"
              variant="flow"
            />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header onToggleSidebar={toggleSidebar} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} currentPath={currentPath} />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => {
                const isProjectRoute = location.pathname.includes('/projects/');
                if (isProjectRoute) {
                  navigate('/projects');
                } else {
                  navigate('/schedules');
                }
              }}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Calendar className="h-8 w-8 text-primary" />
                  {schedule?.name || 'Carregando...'}
                </h1>
              </div>
              {currentUser && currentUser.role !== 'client' && (activeTab === 'schedule' || activeTab === 'kanban') && (
                <div className="flex items-center gap-3 flex-wrap">

                  <div className="flex items-center gap-1">
                    <Popover open={openAssigneeCombo} onOpenChange={setOpenAssigneeCombo}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openAssigneeCombo}
                          className="w-48 h-10 justify-between"
                        >
                          {getSelectedAssigneesText()}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-0">
                        <Command>
                          <CommandInput placeholder="Buscar responsável..." />
                          <CommandEmpty>Nenhum responsável encontrado.</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              <CommandItem
                                value="all"
                                onSelect={() => toggleAssignee('all')}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedAssignees.length === 0 ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                Todos os Responsáveis
                              </CommandItem>
                              {getTeamMembers().map((member) => (
                                <CommandItem
                                  key={member.id}
                                  value={member.name}
                                  onSelect={() => toggleAssignee(member.id)}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      selectedAssignees.includes(member.id) ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {member.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center gap-1">
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="h-10 w-32">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {statuses.map((status) => (
                          <SelectItem key={status.id} value={status.id.toString()}>
                            {status.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleCreateSprint}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Nova Sprint
                  </Button>
                  <Button
                    onClick={() => setIsImportModalOpen(true)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Importar Atividades
                  </Button>
                  <Button onClick={handleCreateTask} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Atividade
                  </Button>
                </div>
              )}
            </div>

            {/* Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="schedule" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Cronograma
                </TabsTrigger>
                <TabsTrigger value="kanban" className="flex items-center gap-2">
                  <Kanban className="h-4 w-4" />
                  Kanban
                </TabsTrigger>
              </TabsList>

              {/* Dashboard Content */}
              <TabsContent value="dashboard">
                {dashboardLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <NewLoader
                      message="Carregando dashboard..."
                      submessage="Preparando dados analíticos"
                      size="md"
                      color="blue"
                      variant="flow"
                    />
                  </div>
                ) : !dashboardData ? (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Dados não disponíveis</h3>
                    <p className="text-muted-foreground">Não foi possível carregar os dados do dashboard para este projeto.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <DashboardHeader
                      projectName={schedule?.project?.name}
                      projectDescription={schedule?.project?.description}
                      projectId={schedule?.project?.id}
                      selectedSprint={sprintFilter}
                      onSprintChange={setSprintFilter}
                      sprints={sprints}
                      sprintLoading={loading}
                    />
                    <DashboardMetrics 
                      metrics={metrics}
                    />
                    <DashboardVelocityChart velocityData={velocityData} />
                  </div>
                )}
              </TabsContent>

              {/* Schedule Content */}
              <TabsContent value="schedule">
                <div className="space-y-6">
                  {/* Schedule Details Card */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-lg font-semibold">Detalhes do Cronograma</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Data de Início</p>
                            <p className="text-base font-medium">
                              {schedule?.startDate ? formatDate(schedule.startDate) : 'Não definida'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Data Fim Prevista (Inicial)</p>
                            <p className="text-base font-medium">
                              {schedule?.project?.endDate ? formatDate(schedule.project.endDate) : 'Não definida'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Data Fim Prevista (Atual)</p>
                            <p className="text-base font-medium">
                              {calculatedActualExpectedEndDate ? formatDate(calculatedActualExpectedEndDate) : 'Não definida'}
                            </p>
                          </div>
                        </div>
                        {canEditSchedule() && (
                          <div className="flex justify-end">
                            <Button
                              onClick={handleRecalculateAssignee}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                              disabled={loading}
                            >
                              <RefreshCcw className="h-4 w-4" />
                              Recalcular Tarefas
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Info Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Projeto
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-semibold">{schedule?.project?.name}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Equipe
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-semibold">{schedule?.team?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule?.team?.members?.length || 0} membros
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Atividades
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-semibold">{(schedule?.tasks || []).filter(t => !t.isBacklog).length}</p>
                        <p className="text-sm text-muted-foreground">
                          {(schedule?.tasks || []).filter(t => !t.isBacklog && t.status.code === 'completed').length} concluídas
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Total de Horas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-semibold">
                          {(schedule?.tasks || []).filter(t => !t.isBacklog).reduce((sum, t) => sum + Number(t.actualHours), 0)}h
                        </p>
                        <p className="text-sm text-muted-foreground">
                          de {(schedule?.tasks || []).filter(t => !t.isBacklog).reduce((sum, t) => sum + Number(t.estimatedHours), 0)}h estimadas
                        </p>
                      </CardContent>
                    </Card>
                  </div>


                  {/* Sistema de reorganização ultra otimizado */}
                  <FastReorderProvider
                    onReorder={handleFastReorder}
                    onMove={handleFastMove}
                  >
                    {/* Cards individuais para cada Sprint */}
                    {sprints.map((sprint) => {
                      const sprintTasks = getSprintTasks(sprint.id);
                      return (
                        <Card key={sprint.id}>
                            <CardHeader className="relative flex flex-col xl:flex-row items-start xl:items-center xl:justify-between space-y-2 xl:space-y-0 pb-3">
                              {/* Drop zone no cabeçalho da sprint */}
                              <SprintHeaderDropZone sprintId={sprint.id} sprintName={sprint.name} />
                              
                              <CardTitle className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4 flex-1">
                                <div className="flex items-center gap-2">
                                  {sprint.name}
                                  <span className="text-sm font-normal text-muted-foreground">
                                    ({sprintTasks.length})
                                  </span>
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                                  {sprint.expectDate && (
                                    <span>Início: {formatDate(sprint.expectDate)}</span>
                                  )}
                                  {sprint.expectEndDate && (
                                    <span>Término: {formatDate(sprint.expectEndDate)}</span>
                                  )}
                                </div>
                              </CardTitle>
                            <div className="flex items-center gap-1 xl:gap-2 mt-2 xl:mt-0">
                              {sprint.statusSprint && (
                                <Select
                                  key={`sprint-${sprint.id}-status-${sprint.statusSprint.id}`}
                                  value={sprint.statusSprint.id.toString()}
                                  onValueChange={(value) => handleUpdateSprintStatus(sprint.id, parseInt(value))}
                                  disabled={!canEditSchedule()}
                                >
                                  <SelectTrigger className={`h-6 text-xs px-2 py-1 border-none ${getSprintStatusBadgeColor(sprint.statusSprint.name)} hover:opacity-80`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {statusSprints.map((status) => (
                                      <SelectItem key={status.id} value={status.id.toString()}>
                                        <div className={`px-2 py-1 rounded text-xs ${getSprintStatusBadgeColor(status.name)}`}>
                                          {status.name}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => toggleSprintCard(sprint.id)}
                                className="h-8 w-8 p-0"
                              >
                                {collapsedSprints.has(sprint.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronUp className="h-4 w-4" />
                                )}
                              </Button>
                              {currentUser && currentUser.role !== 'client' && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditSprint(sprint)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar Sprint
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteSprint(sprint)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Excluir Sprint
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              </div>
                            </CardHeader>
                            
                            {!collapsedSprints.has(sprint.id) && (
                              <CardContent className="p-0">
                              {sprintTasks.length > 0 ? (
                                <FastTaskTable
                                  tasks={sprintTasks}
                                  containerId={`sprint-${sprint.id}`}
                                  formatDate={formatDate}
                                  calculateProgress={calculateProgress}
                                  getStatusBadge={getStatusBadge}
                                  handleUpdateHours={handleUpdateHours}
                                  handleEditTask={handleEditTask}
                                  handleDeleteTask={handleDeleteTask}
                                  handleUpdateAssignee={handleUpdateAssignee}
                                  handleUpdateStatus={handleUpdateStatus}
                                  getStatusColors={getStatusColors}
                                  teamMembers={getTeamMembers()}
                                  isInBacklog={false}
                                  sprints={sprints}
                                  handleSprintChange={handleSprintChange}
                                  statuses={statuses}
                                  maxVisible={50}
                                />
                              ) : (
                                <div className="text-center py-8">
                                  <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                                  <p className="text-sm text-muted-foreground">
                                    Arraste atividades de outros cards para esta sprint
                                  </p>
                                </div>
                              )}
                              </CardContent>
                            )}
                        </Card>
                      );
                    })}

                    {/* Card Backlog */}
                    <Card>
                      <CardHeader className="relative flex flex-col xl:flex-row items-start xl:items-center xl:justify-between space-y-2 xl:space-y-0 pb-3">
                        {/* Drop zone no cabeçalho do backlog */}
                        <BacklogHeaderDropZone />
                        <CardTitle className="flex items-center gap-2">
                          Backlog
                          <span className="text-sm font-normal text-muted-foreground">
                            ({getFilteredBacklogTasks().length})
                          </span>
                        </CardTitle>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={toggleBacklogCard}
                          className="h-8 w-8 p-0 mt-2 xl:mt-0"
                        >
                          {isBacklogCardCollapsed ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                        </Button>
                      </CardHeader>  
                        {isBacklogCardCollapsed && (
                          <CardContent className="p-0">
                            {getFilteredBacklogTasks().length > 0 ? (
                              <FastTaskTable
                                tasks={getFilteredBacklogTasks()}
                                containerId="backlog"
                                formatDate={formatDate}
                                calculateProgress={calculateProgress}
                                getStatusBadge={getStatusBadge}
                                handleUpdateHours={handleUpdateHours}
                                handleEditTask={handleEditTask}
                                handleDeleteTask={handleDeleteTask}
                                handleUpdateAssignee={handleUpdateAssignee}
                                handleUpdateStatus={handleUpdateStatus}
                                getStatusColors={getStatusColors}
                                teamMembers={getTeamMembers()}
                                isInBacklog={true}
                                sprints={sprints}
                                handleSprintChange={handleSprintChange}
                                statuses={statuses}
                                maxVisible={50}
                              />
                            ) : (
                              <BacklogDropZone />
                            )}
                          </CardContent>
                        )}
                    </Card>

                  </FastReorderProvider>
                </div>
              </TabsContent>

              {/* Kanban Content */}
              <TabsContent value="kanban">
                <KanbanBoard 
                  tasks={getFilteredAllTasks()}
                  projectId={schedule?.project?.id}
                  onTaskStatusChange={handleUpdateStatus}
                  onTaskUpdate={handleTaskUpdate}
                />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Modals */}
      <ScheduleFormModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        schedule={schedule}
        onSave={onScheduleSaved}
      />

      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={selectedTask}
        scheduleId={schedule?.id}
        projectId={schedule?.project?.id}
        teamMembers={getTeamMembers()}
        onSave={onTaskSaved}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={isEditProjectModalOpen}
        onClose={() => setIsEditProjectModalOpen(false)}
        project={schedule?.project}
        onSave={handleEditProjectSaved}
        shouldRecalculateSchedule={true}
        key="schedule-details-modal"
      />

      <UpdateTaskHoursModal
        isOpen={isHoursModalOpen}
        onClose={() => setIsHoursModalOpen(false)}
        task={selectedTask}
        onSave={onTaskSaved}
      />

      <SprintFormModal
        isOpen={isSprintModalOpen}
        onClose={() => setIsSprintModalOpen(false)}
        sprint={selectedSprint}
        projectId={schedule?.project?.id || 0}
        onSave={onSprintSaved}
      />

      {/* Modal de Transferência de Atividades */}
      <ConfirmationDialog
        isOpen={transferTasksModal.isOpen}
        onClose={handleCancelTransferTasks}
        onConfirm={handleConfirmTransferTasks}
        title="Concluir Sprint"
        description={
          <div className="space-y-2">
            <p>
              A sprint <strong>"{transferTasksModal.sprintName}"</strong> possui <strong>{transferTasksModal.incompleteTasksCount}</strong> atividade(s) não concluída(s).
            </p>
            <p>
              Deseja transferir essas atividades para a próxima sprint <strong>"{transferTasksModal.nextSprintName}"</strong>?
            </p>
          </div>
        }
        confirmText="Sim, transferir"
        cancelText="Cancelar"
        variant="default"
      />

      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        onClose={() => setConfirmationDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationDialog.onConfirm}
        title={confirmationDialog.title}
        description={confirmationDialog.description}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a atividade "{taskToDelete?.title}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTask}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TaskImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        scheduleId={schedule?.projectId || parseInt(id)}
        onImportSuccess={() => {
          loadScheduleData(false);
          setIsImportModalOpen(false);
        }}
      />
    </div>
  );
};

export default ScheduleDetailsPage;
