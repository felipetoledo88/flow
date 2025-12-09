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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Schedule, CreateScheduleDto, UpdateScheduleDto, ScheduleStatus, SCHEDULE_STATUS_LABELS } from '@/types/schedule';
import { SchedulesService } from '@/services/api/schedules.service';
import { TeamsService } from '@/services/api/teams.service';
import { Team } from '@/types/team';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ScheduleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule?: Schedule | null;
  onSave: () => void;
}


interface FormData {
  name: string;
  description: string;
  teamId: number;
  status: ScheduleStatus;
  startDate: string;
  expectedEndDate: string;
}

const ScheduleFormModal: React.FC<ScheduleFormModalProps> = ({
  isOpen,
  onClose,
  schedule,
  onSave,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    teamId: 0,
    status: ScheduleStatus.PLANNING,
    startDate: new Date().toISOString().split('T')[0],
    expectedEndDate: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const isEditing = !!schedule;

  useEffect(() => {
    if (isOpen) {
      const initializeForm = async () => {
        await loadData();
        
        if (schedule) {
          const teamId = typeof schedule.teamId === 'string' 
            ? (isNaN(parseInt(schedule.teamId, 10)) ? 0 : parseInt(schedule.teamId, 10))
            : (schedule.teamId || 0);
          setFormData({
            name: schedule.name || '',
            description: schedule.description || '',
            teamId: teamId,
            status: schedule.status,
            startDate: schedule.startDate
              ? new Date(schedule.startDate).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            expectedEndDate: schedule.expectedEndDate
              ? new Date(schedule.expectedEndDate).toISOString().split('T')[0]
              : '',
          });
        } else {
          setFormData({
            name: '',
            description: '',
            teamId: 0,
            status: ScheduleStatus.PLANNING,
            startDate: new Date().toISOString().split('T')[0],
            expectedEndDate: '',
          });
        }
        setErrors({});
      };
      
      initializeForm();
    }
  }, [isOpen, schedule]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const teamsData = await TeamsService.getTeams();
      const activeTeams = teamsData.filter(t => t.isActive);
      setTeams(activeTeams);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSelectChange = (field: 'teamId' | 'status') => (value: string) => {
    if (field === 'status') {
      setFormData(prev => ({ ...prev, [field]: value as ScheduleStatus }));
    } else {
      setFormData(prev => ({ ...prev, [field]: parseInt(value) }));
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }


    if (!formData.teamId || formData.teamId === 0) {
      newErrors.teamId = 'Selecione uma equipe';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Data de início é obrigatória';
    }

    if (!formData.expectedEndDate) {
      newErrors.expectedEndDate = 'Data fim prevista é obrigatória';
    }

    if (formData.startDate && formData.expectedEndDate) {
      if (new Date(formData.expectedEndDate) < new Date(formData.startDate)) {
        newErrors.expectedEndDate = 'Data fim prevista deve ser posterior à data de início';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    setLoading(true);

    try {
      // Converter datas para ISO com timezone local (meio-dia para evitar problemas de timezone)
      const startDateISO = new Date(formData.startDate + 'T12:00:00').toISOString();
      const expectedEndDateISO = new Date(formData.expectedEndDate + 'T12:00:00').toISOString();

      const data: CreateScheduleDto | UpdateScheduleDto = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        teamId: formData.teamId,
        status: formData.status,
        startDate: startDateISO,
        expectedEndDate: expectedEndDateISO,
      };

      if (isEditing) {
        await SchedulesService.updateSchedule(schedule.id, data);
        toast.success('Cronograma atualizado com sucesso');
      } else {
        await SchedulesService.createSchedule(data);
        toast.success('Cronograma criado com sucesso');
      }

      onSave();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Erro ao salvar cronograma';
      toast.error(errorMessage);
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Cronograma' : 'Novo Cronograma'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Cronograma *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleInputChange('name')}
              placeholder="Ex: Sprint 1 - Desenvolvimento Frontend"
              disabled={loading || loadingData}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={handleInputChange('description')}
              placeholder="Descrição detalhada do cronograma"
              disabled={loading || loadingData}
              rows={3}
            />
          </div>

          {/* Projeto - Removido: projeto agora é definido através da equipe vinculada */}

          {/* Team */}
          <div className="space-y-2">
            <Label>Equipe *</Label>
            <Select
              value={formData.teamId > 0 ? formData.teamId.toString() : ""}
              onValueChange={handleSelectChange('teamId')}
              disabled={loading || loadingData}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma equipe" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id.toString()}>
                    {team.name} ({team.members?.length || 0} membros)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.teamId && (
              <p className="text-sm text-destructive">{errors.teamId}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleInputChange('startDate')}
                disabled={loading || loadingData}
              />
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate}</p>
              )}
            </div>

            {/* Expected End Date */}
            <div className="space-y-2">
              <Label htmlFor="expectedEndDate">Data Fim Prevista *</Label>
              <Input
                id="expectedEndDate"
                type="date"
                value={formData.expectedEndDate}
                onChange={handleInputChange('expectedEndDate')}
                disabled={loading || loadingData}
              />
              {errors.expectedEndDate && (
                <p className="text-sm text-destructive">{errors.expectedEndDate}</p>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>💡 Informação:</strong> As datas das atividades serão calculadas automaticamente
              a partir da data de início do cronograma, considerando as horas estimadas e a capacidade
              de cada desenvolvedor.
            </p>
            <p className="text-sm text-blue-600 mt-2">
              <strong>🔗 Projeto:</strong> O projeto será definido automaticamente com base na equipe selecionada.
            </p>
          </div>

          {/* Status */}
          {isEditing && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={handleSelectChange('status')}
                disabled={loading || loadingData}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SCHEDULE_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading || loadingData}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleFormModal;
