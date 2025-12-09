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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Team, CreateTeamDto, UpdateTeamDto, User, WEEK_DAYS } from '@/types/team';
import { Project } from '@/types/user-management';
import { TeamsService } from '@/services/api/teams.service';
import { userManagementService } from '@/services/api/user-management.service';
import { ProjectsService } from '@/services/api/projects.service';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface TeamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  team?: Team | null;
  onSave: () => void;
}

interface MemberFormData {
  userId: number;
  dailyWorkHours: number;
  workDays: number[];
  isActive: boolean;
}

interface FormData {
  name: string;
  description: string;
  director: string;
  isActive: boolean;
  members: MemberFormData[];
  projectId: string
}

const TeamFormModal: React.FC<TeamFormModalProps> = ({
  isOpen,
  onClose,
  team,
  onSave,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    director: '',
    isActive: true,
    members: [],
    projectId: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [managers, setManagers] = useState<User[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const isEditing = !!team;

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadManagers();
      if (user && (user.role === 'admin' || user.role === 'manager' || user.role === 'techlead')) {
        loadProjects();
      }
      if (team) {
        // Editando equipe existente
        const membersData = team.members?.map(m => {
          let workDays: number[] = [];
          if (Array.isArray(m.workDays)) {
            workDays = m.workDays.map(day => Number(day)).filter(day => !isNaN(day));
          }
          
          return {
            userId: m.userId,
            dailyWorkHours: Number(m.dailyWorkHours),
            workDays,
            isActive: m.isActive ?? true,
          };
        }) || [];
        
        setFormData(prev => ({
          ...prev,
          name: team.name || '',
          description: team.description || '',
          director: team.director ? team.director.toString() : '',
          isActive: team.isActive ?? true,
          members: membersData,
        }));
      } else {
        // Criando nova equipe - selecionar automaticamente o usuário logado como diretor se for manager
        const defaultDirector = (user?.role === 'manager') ? user.id.toString() : '';
        setFormData({
          name: '',
          description: '',
          director: defaultDirector,
          isActive: true,
          members: [],
          projectId: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, team, user]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await userManagementService.getUsers({ limit: 100, status: 'active' });
      const developers = response.data.filter(u =>
        u.status === 'active' && (u.role === 'user' || u.role === 'qa' || u.role === 'techlead')
      );

      setAvailableUsers(developers);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadManagers = async () => {
    try {
      setLoadingManagers(true);
      const managersData = await userManagementService.getManagers();
      
      // Garantir que o usuário logado esteja na lista se for manager ou techlead
      let finalManagers = managersData;
      if (user && (user.role === 'manager' || user.role === 'techlead')) {
        const userExists = managersData.some(manager => manager.id === user.id);
        if (!userExists) {
          finalManagers = [...managersData, user];
        }
      }
      
      setManagers(finalManagers);
    } catch (error) {
      console.error('Erro ao carregar managers:', error);
      
      // Fallback: se falhar ao carregar managers, incluir apenas o usuário logado se for manager/techlead
      if (user && (user.role === 'manager' || user.role === 'techlead')) {
        setManagers([user]);
      } else {
        toast.error('Erro ao carregar lista de diretores');
      }
    } finally {
      setLoadingManagers(false);
    }
  };

  const loadProjects = async () => {
    try {      
      let projects;
      if (user?.role === 'admin') {
        // Admins podem ver todos os projetos para gerenciar equipes
        const response = await ProjectsService.getProjects({ limit: 100 });
        projects = response.projects || [];
      } else if (user?.role === 'manager' || user?.role === 'techlead') {
        // Managers e Techleads veem projetos onde são diretores
        projects = await userManagementService.getAvailableProjects();
      } else {
        // Outros roles não deveriam estar criando/editando equipes
        projects = [];
      }
    } catch (error) {
      toast.error('Erro ao carregar lista de projetos');
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

  const handleCheckboxChange = (field: 'isActive') => (checked: boolean) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
  };

  const addMember = () => {
    setFormData(prev => ({
      ...prev,
      members: [
        ...prev.members,
        {
          userId: 0,
          dailyWorkHours: 8,
          workDays: [1, 2, 3, 4, 5], // Segunda a Sexta por padrão
          isActive: true,
        },
      ],
    }));
  };

  const removeMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index),
    }));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateMember = (index: number, field: keyof MemberFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      ),
    }));
  };

  const toggleWorkDay = (memberIndex: number, day: number) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.map((m, i) => {
        if (i !== memberIndex) return m;
        const workDays = m.workDays.includes(day)
          ? m.workDays.filter(d => d !== day)
          : [...m.workDays, day].sort((a, b) => a - b);
        return { ...m, workDays };
      }),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.director) {
      newErrors.director = 'Diretor é obrigatório';
    }

    formData.members.forEach((member, index) => {
      if (!member.userId || member.userId === 0) {
        newErrors[`member_${index}_user`] = 'Selecione um membro';
      }
      if (member.dailyWorkHours <= 0 || member.dailyWorkHours > 24) {
        newErrors[`member_${index}_hours`] = 'Horas devem estar entre 1 e 24';
      }
      if (member.workDays.length === 0) {
        newErrors[`member_${index}_days`] = 'Selecione pelo menos um dia de trabalho';
      }

      const duplicateUser = formData.members.find(
        (m, i) => i !== index && m.userId === member.userId
      );
      if (duplicateUser) {
        newErrors[`member_${index}_user`] = 'Este membro já foi adicionado';
      }
    });

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
      const data: CreateTeamDto | UpdateTeamDto = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
        director: Number(formData.director),
        members: formData.members.map(m => ({
          userId: m.userId,
          dailyWorkHours: m.dailyWorkHours,
          workDays: m.workDays,
          isActive: m.isActive,
        })),
      };

      if (isEditing) {
        await TeamsService.updateTeam(team.id, data);
        toast.success('Equipe atualizada com sucesso');
      } else {
        await TeamsService.createTeam(data);
        toast.success('Equipe criada com sucesso');
      }

      onSave();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Erro ao salvar equipe';
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

  const getAvailableUsersForMember = (memberIndex: number) => {
    const selectedUserIds = formData.members
      .filter((_, i) => i !== memberIndex)
      .map(m => m.userId);
    return availableUsers.filter(u => !selectedUserIds.includes(u.id));
  };

  const hasAvailableUsers = availableUsers.length > 0;
  const allUsersAssigned = formData.members.length >= availableUsers.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Nova Equipe
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Equipe</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleInputChange('name')}
              placeholder="Ex: Equipe de Desenvolvimento Frontend"
              disabled={loading}
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
              placeholder="Descrição da equipe"
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Director */}
          <div className="space-y-2">
            <Label htmlFor="director">Diretor do Projeto</Label>
            <Select 
              value={formData.director} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, director: value }))}
              disabled={loadingManagers}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingManagers ? "Carregando..." : "Selecione um diretor"} />
              </SelectTrigger>
              <SelectContent>
                {managers.map((manager) => (
                  <SelectItem key={manager.id} value={manager.id.toString()}>
                    {manager.name} ({manager.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.director && (
              <p className="text-sm text-destructive">{errors.director}</p>
            )}
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={handleCheckboxChange('isActive')}
              disabled={loading}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Equipe ativa
            </Label>
          </div>

          {/* Members Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Membros da Equipe</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMember}
                disabled={loading || loadingUsers || allUsersAssigned || !hasAvailableUsers}
                title={
                  !hasAvailableUsers
                    ? 'Nenhum usuário disponível'
                    : allUsersAssigned
                    ? 'Todos os usuários já foram adicionados'
                    : 'Adicionar Usuário'
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Usuário
              </Button>
            </div>

            {!loadingUsers && !hasAvailableUsers && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Atenção:</strong> Não há membros cadastrados no sistema.
                  Cadastre usuários primeiro em "Usuários" para poder adicioná-los à equipe.
                </p>
              </div>
            )}

            {formData.members.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-6">
                    <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Nenhum membro adicionado ainda
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMember}
                      disabled={loading || loadingUsers}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Primeiro Usuário
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {formData.members.map((member, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <span className="text-sm font-medium">Membro</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMember(index)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* User Selection */}
                          <div className="col-span-2 space-y-2">
                            <Select
                              value={member.userId > 0 ? member.userId.toString() : ''}
                              onValueChange={(value) =>
                                updateMember(index, 'userId', parseInt(value))
                              }
                              disabled={loading || loadingUsers}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um usuário" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableUsersForMember(index).length > 0 ? (
                                  getAvailableUsersForMember(index).map((user) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                      {user.name} ({user.email})
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="0" disabled>
                                    Nenhum membro disponível
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            {errors[`member_${index}_user`] && (
                              <p className="text-sm text-destructive">
                                {errors[`member_${index}_user`]}
                              </p>
                            )}
                          </div>

                          {/* Daily Work Hours */}
                          <div className="space-y-2">
                            <Label>Horas de Trabalho/Dia *</Label>
                            <Input
                              type="number"
                              min="1"
                              max="24"
                              step="0.5"
                              value={member.dailyWorkHours}
                              onChange={(e) =>
                                updateMember(
                                  index,
                                  'dailyWorkHours',
                                  parseFloat(e.target.value)
                                )
                              }
                              disabled={loading}
                            />
                            {errors[`member_${index}_hours`] && (
                              <p className="text-sm text-destructive">
                                {errors[`member_${index}_hours`]}
                              </p>
                            )}
                          </div>

                          {/* Active Status */}
                          <div className="flex items-center space-x-2 pt-8">
                            <Checkbox
                              id={`member_${index}_active`}
                              checked={member.isActive}
                              onCheckedChange={(checked) =>
                                updateMember(index, 'isActive', checked)
                              }
                              disabled={loading}
                            />
                            <Label
                              htmlFor={`member_${index}_active`}
                              className="cursor-pointer"
                            >
                              Ativo
                            </Label>
                          </div>

                          {/* Work Days */}
                          <div className="col-span-2 space-y-2">
                            <Label>Dias de Trabalho *</Label>
                            <div className="flex flex-wrap gap-2">
                              {WEEK_DAYS.map((day) => {
                                const isChecked = member.workDays.includes(day.value);
                                return (
                                <div
                                  key={day.value}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`member_${index}_day_${day.value}`}
                                    checked={isChecked}
                                    onCheckedChange={() =>
                                      toggleWorkDay(index, day.value)
                                    }
                                    disabled={loading}
                                  />
                                  <Label
                                    htmlFor={`member_${index}_day_${day.value}`}
                                    className="cursor-pointer text-sm"
                                  >
                                    {day.label}
                                  </Label>
                                </div>
                                );
                              })}
                            </div>
                            {errors[`member_${index}_days`] && (
                              <p className="text-sm text-destructive">
                                {errors[`member_${index}_days`]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
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
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TeamFormModal;
