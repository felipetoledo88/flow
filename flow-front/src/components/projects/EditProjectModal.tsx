import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Project, UpdateProjectData, ProjectsService } from '@/services/api/projects.service';
import { TeamsService } from '@/services/api/teams.service';
import { SchedulesService } from '@/services/api/schedules.service';
import { Team } from '@/types/team';
import { toast } from 'sonner';
import { 
  Loader2, 
  Settings
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSave: (datesChanged?: boolean) => void;
  shouldRecalculateSchedule?: boolean; // Nova prop para indicar se deve recalcular atividades
}

interface FormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  teamId: string;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onSave,
  shouldRecalculateSchedule = false,
}) => {
  const { user: currentUser } = useAuth();
  

  // Função para formatar data para input (evita problemas de timezone)
  const formatDateForInput = (dateString: string): string => {
    try {

      if (!dateString) {
        return '';
      }

      // Se a data já está no formato YYYY-MM-DD, retornar diretamente
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString;
      }

      // Se a data tem horário, extrair apenas a parte da data
      if (dateString.includes('T')) {
        const result = dateString.split('T')[0];
        return result;
      }

      // Para outros formatos, tentar criar Date e extrair no formato local
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const result = `${year}-${month}-${day}`;
        return result;
      }

      return '';
    } catch (error) {
      return '';
    }
  };
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    teamId: '',
  });

  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Debug: monitorar mudanças no estado teams
  useEffect(() => {
    if (teams.length > 0 && !formData.teamId && project?.team?.id) {
      const projectTeam = teams.find(team => team.id === project.team?.id);
      if (projectTeam) {
        setFormData(prev => ({ ...prev, teamId: project.team!.id.toString() }));
      }
    }
  }, [teams, formData.teamId, project]);

  useEffect(() => {
    if (isOpen && project) {
      const formattedStartDate = project.startDate ? formatDateForInput(project.startDate) : '';
      const formattedEndDate = project.endDate ? formatDateForInput(project.endDate) : '';
      const teamId = project.team?.id ? project.team.id.toString() : '';
      setFormData({
        name: project.name || '',
        description: project.description || '',
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        teamId: teamId,
      });

      loadTeams();
      setErrors({});
    }
  }, [isOpen, project]);


  const loadTeams = async () => {
    try {
      setLoadingTeams(true);
      const teamsData = await TeamsService.getTeams();
      setTeams(teamsData);
      if (formData.teamId) {
        const foundTeam = teamsData.find(team => team.id.toString() === formData.teamId);
        if (!foundTeam && project?.team?.id) {
          const projectTeam = teamsData.find(team => team.id === project.team?.id);
          if (projectTeam) {
            setFormData(prev => ({ ...prev, teamId: project.team!.id.toString() }));
          }
        }
      }
    } catch (error) {
      toast.error('Erro ao carregar lista de equipes');
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newValue = e.target.value;

    setFormData(prev => ({ ...prev, [field]: newValue }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.teamId || formData.teamId === '' || formData.teamId === 'none') {
      newErrors.teamId = 'Equipe é obrigatória';
    }

    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'Data de fim deve ser posterior à data de início';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !project) {
      return;
    }

    setLoading(true);

    try {
      const formatDateForAPI = (dateString: string) => {
        if (!dateString.trim()) {
          return undefined;
        }
        const date = new Date(dateString + 'T00:00:00');
        const offsetMinutes = date.getTimezoneOffset();
        const compensatedDate = new Date(date.getTime() - (offsetMinutes * 60 * 1000));
        const year = compensatedDate.getUTCFullYear();
        const month = String(compensatedDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(compensatedDate.getUTCDate()).padStart(2, '0');
        
        const result = `${year}-${month}-${day}`;
        return result;
      };

      // Detectar se as datas foram alteradas
      const originalStartDate = project.startDate ? formatDateForInput(project.startDate) : '';
      const originalEndDate = project.endDate ? formatDateForInput(project.endDate) : '';
      const datesChanged = originalStartDate !== formData.startDate || originalEndDate !== formData.endDate;

      const updateData: UpdateProjectData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        startDate: formatDateForAPI(formData.startDate) || undefined,
        endDate: formatDateForAPI(formData.endDate) || undefined,
        teamId: formData.teamId && formData.teamId !== '' ? parseInt(formData.teamId) : undefined,
      };

      await ProjectsService.updateProject(project.id, updateData);
      toast.success('Projeto atualizado com sucesso!');
      
      // Se as datas foram alteradas, fazer recálculo direto
      if (datesChanged) {
        try {
          // Mostrar feedback visual
          toast.info('Recalculando atividades com as novas datas do projeto...');
          
          // Fazer recálculo direto via API
          await SchedulesService.forceRecalculateSchedule(project.id);
          
          toast.success('Atividades recalculadas com as novas datas do projeto!');
          
        } catch (error) {
          toast.error('Erro ao recalcular atividades. As atividades podem não estar atualizadas.');
        }
        
        // Disparar evento para compatibilidade (caso ScheduleDetailsPage esteja aberto)
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('projectDatesUpdated', { 
            detail: { projectId: project.id } 
          }));
        }, 100);
      }
      
      // Chamar onSave para fechar o modal
      onSave(datesChanged);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar projeto');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Editar Projeto
          </DialogTitle>
        </DialogHeader>

        <div className="w-full">
          <form onSubmit={handleSubmit} className="mt-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Informações Básicas</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Projeto *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange('name')}
                    placeholder="Digite o nome do projeto"
                    disabled={loading}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={handleInputChange('description')}
                    placeholder="Descreva o projeto"
                    rows={3}
                    disabled={loading}
                  />
                </div>

                {/* Dropdown de Equipe */}
                <div className="space-y-2">
                  <Label htmlFor="team">Equipe do Projeto *</Label>
                  <Select 
                    value={formData.teamId} 
                    onValueChange={(value) => {
                      if (!loadingTeams && teams.length > 0 && value !== '') {
                        setFormData(prev => ({ ...prev, teamId: value }));
                        if (errors.teamId) {
                          setErrors(prev => ({ ...prev, teamId: '' }));
                        }

                        const selectedTeam = teams.find(team => team.id.toString() === value);
                        setCurrentTeam(selectedTeam || null);
                      }
                    }}
                    disabled={loadingTeams || loading}
                  >
                    <SelectTrigger className={errors.teamId ? "border-destructive" : ""}>
                      <SelectValue>
                        {(() => {
                          if (loadingTeams) return "Carregando...";
                          if (teams.length === 0) return "Carregando equipe...";
                          const selectedTeam = teams.find(t => t.id.toString() === formData.teamId);
                          if (selectedTeam) {
                            return `${selectedTeam.name} (${selectedTeam.members?.length || 0} membros)`;
                          }
                          return "Selecione uma equipe...";
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => {
                        return (
                          <SelectItem 
                            key={team.id} 
                            value={team.id.toString()}
                          >
                            <div className="flex flex-col">
                              <span>{team.name}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {errors.teamId && (
                    <p className="text-sm text-destructive">{errors.teamId}</p>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      if (!formData.teamId || formData.teamId === '') {
                        return <span className="text-destructive">Selecione uma equipe (obrigatório)</span>;
                      }
                      
                      const selectedTeam = teams.find(t => t.id.toString() === formData.teamId);
                      if (!selectedTeam) {
                        return <span className="text-amber-600">Carregando informações da equipe...</span>;
                      }
                      
                      return (
                        <>
                          Equipe selecionada: <span className="font-medium">{selectedTeam.name}</span> 
                          ({selectedTeam.members?.length || 0} membros)
                          {selectedTeam.director && (
                            <>
                              <br />
                              Diretor: <span className="font-medium">{selectedTeam.director.name}</span>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Datas */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Datas</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data de Início</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={handleInputChange('startDate')}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data de Fim</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={handleInputChange('endDate')}
                      disabled={loading}
                    />
                    {errors.endDate && (
                      <p className="text-sm text-destructive">{errors.endDate}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditProjectModal;