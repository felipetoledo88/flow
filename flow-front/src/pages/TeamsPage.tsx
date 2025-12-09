import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import TeamFormModal from '@/components/teams/TeamFormModal';
import TeamEditModal from '@/components/teams/TeamEditModal';
import { TeamsService } from '@/services/api/teams.service';
import { Team, WEEK_DAYS } from '@/types/team';
import { Users, Plus, Edit, Trash2, MoreVertical, UserPlus } from 'lucide-react';
import { useSelectedProject } from '@/hooks/use-selected-project';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const TeamsPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]); // Todas as equipes carregadas
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  const location = useLocation();
  const currentPath = location.pathname;
  const { selectedProject, showAllProjects } = useSelectedProject();
  const { user } = useAuth();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await TeamsService.getTeams();
      setAllTeams(data);
      let filteredTeams = data;
      if (user?.role === 'user') {
        filteredTeams = data.filter(team => {
          return team.members?.some(member => 
            member.user?.id == user.id
          );
        });
      }

      if (selectedProject && !showAllProjects) {
        filteredTeams = filteredTeams.filter(team => team.projectId === selectedProject.id);
      }

      filteredTeams = data; // Mostrar todas as equipes temporariamente
      
      setTeams(filteredTeams);
    } catch (error: any) {
      toast.error(`Erro ao carregar equipes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  // Reagir quando o projeto selecionado mudar
  useEffect(() => {
    // Re-filtrar as equipes já carregadas
    if (allTeams.length > 0) {
      // Aplicar filtros
      let filteredTeams = allTeams;
      
      // Filtro por role do usuário
      if (user?.role === 'user') {
        // Users só veem equipes onde estão vinculados como membros
        filteredTeams = allTeams.filter(team => {
          return team.members?.some(member => 
            member.user?.id == user.id
          );
        });
      }
      
      // Filtrar baseado na seleção do dropdown do Header
      if (selectedProject && !showAllProjects) {
        filteredTeams = filteredTeams.filter(team => team.projectId === selectedProject.id);
      }
      
      // TEMPORÁRIO: Para debug, mostrar todas as equipes
      filteredTeams = allTeams;
      
      setTeams(filteredTeams);
    }
  }, [selectedProject?.id, showAllProjects, allTeams, user?.role, user?.id]);

  const handleCreateTeam = () => {
    setSelectedTeam(null);
    setIsFormModalOpen(true);
  };

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setIsEditModalOpen(true);
  };

  const handleDeleteTeam = (team: Team) => {
    setTeamToDelete(team);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;

    try {
      await TeamsService.deleteTeam(teamToDelete.id);
      toast.success('Equipe excluída com sucesso');
      loadTeams();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao excluir equipe';
      toast.error(errorMessage);
    } finally {
      setDeleteDialogOpen(false);
      setTeamToDelete(null);
    }
  };

  const onTeamSaved = () => {
    setIsFormModalOpen(false);
    setSelectedTeam(null);
    loadTeams();
  };

  const onTeamUpdated = () => {
    setIsEditModalOpen(false);
    setSelectedTeam(null);
    loadTeams();
  };

  const getWorkDaysLabel = (workDays: number[] | string[]) => {
    if (!Array.isArray(workDays)) {
      return '-';
    }
    
    const labels = workDays
      .map(day => Number(day)) // Converte string para número
      .sort((a, b) => a - b)
      .map(day => {
        const weekDay = WEEK_DAYS.find(d => d.value === day);
        return weekDay?.label.substring(0, 3);
      })
      .filter(label => label !== undefined); // Remove valores undefined
    
    return labels.join(', ');
  };

  if (loading && teams.length === 0) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <Header onToggleSidebar={toggleSidebar} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            isOpen={sidebarOpen}
            currentPath={currentPath}
          />

          <main className="flex-1 flex items-center justify-center">
            <NewLoader
              message="Carregando equipes..."
              submessage="Preparando lista de equipes"
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
        <Sidebar
          isOpen={sidebarOpen}
          currentPath={currentPath}
        />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Users className="h-8 w-8 text-primary" />
                  Equipes
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gerencie equipes e seus membros com carga de trabalho
                </p>
              </div>

              {user && (user.role === 'admin' || user.role === 'manager' || user.role === 'techlead') && (
                <Button onClick={handleCreateTeam} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Equipe
                </Button>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {teams.length > 0 ? (
                teams.map((team) => (
                  <Card key={team.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg font-bold">
                        {team.name}
                      </CardTitle>
                      {user && (user.role === 'admin' || user.role === 'manager' || user.role === 'techlead') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditTeam(team)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteTeam(team)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </CardHeader>
                    <CardContent>
                      {team.description && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {team.description}
                        </p>
                      )}

                      {team.director && (
                        <div className="mb-4">
                          <span className="text-sm font-medium text-muted-foreground">Diretor: </span>
                          <span className="text-sm font-medium">{team.director.name}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">Membros</span>
                        <Badge variant={team.isActive ? "default" : "secondary"}>
                          {team.isActive ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>

                      {team.members && team.members.length > 0 ? (
                        <div className="space-y-2">
                          {team.members.filter(member => member.user).map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-2 bg-muted rounded-lg"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {member.user.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {member.dailyWorkHours}h/dia
                                </p>
                              </div>
                              <div className="text-right ml-2">
                                <p className="text-xs text-muted-foreground">
                                  {getWorkDaysLabel(member.workDays)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <UserPlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Nenhum membro na equipe
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">Nenhuma equipe encontrada</h3>
                        <p className="text-muted-foreground mb-4">
                          {user?.role === 'user' 
                            ? 'Você não está vinculado a nenhuma equipe ainda.'
                            : 'Comece criando sua primeira equipe usando o botão "Nova Equipe" acima.'
                          }
                        </p>
                        {user && (user.role === 'admin' || user.role === 'manager' || user.role === 'techlead') && (
                          <Button onClick={handleCreateTeam} className="flex items-center gap-2 mx-auto">
                            <Plus className="h-4 w-4" />
                            Criar Primeira Equipe
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <TeamFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        team={selectedTeam}
        onSave={onTeamSaved}
      />

      {selectedTeam && (
        <TeamEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          team={selectedTeam}
          onSave={onTeamUpdated}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a equipe "{teamToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTeam}
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

export default TeamsPage;
