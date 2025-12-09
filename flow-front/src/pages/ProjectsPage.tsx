import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { NewLoader } from '@/components/ui/new-loader';
import { Search, MoreHorizontal, Calendar, Users, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ProjectsService, Project, ProjectQuery } from '@/services/api/projects.service';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import EditProjectModal from '@/components/projects/EditProjectModal';
import { AuthService } from '@/services/api/auth.service';
import { DashboardService } from '@/services/api/dashboard.service';
import { User } from '@/types/auth';
import { useProjectStore } from '@/stores/project/project.store';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

const ProjectsPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]); // Todos os projetos carregados
  const [projectMetrics, setProjectMetrics] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Hook simplificado para controle de exibição
  const { setShowAllProjects } = useProjectStore();
  
  // Hook para autenticação
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const currentPath = location.pathname;

  // Função para formatar datas de forma consistente
  const formatDate = (dateString: string) => {
    try {
      // Se a data vem apenas como YYYY-MM-DD, tratar como data local
      if (dateString && !dateString.includes('T')) {
        // Para datas no formato YYYY-MM-DD, criar Date diretamente para evitar timezone
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('pt-BR');
      }

      // Para datas com horário, usar normalmente
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      return 'Data inválida';
    }
  };

  useEffect(() => {
    const authData = AuthService.getAuthData();
    if (authData.user) {
      setCurrentUser(authData.user);
    }
  }, []);

  // Aguardar o usuário estar disponível antes de carregar projetos
  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user, activeFilter, searchTerm]);

  // Função para verificar se o usuário pode editar/excluir projetos
  const canEditProject = () => {
    return currentUser && !['user', 'client', 'qa'].includes(currentUser.role);
  }

  // REMOVIDO: useEffect complexo que estava causando problemas de filtros duplicados

  const loadProjects = async () => {
    try {
      setLoading(true);
      const query: ProjectQuery = {
        page: 1,
        limit: 50,
        orderBy: 'createdAt',
        order: 'DESC',
      };

      // Aplicar filtro de status do tab ativo
      if (activeFilter !== 'all') {
        query.status = activeFilter as 'active' | 'completed' | 'paused' | 'cancelled';
      }

      if (searchTerm) {
        query.search = searchTerm;
      }

      const response = await ProjectsService.getProjects(query);

      // Armazenar projetos (já filtrados pelo backend baseado na role)
      setAllProjects(response.projects);
      setProjects(response.projects);

      // Buscar métricas do dashboard para cada projeto
      const metricsPromises = response.projects.map(async (project) => {
        try {
          const dashboardData = await DashboardService.getDashboardData(project.id);
          return { projectId: project.id, completionRate: dashboardData.metrics.completionRate };
        } catch (error) {
          // Se der erro, usar 0%
          return { projectId: project.id, completionRate: 0 };
        }
      });

      const metricsResults = await Promise.all(metricsPromises);
      const metricsMap: Record<string, number> = {};
      metricsResults.forEach(({ projectId, completionRate }) => {
        metricsMap[projectId] = completionRate;
      });
      
      setProjectMetrics(metricsMap);
    } catch (error) {
      toast.error('Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  };


  const handleProjectCreated = () => {
    loadProjects();
  };

  const handleTabChange = (value: string) => {
    setActiveFilter(value);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setEditDialogOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setDeletingProject(project);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!deletingProject) return;
    
    try {
      await ProjectsService.deleteProject(deletingProject.id);
      toast.success('Projeto excluído com sucesso!');
      setDeleteDialogOpen(false);
      setDeletingProject(null);
      loadProjects();
    } catch (error) {
      toast.error('Erro ao excluir projeto');
    }
  };

  const handleEditSaved = (datesChanged?: boolean) => {
    setEditDialogOpen(false);
    setEditingProject(null);
    loadProjects();
    
    // Se as datas do projeto foram alteradas, disparar evento personalizado
    if (datesChanged && editingProject) {
      window.dispatchEvent(new CustomEvent('projectDatesUpdated', { 
        detail: { projectId: editingProject.id } 
      }));
    }
  };

  const handleAccessProject = async (project: Project) => {
    try {
      navigate(`/projects/${project.id}/schedule`);
    } catch (error) {
      toast.error('Erro ao acessar projeto');
    }
  };

  const renderProjects = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <NewLoader
            message="Carregando projetos..."
            submessage="Sincronizando com repositórios"
            size="lg"
            color="red"
            variant="flow"
          />
        </div>
      );
    }

    if (projects.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum projeto encontrado</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="dashboard-card border-2 hover:border-primary hover:shadow-lg cursor-pointer group transition-all duration-200"
            onClick={() => handleAccessProject(project)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      → Clique para acessar
                    </span>
                  </div>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status === 'active' ? 'Ativo' :
                     project.status === 'completed' ? 'Concluído' :
                     project.status === 'paused' ? 'Pausado' : 'Cancelado'}
                  </Badge>
                </div>
                {canEditProject() && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleEditProject(project);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar Projeto
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Projeto
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {project.description || 'Sem descrição'}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso do Escopo</span>
                  <span className="font-semibold text-primary">{(projectMetrics[project.id] || 0).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary to-chart-2 h-2.5 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${projectMetrics[project.id] || 0}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 pt-2 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Início: {project.startDate ? formatDate(project.startDate) : 'Não definido'}</span>
                </div>
                {project.endDate && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Fim: {formatDate(project.endDate)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-chart-2 text-white';
      case 'completed': return 'bg-success text-white';
      case 'paused': return 'bg-warning text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-success';
      case 'warning': return 'text-warning';
      case 'critical': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header onToggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          isOpen={sidebarOpen} 
          currentPath={currentPath}
        />
        
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="animated-bg">
              {/* Header */}
              <div className="page-header p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                      Projetos
                    </h1>
                    <p className="text-muted-foreground mt-1">Gerencie e acompanhe todos os seus projetos</p>
                  </div>
                  {currentUser && !['user', 'client', 'qa'].includes(currentUser.role) && (
                    <CreateProjectModal 
                      onProjectCreated={handleProjectCreated}
                    />
                  )}
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Search */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input 
                      placeholder="Buscar projetos..." 
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Status Tabs */}
                <Tabs value={activeFilter} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="active">Ativos</TabsTrigger>
                    <TabsTrigger value="completed">Concluídos</TabsTrigger>
                    <TabsTrigger value="paused">Pausados</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="space-y-4 mt-6">
                    {renderProjects()}
                  </TabsContent>

                  <TabsContent value="active" className="space-y-4 mt-6">
                    {renderProjects()}
                  </TabsContent>

                  <TabsContent value="completed" className="space-y-4 mt-6">
                    {renderProjects()}
                  </TabsContent>

                  <TabsContent value="paused" className="space-y-4 mt-6">
                    {renderProjects()}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        project={editingProject}
        onSave={handleEditSaved}
        key="projects-page-modal"
      />

      {/* Delete Project Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Projeto</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o projeto "{deletingProject?.name}"?
              <br />
              <strong className="text-destructive">Esta ação não pode ser desfeita.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteProject}>
              Excluir Projeto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsPage;
