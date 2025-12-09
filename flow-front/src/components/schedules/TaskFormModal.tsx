import React, { useState, useEffect, useRef } from 'react';
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
import { ScheduleTask, CreateScheduleTaskDto, UpdateScheduleTaskDto, TaskStatusCode, Schedule, TaskComment } from '@/types/schedule';
import { SchedulesService } from '@/services/api/schedules.service';
import { SprintsService, Sprint } from '@/services/api/sprints.service';
import { AuthService } from '@/services/api/auth.service';
import { User } from '@/types/auth';
import { toast } from 'sonner';
import { Loader2, Paperclip, Download, FileIcon, Trash2, Send, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTaskStatus } from '@/hooks';
import { HoursInput } from '@/components/ui/hours-input';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: ScheduleTask | null;
  scheduleId?: number;
  projectId?: number;
  teamMembers?: Array<{ id: string; name: string; email: string }>;
  onSave: (taskWasCompleted?: boolean, forceRecalculate?: boolean) => void;
}

interface FormData {
  title: string;
  description: string;
  assigneeId: number;
  estimatedHours: number;
  sprintId: number | null;
  statusId: number;
  order: number;
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  task,
  scheduleId,
  projectId,
  teamMembers = [],
  onSave,
}) => {
  const { statuses, isLoading: statusesLoading, getStatusId } = useTaskStatus(projectId);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    assigneeId: 0,
    estimatedHours: 8,
    sprintId: null,
    statusId: 0,
    order: 0,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<TaskComment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!task;

  useEffect(() => {
    const authData = AuthService.getAuthData();
    if (authData.user) {
      setCurrentUser(authData.user);
    }
  }, []);

  useEffect(() => {
    if (statuses.length > 0 && formData.statusId === 0) {
      const todoStatusId = getStatusId(TaskStatusCode.TODO);
      if (todoStatusId) {
        setFormData(prev => ({ ...prev, statusId: todoStatusId }));
      }
    }
  }, [statuses, formData.statusId, getStatusId]);

  useEffect(() => {
    const loadSprintsAndSchedule = async () => {
      if (isOpen && scheduleId) {
        try {
          const scheduleData = await SchedulesService.getSchedule(scheduleId);
          setSchedule(scheduleData);
          if (scheduleData.project?.id) {
            const projectSprints = await SprintsService.getSprints(scheduleData.project.id);
            setSprints(projectSprints);
          }
        } catch (error) {
          toast.error('Erro ao carregar sprints');
        }
      }
    };

    loadSprintsAndSchedule();
  }, [isOpen, scheduleId]);

  useEffect(() => {
    const fetchNextOrder = async () => {
      if (scheduleId && !task) {
        try {
          const tasks = await SchedulesService.getTasksBySchedule(scheduleId);
          
          const autoAssigneeId = currentUser && (currentUser.role === 'user' || currentUser.role === 'qa')
            ? parseInt(currentUser.id) 
            : 0;
          const todoStatusId = getStatusId(TaskStatusCode.TODO) || 1;
          setFormData({
            title: '',
            description: '',
            assigneeId: autoAssigneeId,
            estimatedHours: 8,
            sprintId: null,
            statusId: todoStatusId,
            order: 0,
          });
        } catch (error) {
          const autoAssigneeId = currentUser && (currentUser.role === 'user' || currentUser.role === 'qa')
            ? parseInt(currentUser.id) 
            : 0;

          const todoStatusId = getStatusId(TaskStatusCode.TODO) || 1;
          setFormData({
            title: '',
            description: '',
            assigneeId: autoAssigneeId,
            estimatedHours: 8,
            sprintId: null,
            statusId: todoStatusId,
            order: 0,
          });
        }
      }
    };

    const fetchExistingAttachments = async () => {
      if (task) {
        try {
          const commentsData = await SchedulesService.getTaskComments(task.id);
          const attachmentComments = commentsData.filter(comment => comment.fileName);
          setExistingAttachments(attachmentComments);
          setComments(commentsData);
        } catch (error) {
          console.error('Erro ao carregar anexos existentes:', error);
        }
      }
    };

    if (isOpen) {
      if (task) {
        setFormData({
          title: task.title || '',
          description: task.description || '',
          assigneeId: task.assigneeId,
          estimatedHours: Number(task.estimatedHours),
          sprintId: task.sprintId || null,
          statusId: task.statusId,
          order: task.order || 0,
        });
        fetchExistingAttachments();
      } else {
        fetchNextOrder();
        setExistingAttachments([]);
        setComments([]);
      }
      setErrors({});
      setNewComment('');
    }
  }, [isOpen, task, scheduleId, currentUser]);

  const canEditAssignee = () => {
    return currentUser && currentUser.role !== 'user' && currentUser.role !== 'qa';
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task) return;

    try {
      const newCommentObj = await SchedulesService.createTaskComment(task.id, newComment);
      setComments([newCommentObj, ...comments]);
      setNewComment('');
      toast.success('Comentário adicionado com sucesso');
    } catch (error) {
      toast.error('Erro ao adicionar comentário');
    }
  };

  const removeComment = async (id: number) => {
    try {
      await SchedulesService.deleteTaskComment(id);
      setComments(comments.filter(comment => comment.id !== id));
      toast.success('Comentário removido com sucesso');
    } catch (error) {
      toast.error('Erro ao remover comentário');
    }
  };

  const handleCommentFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && task) {
      try {
        const fileComment = await SchedulesService.createTaskCommentWithFile(task.id, file);
        setComments([fileComment, ...comments]);
        toast.success('Arquivo anexado como comentário com sucesso');
        if (commentFileInputRef.current) {
          commentFileInputRef.current.value = '';
        }
      } catch (error) {
        toast.error('Erro ao anexar arquivo como comentário');
      }
    }
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      const fullUrl = `${API_BASE_URL}${fileUrl}`;
      
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${fileName} baixado com sucesso`);
    } catch (error) {
      toast.error('Erro ao baixar arquivo');
    }
  };

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = field === 'estimatedHours' || field === 'order'
      ? parseFloat(e.target.value) || 0
      : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSelectChange = (field: 'assigneeId' | 'statusId' | 'sprintId') => (value: string) => {
    if (field === 'statusId') {
      setFormData(prev => ({ ...prev, [field]: parseInt(value) }));
    } else if (field === 'sprintId') {
      setFormData(prev => ({ ...prev, [field]: value === 'none' ? null : parseInt(value) }));
    } else {
      setFormData(prev => ({ ...prev, [field]: parseInt(value) }));
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }
    if (!formData.assigneeId || formData.assigneeId === 0) {
      newErrors.assigneeId = 'Selecione um responsável';
    }
    if (formData.estimatedHours <= 0) {
      newErrors.estimatedHours = 'Horas estimadas devem ser maior que zero';
    }

    const completedStatusId = getStatusId(TaskStatusCode.COMPLETED);
    if (completedStatusId && formData.statusId === completedStatusId && isEditing && task) {
      const actualHours = task.actualHours || 0;
      if (actualHours <= 0) {
        newErrors.statusId = 'Não é possível marcar a atividade como concluída sem lançar horas. Registre as horas trabalhadas antes de finalizar a atividade.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setUploadedFiles(prev => [...prev, ...files]);
      toast.success(`${files.length} arquivo(s) selecionado(s) para anexar`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownloadFile = async (attachment: TaskComment) => {
    if (attachment.fileUrl) {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
        const fullUrl = `${API_BASE_URL}${attachment.fileUrl}`;
        
        const response = await fetch(fullUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to download file');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.fileName || 'arquivo';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success(`${attachment.fileName || 'arquivo'} baixado com sucesso`);
      } catch (error) {
        toast.error('Erro ao baixar arquivo');
      }
    }
  };

  const handleDeleteAttachment = async (attachment: TaskComment) => {
    try {
      await SchedulesService.deleteTaskComment(attachment.id);
      setExistingAttachments(prev => prev.filter(item => item.id !== attachment.id));
      toast.success('Arquivo excluído com sucesso');
    } catch (error) {
      toast.error('Erro ao excluir arquivo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    if (!isEditing && !scheduleId) {
      toast.error('ID do cronograma não fornecido');
      return;
    }

    const completedStatusId = getStatusId(TaskStatusCode.COMPLETED);
    if (completedStatusId && formData.statusId === completedStatusId && isEditing && task) {
      const actualHours = task.actualHours || 0;
      if (actualHours <= 0) {
        toast.error('Não é possível marcar a atividade como concluída sem lançar horas. Registre as horas trabalhadas antes de finalizar a atividade.');
        return;
      }
    }

    setLoading(true);

    try {
      let finalOrder: number | undefined = formData.order;

      const isBacklogValue = formData.sprintId === null || formData.sprintId === undefined ? true : false;

      const data: CreateScheduleTaskDto | UpdateScheduleTaskDto = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        assigneeId: formData.assigneeId,
        estimatedHours: formData.estimatedHours,
        sprintId: formData.sprintId ?? null,
        statusId: formData.statusId,
        order: finalOrder,
        isBacklog: isBacklogValue,
      };

      let taskId: number;
      let estimatedHoursChanged = false;
      
      if (isEditing) {
        estimatedHoursChanged = task && Number(task.estimatedHours) !== Number(formData.estimatedHours);
        
        await SchedulesService.updateTask(task.id, data);
        taskId = task.id;
        
        if (estimatedHoursChanged) {
          toast.success('Atividade atualizada com sucesso. Datas serão recalculadas.');
        } else {
          toast.success('Atividade atualizada com sucesso');
        }
      } else {
        const newTask = await SchedulesService.createTask(scheduleId!, data);
        taskId = newTask.id;
        const location = formData.sprintId 
          ? `na sprint "${sprints.find(s => s.id === formData.sprintId)?.name || 'selecionada'}"` 
          : 'no backlog';
        toast.success(`Atividade criada ${location} com sucesso`);
        estimatedHoursChanged = true;
      }

      if (uploadedFiles.length > 0) {
        try {
          for (const file of uploadedFiles) {
            await SchedulesService.createTaskCommentWithFile(taskId, file);
          }
          toast.success(`${uploadedFiles.length} arquivo(s) anexado(s) com sucesso`);
        } catch (fileError) {
          toast.error('Tarefa salva, mas houve erro ao anexar alguns arquivos');
        }
      }

      setUploadedFiles([]);
      const completedStatusId = getStatusId(TaskStatusCode.COMPLETED);
      const taskWasCompleted = completedStatusId && formData.statusId === completedStatusId;
      onSave(taskWasCompleted, estimatedHoursChanged);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Erro ao salvar atividade';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setUploadedFiles([]);
      setNewComment('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Atividade' : 'Nova Atividade'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={handleInputChange('title')}
              placeholder="Ex: Implementar tela de login"
              disabled={loading}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={handleInputChange('description')}
              placeholder="Descrição detalhada da atividade"
              disabled={loading}
              rows={3}
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Anexar Arquivos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Anexar Arquivo
              </Button>
            </div>

            {/* Arquivos já anexados */}
            {existingAttachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">
                  Arquivos já anexados:
                </p>
                <div className="space-y-1">
                  {existingAttachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-3 py-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-blue-800 truncate block">
                            {attachment.fileName}
                          </span>
                          {attachment.fileSize && (
                            <span className="text-xs text-blue-600">
                              {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadFile(attachment)}
                          disabled={loading}
                          className="text-blue-600 hover:text-blue-800"
                          title="Baixar arquivo"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAttachment(attachment)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-800"
                          title="Excluir arquivo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Novos arquivos para anexar */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">
                  {uploadedFiles.length} novo(s) arquivo(s) selecionado(s):
                </p>
                <div className="space-y-1">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-3 py-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Paperclip className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-green-800 truncate">
                          {file.name}
                        </span>
                        <span className="text-xs text-green-600">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={loading}
                        className="text-green-600 hover:text-green-800"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mov,.zip,.rar"
            />
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label>Responsável *</Label>
            <Select
              value={formData.assigneeId.toString()}
              onValueChange={handleSelectChange('assigneeId')}
              disabled={loading || !canEditAssignee()}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id.toString()}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assigneeId && (
              <p className="text-sm text-destructive">{errors.assigneeId}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Estimated Hours */}
            <HoursInput
              label="Tempo Estimado *"
              value={formData.estimatedHours}
              onChange={(value) => setFormData(prev => ({ ...prev, estimatedHours: value }))}
              disabled={loading}
              error={errors.estimatedHours}
              minHours={0}
            />

            {/* Sprint */}
            <div className="space-y-2">
              <Label>Sprint</Label>
              <Select
                value={formData.sprintId ? formData.sprintId.toString() : "none"}
                onValueChange={handleSelectChange('sprintId')}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma sprint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem sprint (Backlog)</SelectItem>
                  {sprints.map((sprint) => (
                    <SelectItem key={sprint.id} value={sprint.id.toString()}>
                      {sprint.name}
                      {sprint.expectDate && sprint.expectEndDate && (
                        <span className="text-muted-foreground text-xs ml-2">
                          ({new Date(sprint.expectDate).toLocaleDateString()} - {new Date(sprint.expectEndDate).toLocaleDateString()})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.statusId.toString()}
                onValueChange={handleSelectChange('statusId')}
                disabled={loading || statusesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={statusesLoading ? "Carregando..." : "Selecione o status"} />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id.toString()}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.statusId && (
                <p className="text-sm text-destructive">{errors.statusId}</p>
              )}
            </div>

            {/* Order */}
            <div className="space-y-2">
              <Label htmlFor="order">Ordem</Label>
              <Input
                id="order"
                type="number"
                min="0"
                value={formData.order}
                onChange={handleInputChange('order')}
                disabled={loading}
                placeholder="0 para Sprint, 99 para Backlog"
              />
            </div>
          </div>

          {/* Comentários - apenas para edição */}
          {isEditing && task && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Comentários</h3>
              
              {/* Lista de comentários */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(comment.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{comment.user.name}</span>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeComment(comment.id)}
                        disabled={loading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Se for um arquivo */}
                    {comment.fileName ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Paperclip className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{comment.fileName}</span>
                        <span className="text-xs text-gray-500">
                          ({comment.mimeType}) - {comment.fileSize ? (comment.fileSize / (1024 * 1024)).toFixed(1) : '0'} MB
                        </span>
                        {comment.fileUrl && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => downloadFile(comment.fileUrl!, comment.fileName!)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">{comment.text}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Novo comentário */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Adicione um comentário..."
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    disabled={loading}
                  />
                  <Button onClick={handleAddComment} size="sm" disabled={loading || !newComment.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <input
                ref={commentFileInputRef}
                type="file"
                className="hidden"
                onChange={handleCommentFileUpload}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mov,.zip,.rar"
              />
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>💡 Datas Automáticas:</strong> As datas de início e término serão calculadas
              automaticamente com base na ordem das atividades, horas estimadas e capacidade
              do responsável.
            </p>
          </div>

          {!isEditing && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-700">
                <strong>📋 Localização:</strong> Se nenhuma Sprint for selecionada, a atividade será criada no <strong>Backlog</strong> (ordem 99). 
                Se uma Sprint for selecionada, ela receberá a próxima ordem disponível nessa Sprint.
              </p>
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
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskFormModal;
