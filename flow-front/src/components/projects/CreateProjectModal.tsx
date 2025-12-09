import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { ProjectsService, CreateProjectData } from '@/services/api/projects.service';
import { TeamsService } from '@/services/api/teams.service';
import { useAuth } from '@/hooks/use-auth';
import { Team } from '@/types/team';
import { toast } from 'sonner';

interface CreateProjectModalProps {
  onProjectCreated: () => void;
}

export const CreateProjectModal = ({ onProjectCreated }: CreateProjectModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  
  
  const [formData, setFormData] = useState<CreateProjectData>({
    name: '',
    description: '',
    status: 'active',
    health: 'healthy',
    startDate: '',
    endDate: '',
    teamId: '',
  });

  // Carregar equipes quando modal abrir
  useEffect(() => {
    if (open) {
      loadTeams();
    }
  }, [open]);

  const loadTeams = async () => {
    try {
      setLoadingTeams(true);
      const teamsData = await TeamsService.getTeams();
      // Filtrar apenas equipes que não estão vinculadas a outros projetos
      const availableTeams = teamsData.filter(team => !team.projectId);
      setTeams(availableTeams);
    } catch (error) {
      toast.error('Erro ao carregar lista de equipes');
    } finally {
      setLoadingTeams(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInputChange = (field: keyof CreateProjectData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nome do projeto é obrigatório');
      return;
    }
    // Datas são obrigatórias para criar cronograma
    if (!formData.startDate) {
      toast.error('Data de início é obrigatória');
      return;
    }
    if (!formData.endDate) {
      toast.error('Data de fim é obrigatória');
      return;
    }
    try {
      setLoading(true);
      const formatDateForAPI = (dateString: string) => {
        const date = new Date(dateString + 'T00:00:00');
        const offsetMinutes = date.getTimezoneOffset();
        const compensatedDate = new Date(date.getTime() - (offsetMinutes * 60 * 1000));
        const year = compensatedDate.getUTCFullYear();
        const month = String(compensatedDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(compensatedDate.getUTCDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
      };

      const projectData = {
        ...formData,
        startDate: formatDateForAPI(formData.startDate),
        endDate: formatDateForAPI(formData.endDate),
        teamId: formData.teamId && formData.teamId !== '' ? formData.teamId : undefined
      };

      await ProjectsService.createProject(projectData);
      
      toast.success('Projeto e cronograma criados com sucesso!');
      setOpen(false);
      setFormData({
        name: '',
        description: '',
        status: 'active',
        health: 'healthy',
        startDate: '',
        endDate: '',
        team: '',
      });
      onProjectCreated();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao criar projeto');
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'techlead')) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
          <Plus className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Projeto</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações Básicas</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Projeto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Digite o nome do projeto"
                required
              />
            </div>

            {/* CAMPO STATUS OCULTO - Será definido automaticamente como 'active' */}

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descreva o projeto"
                rows={3}
              />
            </div>


            {/* Dropdown de Equipe */}
            <div className="space-y-2">
              <Label htmlFor="team">Equipe do Projeto</Label>
              <Select 
                value={formData.teamId || undefined} 
                onValueChange={(value) => handleInputChange('teamId', value === 'none' ? '' : value)}
                disabled={loadingTeams}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingTeams ? "Carregando..." : "Selecione uma equipe (opcional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem equipe</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name} ({team.members?.length || 0} membros)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Datas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Datas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data de Início *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Data de Fim *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
          {/* Seção de Clientes removida - clientes devem ser vinculados após criação do projeto */}

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Projeto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
