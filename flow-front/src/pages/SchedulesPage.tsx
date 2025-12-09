import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import ScheduleFormModal from '@/components/schedules/ScheduleFormModal';
import { SchedulesService } from '@/services/api/schedules.service';
import { Schedule, SCHEDULE_STATUS_LABELS, TASK_STATUS_LABELS } from '@/types/schedule';
import { Calendar, Plus, ChevronRight, Clock, Trash2 } from 'lucide-react';
import { useSelectedProject } from '@/hooks/use-selected-project';
import { useAuth } from '@/hooks/use-auth';
import { ProjectsService } from '@/services/api/projects.service';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const SchedulesPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]); // Todos os cronogramas carregados
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  
  // Hook para projeto selecionado
  const { selectedProject, showAllProjects } = useSelectedProject();
  
  // Hook para autenticação
  const { user } = useAuth();
  
  // Estado para armazenar IDs dos projetos do cliente
  const [clientProjectIds, setClientProjectIds] = useState<number[]>([]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const data = await SchedulesService.getSchedules();
      
      // Armazenar todos os cronogramas carregados
      setAllSchedules(data);
      
      // Aplicar filtros
      let filteredSchedules = data;
      
      // Filtro por role do usuário
      if (user?.role === 'manager') {
        // Managers só veem cronogramas de projetos onde são diretores
        // Compara tanto string quanto number para garantir compatibilidade
        filteredSchedules = data.filter(schedule => 
          schedule.project?.director?.id == user.id
        );
      } else if (user?.role === 'user') {
        // Users só veem cronogramas de equipes onde estão vinculados
        filteredSchedules = data.filter(schedule => {
          // Verifica se o usuário está na equipe do cronograma
          return schedule.team?.members?.some(member => 
            member.user?.id == user.id
          );
        });
      } else if (user?.role === 'client') {
        // Clients só veem cronogramas de projetos onde estão vinculados
        filteredSchedules = data.filter(schedule => 
          clientProjectIds.includes(Number(schedule.project?.id))
        );
      }
      
      // Filtrar baseado na seleção do dropdown do Header
      if (selectedProject && !showAllProjects) {
        // Filtrar cronogramas que pertencem ao projeto selecionado (via equipe)
        filteredSchedules = filteredSchedules.filter(schedule => 
          schedule.team?.projectId === selectedProject.id
        );
      }
      
      setSchedules(filteredSchedules);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(`Erro ao carregar cronogramas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  // Carregar projetos do cliente quando ele for 'client'
  useEffect(() => {
    const loadClientProjects = async () => {
      if (user?.role === 'client') {
        try {
          const projects = await ProjectsService.getUserProjects();
          const projectIds = projects.map(project => Number(project.id));
          setClientProjectIds(projectIds);
        } catch (error) {
          console.error('Erro ao carregar projetos do cliente:', error);
        }
      }
    };
    
    if (user) {
      loadClientProjects();
    }
  }, [user]);

  // Reagir quando o projeto selecionado mudar
  useEffect(() => {
    // Re-filtrar os cronogramas já carregados
    if (allSchedules.length > 0) {
      // Aplicar filtros
      let filteredSchedules = allSchedules;
      
      // Filtro por role do usuário
      if (user?.role === 'manager') {
        // Managers só veem cronogramas de projetos onde são diretores
        // Compara tanto string quanto number para garantir compatibilidade
        filteredSchedules = allSchedules.filter(schedule => 
          schedule.project?.director?.id == user.id
        );
      } else if (user?.role === 'user') {
        // Users só veem cronogramas de equipes onde estão vinculados
        filteredSchedules = allSchedules.filter(schedule => {
          // Verifica se o usuário está na equipe do cronograma
          return schedule.team?.members?.some(member => 
            member.user?.id == user.id
          );
        });
      } else if (user?.role === 'client') {
        // Clients só veem cronogramas de projetos onde estão vinculados
        filteredSchedules = allSchedules.filter(schedule => 
          clientProjectIds.includes(Number(schedule.project?.id))
        );
      }
      
      // Filtrar baseado na seleção do dropdown do Header
      if (selectedProject && !showAllProjects) {
        filteredSchedules = filteredSchedules.filter(schedule => 
          schedule.team?.projectId === selectedProject.id
        );
      }
      
      setSchedules(filteredSchedules);
    }
  }, [selectedProject?.id, showAllProjects, allSchedules, user?.role, user?.id, clientProjectIds]);

  const getStatusBadge = (status: Schedule['status']) => {
    const variants = {
      planning: { color: 'bg-gray-100 text-gray-800', label: SCHEDULE_STATUS_LABELS[status] },
      in_progress: { color: 'bg-blue-100 text-blue-800', label: SCHEDULE_STATUS_LABELS[status] },
      completed: { color: 'bg-green-100 text-green-800', label: SCHEDULE_STATUS_LABELS[status] },
      cancelled: { color: 'bg-red-100 text-red-800', label: SCHEDULE_STATUS_LABELS[status] },
    };
    const config = variants[status];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const calculateScheduleProgress = (schedule: Schedule) => {
    if (!schedule.tasks || schedule.tasks.length === 0) return 0;
    const completed = schedule.tasks.filter(t => t.status.code === 'completed').length;
    return Math.round((completed / schedule.tasks.length) * 100);
  };

  const handleCreateSchedule = () => {
    setIsFormModalOpen(true);
  };

  const onScheduleSaved = () => {
    setIsFormModalOpen(false);
    loadSchedules();
  };

  const handleDeleteSchedule = (e: React.MouseEvent, schedule: Schedule) => {
    e.stopPropagation();
    setScheduleToDelete(schedule);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return;

    try {
      await SchedulesService.deleteSchedule(scheduleToDelete.id);
      toast.success('Cronograma excluído com sucesso!');
      loadSchedules(); // Recarregar a lista
    } catch (error) {
      toast.error('Erro ao excluir cronograma. Tente novamente.');
    } finally {
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    }
  };

  if (loading && schedules.length === 0) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <Header onToggleSidebar={toggleSidebar} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} currentPath={currentPath} />
          <main className="flex-1 flex items-center justify-center">
            <NewLoader
              message="Carregando cronogramas..."
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Calendar className="h-8 w-8 text-primary" />
                  Cronogramas
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gerencie cronogramas de projetos e acompanhe atividades
                </p>
              </div>
              {user && (user.role === 'admin' || user.role === 'manager' || user.role === 'techlead') && (
                <Button onClick={handleCreateSchedule} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Cronograma
                </Button>
              )}
            </div>

            <div className="grid gap-6">
              {schedules.length > 0 ? (
                schedules.map((schedule) => (
                  <Card key={schedule.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/schedules/${schedule.id}`)}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">{schedule.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(schedule.status)}
                          {user && (user.role === 'admin' || user.role === 'manager' || user.role === 'techlead') && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => handleDeleteSchedule(e, schedule)}
                              title="Excluir cronograma"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {schedule.description && (
                        <p className="text-sm text-muted-foreground mt-2">{schedule.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Projeto</p>
                          <p className="font-medium">{schedule.project?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Equipe</p>
                          <p className="font-medium">{schedule.team?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Tarefas</p>
                          <p className="font-medium">{schedule.tasks?.length || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Progresso</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full">
                              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${calculateScheduleProgress(schedule)}%` }} />
                            </div>
                            <span className="text-sm font-medium">{calculateScheduleProgress(schedule)}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Criado em {new Date(schedule.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                        <Button variant="ghost" size="sm">
                          Ver Detalhes
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">Nenhum cronograma encontrado</h3>
                      <p className="text-muted-foreground mb-4">
                        Comece criando seu primeiro cronograma usando o botão "Novo Cronograma" acima.
                      </p>
                      <Button onClick={handleCreateSchedule} className="flex items-center gap-2 mx-auto">
                        <Plus className="h-4 w-4" />
                        Criar Primeiro Cronograma
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>

      <ScheduleFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={onScheduleSaved}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cronograma "{scheduleToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSchedule}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SchedulesPage;
