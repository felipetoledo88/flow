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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, CreateUserDto, UpdateUserDto, Project, USER_ROLES, USER_STATUSES } from '@/types/user-management';
import { userManagementService } from '@/services/api/user-management.service';
import { toast } from 'sonner';
import { Loader2, Link } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  onSave: () => void;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: 'admin' | 'manager' | 'user' | 'client' | 'techlead' | 'qa';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  selectedProjects: string[];
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
}) => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    status: 'active',
    selectedProjects: [],
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const isEditing = !!user;

  useEffect(() => {
    if (isOpen) {
      loadProjects();
      if (user) {
        // Editing existing user
        const selectedProjectIds = user.clientProjects?.map(p => p.id.toString()) || [];
        setFormData({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          password: '',
          confirmPassword: '',
          role: user.role || 'user',
          status: user.status || 'active',
          selectedProjects: selectedProjectIds,
        });
      } else {
        // Creating new user
        setFormData({
          name: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: '',
          role: 'user',
          status: 'active',
          selectedProjects: [],
        });
      }
      setErrors({});
    }
  }, [isOpen, user]);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const projects = await userManagementService.getAvailableProjects();
      setAvailableProjects(projects);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSelectChange = (field: 'role' | 'status') => (value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      [field]: value
    }));
  };

  const handleProjectToggle = (projectId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedProjects: prev.selectedProjects.includes(projectId)
        ? prev.selectedProjects.filter(id => id !== projectId)
        : [...prev.selectedProjects, projectId]
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email deve ter um formato válido';
    }

    // Role validation for directors/techleads - they can't create admin users
    if ((currentUser?.role === 'manager' || currentUser?.role === 'techlead') && formData.role === 'admin') {
      newErrors.role = 'Diretores e Tech Leads não podem criar usuários administradores';
    }

    // Password validation
    if (!isEditing) {
      if (!formData.password) {
        newErrors.password = 'Senha é obrigatória';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Senha deve ter pelo menos 8 caracteres';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Senhas não coincidem';
      }
    } else if (formData.password) {
      if (formData.password.length < 8) {
        newErrors.password = 'Senha deve ter pelo menos 8 caracteres';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Senhas não coincidem';
      }
    }

    // Phone validation (optional)
    if (formData.phone && !/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(formData.phone)) {
      const phoneNumbers = formData.phone.replace(/\D/g, '');
      if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
        newErrors.phone = 'Telefone deve ter 10 ou 11 dígitos';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isEditing) {
        // Update existing user
        const updateData: UpdateUserDto = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          status: formData.status,
          role: formData.role,
        };

        // Only include projects for client role
        if (formData.role === 'client') {
          updateData.projectIds = formData.selectedProjects.map(id => parseInt(id));
        }

        await userManagementService.updateUser(user.id, updateData);

        // Update password separately if provided
        if (formData.password) {
          await userManagementService.resetUserPassword(user.id, formData.password);
        }

        toast.success('Usuário atualizado com sucesso');
      } else {
        // Create new user
        const createData: CreateUserDto = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
          status: 'active', // Garantir que o usuário seja criado como ativo
          phone: formData.phone.trim() || undefined,
        };

        // Only include projects for client role
        if (formData.role === 'client') {
          createData.projectIds = formData.selectedProjects.map(id => parseInt(id));
        }

        await userManagementService.createUser(createData);
        toast.success('Usuário criado com sucesso');
      }

      onSave();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Erro ao salvar usuário';
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

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const getAvailableRoles = () => {
    if (currentUser?.role === 'admin') {
      return ['admin', 'manager', 'techlead', 'user', 'client', 'qa'] as const;
    }
    if (currentUser?.role === 'manager' || currentUser?.role === 'techlead') {
      return ['user', 'client', 'qa'] as const;
    }
    return ['user'] as const;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleInputChange('name')}
              placeholder="Nome completo"
              disabled={loading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              placeholder="email@exemplo.com"
              disabled={loading}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Role */}
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={formData.role}
                onValueChange={handleSelectChange('role')}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles().map(role => (
                    <SelectItem key={role} value={role}>
                      {USER_ROLES[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-destructive">{errors.role}</p>
              )}
            </div>

            {/* Status (only for editing) */}
            {isEditing && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={handleSelectChange('status')}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(USER_STATUSES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder="(11) 99999-9999"
              disabled={loading}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
          </div>

          {/* Project Selection for Clients */}
          {formData.role === 'client' && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Projetos Vinculados
              </Label>
              {/* Debug info */}
              {loadingProjects ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Carregando projetos...
                </div>
              ) : availableProjects.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Selecione os projetos que este cliente deve ter acesso:
                  </div>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-3">
                    {availableProjects.map((project) => (
                      <div key={project.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-md transition-colors">
                        <Checkbox
                          id={project.id}
                          checked={formData.selectedProjects.includes(project.id.toString())}
                          onCheckedChange={() => handleProjectToggle(project.id.toString())}
                          disabled={loading}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={project.id}
                            className="text-sm font-medium leading-none cursor-pointer block"
                          >
                            {project.name}
                          </label>
                          {project.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Resumo dos projetos selecionados */}
                  {formData.selectedProjects.length > 0 && (
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-xs font-medium text-blue-800 mb-1">
                        Projetos selecionados ({formData.selectedProjects.length}):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {formData.selectedProjects.map(projectId => {
                          const project = availableProjects.find(p => p.id.toString() === projectId);
                          return project ? (
                            <span key={projectId} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                              {project.name}
                              <button
                                type="button"
                                onClick={() => handleProjectToggle(projectId)}
                                className="hover:bg-blue-200 rounded p-0.5"
                                disabled={loading}
                              >
                                ×
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 border rounded-md bg-gray-50">
                  <p className="text-sm text-muted-foreground">
                    {currentUser?.role === 'admin' 
                      ? 'Nenhum projeto disponível no sistema' 
                      : 'Você não possui projetos para vincular a clientes'
                    }
                  </p>
                  {(currentUser?.role === 'manager' || currentUser?.role === 'techlead') && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Apenas projetos que você criou aparecem aqui
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Senha {!isEditing ? '*' : '(deixe vazio para manter atual)'}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              placeholder="Mínimo 8 caracteres"
              disabled={loading}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          {(!isEditing || formData.password) && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                placeholder="Digite a senha novamente"
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
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
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormModal;