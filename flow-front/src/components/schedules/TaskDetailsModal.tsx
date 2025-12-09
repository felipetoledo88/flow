import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor, RichTextViewer, AttachedFile } from '@/components/ui/rich-text-editor';
import { Task, TaskComment, TaskAttachment, TaskHoursHistory, UpdateTaskHoursDto } from '@/types/schedule';
import { SchedulesService } from '@/services/api/schedules.service';
import { TaskHoursReason, TaskHoursReasonLabels } from '@/enums/task-hours-reason.enum';
import {
  Clock,
  User,
  Calendar,
  Plus,
  Paperclip,
  Download,
  X,
  Save,
  History,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onUpdateTask?: (task: Task) => void;
}


const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  isOpen,
  onClose,
  task,
  onUpdateTask
}) => {
  const [description, setDescription] = useState(task?.description || '');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [hours, setHours] = useState('');
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState<TaskHoursReason | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [hoursHistory, setHoursHistory] = useState<TaskHoursHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Estados para edição e exclusão de histórico
  const [editingEntry, setEditingEntry] = useState<TaskHoursHistory | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Estados para edição do título
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(task?.title || '');
  const [entryToDelete, setEntryToDelete] = useState<TaskHoursHistory | null>(null);
  const [editHours, setEditHours] = useState<number>(0);
  const [editComment, setEditComment] = useState<string>('');

  // Estados para edição de comentário
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>('');

  // Estados para arquivos anexados no novo comentário
  const [commentAttachedFiles, setCommentAttachedFiles] = useState<AttachedFile[]>([]);

  // Estados para anexos da descrição
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Hook para autenticação
  const { user: currentUser } = useAuth();

  // Sincronizar título com a tarefa atual
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setIsEditingTitle(false);
    }
  }, [task]);

  // Função para verificar se o usuário pode editar/excluir entrada de horas
  const canAccessHoursEntryOptions = (entry: TaskHoursHistory) => {
    if (!currentUser) return false;
    if (currentUser.role === 'client') return false;
    if (currentUser.role !== 'user' && currentUser.role !== 'qa') return true;
    return entry.user.id === parseInt(currentUser.id);
  };

  // Função para verificar se o usuário pode editar/excluir comentário
  const canEditComment = (comment: TaskComment) => {
    if (!currentUser) return false;
    // Só pode editar/excluir comentários próprios
    return comment.user.id === parseInt(currentUser.id);
  };

  // Carregar histórico, comentários e anexos quando o modal abrir
  React.useEffect(() => {
    if (isOpen && task) {
      loadHoursHistory();
      loadComments();
      loadAttachments();
    }
  }, [isOpen, task]);

  // Resetar campos do formulário quando o modal abrir ou a tarefa mudar
  React.useEffect(() => {
    if (isOpen) {
      setHours('');
      setComment('');
      setReason('');
      setNewComment('');
    }
  }, [isOpen, task]);

  // Atualizar descrição quando a task mudar
  React.useEffect(() => {
    if (task) {
      setDescription(task.description || '');
    }
  }, [task]);

  if (!task) return null;

  // Função para formatar data e hora
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Carregar histórico real de horas
  const loadHoursHistory = async () => {
    if (!task) return;
    
    setLoadingHistory(true);
    try {
      const historyData = await SchedulesService.getTaskHoursHistory(task.id);
      setHoursHistory(historyData);
    } catch (error) {
      setHoursHistory([]);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico de horas.",
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadComments = async () => {
    if (!task) return;

    try {
      const commentsData = await SchedulesService.getTaskComments(task.id);
      setComments(commentsData);
    } catch (error) {
      setComments([]);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os comentários.",
        variant: "destructive",
      });
    }
  };

  const loadAttachments = async () => {
    if (!task) return;

    setLoadingAttachments(true);
    try {
      const attachmentsData = await SchedulesService.getTaskAttachments(task.id);
      setAttachments(attachmentsData);
    } catch (error) {
      setAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !task) return;

    setIsLoading(true);
    try {
      const newAttachment = await SchedulesService.createTaskAttachment(task.id, file);
      setAttachments([newAttachment, ...attachments]);
      toast({
        title: "Anexo adicionado",
        description: `${file.name} foi anexado com sucesso.`,
      });

      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o anexo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeAttachment = async (attachmentId: number) => {
    setIsLoading(true);
    try {
      await SchedulesService.deleteTaskAttachment(attachmentId);
      setAttachments(attachments.filter(a => a.id !== attachmentId));
      toast({
        title: "Anexo removido",
        description: "O anexo foi removido com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o anexo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canDeleteAttachment = (attachment: TaskAttachment) => {
    if (!currentUser) return false;
    return attachment.userId === parseInt(currentUser.id);
  };

  // Upload de imagem inline para o editor
  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      const url = await SchedulesService.uploadImage(file);
      return url;
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload da imagem.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Anexar arquivo no comentário
  const handleCommentFileAttach = async (file: File) => {
    const newAttachedFile: AttachedFile = {
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    };
    setCommentAttachedFiles(prev => [...prev, newAttachedFile]);
  };

  // Remover arquivo anexado do comentário
  const handleRemoveCommentFile = (index: number) => {
    setCommentAttachedFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };


  const getProgressColor = () => {
    const actualHours = Number(task.actualHours) || 0;
    const estimatedHours = Number(task.estimatedHours) || 0;
    
    if (actualHours > estimatedHours) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  const getProgressPercentage = () => {
    const actualHours = Number(task.actualHours) || 0;
    const estimatedHours = Number(task.estimatedHours) || 0;
    
    if (estimatedHours === 0) return 0;
    return Math.min((actualHours / estimatedHours) * 100, 100);
  };

  const handleSaveDescription = async () => {
    if (!task) return;

    setIsLoading(true);
    try {
      await SchedulesService.updateTask(task.id, { description });
      if (onUpdateTask) {
        onUpdateTask({ ...task, description });
      }
      
      toast({
        title: "Descrição atualizada",
        description: "A descrição da tarefa foi atualizada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a descrição.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!task || !title.trim()) return;

    setIsLoading(true);
    try {
      await SchedulesService.updateTask(task.id, { title: title.trim() });
      if (onUpdateTask) {
        onUpdateTask({ ...task, title: title.trim() });
      }
      
      setIsEditingTitle(false);
      
      toast({
        title: "Título atualizado",
        description: "O título da tarefa foi atualizado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o título.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTitleEdit = () => {
    setTitle(task?.title || '');
    setIsEditingTitle(false);
  };

  const handleAddHours = async () => {
    const hoursToAdd = parseFloat(hours);
    
    if (!hours || hoursToAdd <= 0) {
      toast({
        title: "Erro",
        description: "Por favor, insira um valor válido de horas.",
        variant: "destructive",
      });
      return;
    }

    if (!reason) {
      toast({
        title: "Erro",
        description: "Por favor, selecione o motivo do lançamento.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Calcular o novo total de horas
      const newTotalHours = Number(task.actualHours) + hoursToAdd;
      
      // Preparar dados para atualização
      const updateData: UpdateTaskHoursDto = {
        actualHours: newTotalHours,
        comment: comment || undefined,
        reason: reason,
      };

      // Atualizar as horas na tarefa
      await SchedulesService.updateTaskHours(task.id, updateData);
      
      toast({
        title: "Horas lançadas",
        description: `${hoursToAdd}h adicionadas com sucesso. Total: ${newTotalHours}h`,
      });
      
      // Limpar os campos
      setHours('');
      setComment('');
      setReason('');
      
      // Recarregar o histórico para mostrar a nova entrada
      await loadHoursHistory();
      
      // Notificar componente pai se houver callback
      if (onUpdateTask) {
        onUpdateTask({ ...task, actualHours: newTotalHours });
      }
      
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Não foi possível lançar as horas.';
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    // Verifica se tem conteúdo (texto com mais que tags vazias ou arquivos)
    const hasContent = newComment && newComment.replace(/<[^>]*>/g, '').trim().length > 0;
    const hasFiles = commentAttachedFiles.length > 0;

    if (!task || (!hasContent && !hasFiles)) return;

    setIsLoading(true);
    try {
      const newComments: TaskComment[] = [];

      // Se tem arquivos, envia cada um como comentário separado com o texto no primeiro
      if (hasFiles) {
        for (let i = 0; i < commentAttachedFiles.length; i++) {
          const file = commentAttachedFiles[i].file;
          const textToSend = i === 0 && hasContent ? newComment : undefined;

          const commentObj = await SchedulesService.createTaskCommentWithFile(
            task.id,
            file,
            textToSend
          );
          newComments.push(commentObj);
        }
        toast({
          title: "Comentário adicionado",
          description: `${commentAttachedFiles.length} arquivo(s) anexado(s) com sucesso.`,
        });
      } else if (hasContent) {
        // Envia apenas texto rico (pode conter imagens inline)
        const commentObj = await SchedulesService.createTaskComment(task.id, newComment);
        newComments.push(commentObj);
        toast({
          title: "Comentário adicionado",
          description: "Seu comentário foi adicionado com sucesso.",
        });
      }

      setComments([...newComments.reverse(), ...comments]);
      setNewComment('');
      // Limpar arquivos anexados
      commentAttachedFiles.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      setCommentAttachedFiles([]);
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o comentário.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Funções para edição de comentário
  const startEditingComment = (comment: TaskComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text || '');
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const saveEditedComment = async () => {
    if (!editingCommentId || !editingCommentText.trim()) return;

    setIsLoading(true);
    try {
      const updatedComment = await SchedulesService.updateTaskComment(editingCommentId, editingCommentText);
      setComments(comments.map(c => c.id === editingCommentId ? updatedComment : c));
      setEditingCommentId(null);
      setEditingCommentText('');

      toast({
        title: "Comentário atualizado",
        description: "O comentário foi atualizado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o comentário.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeComment = async (id: number) => {
    setIsLoading(true);
    try {
      await SchedulesService.deleteTaskComment(id);
      setComments(comments.filter(comment => comment.id !== id));
      toast({
        title: "Comentário removido",
        description: "O comentário foi removido com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o comentário.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
      
      toast({
        title: "Download concluído",
        description: `${fileName} foi baixado com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  // Funções de edição e exclusão de histórico de horas
  const handleEditEntry = (entry: TaskHoursHistory) => {
    setEditingEntry(entry);
    const hours = entry.hoursChanged % 1 === 0 ? Math.floor(entry.hoursChanged) : entry.hoursChanged;
    setEditHours(hours);
    setEditComment(entry.comment || '');
    setEditModalOpen(true);
  };

  const handleDeleteEntry = (entry: TaskHoursHistory) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  const confirmEditEntry = async () => {
    if (!editingEntry || !task) return;

    try {
      setIsLoading(true);
      const newTotalHours = Number(editingEntry.previousHours) + Number(editHours);
      
      await SchedulesService.updateTaskHoursHistory(editingEntry.id, { 
        newHours: newTotalHours, 
        comment: editComment 
      });
      
      toast({
        title: "Histórico atualizado",
        description: "O lançamento foi atualizado com sucesso.",
      });
      
      // Recarregar histórico
      await loadHoursHistory();
      
      // Atualizar tarefa localmente se callback fornecido
      if (onUpdateTask) {
        // Calcular o novo total de horas baseado no histórico atual
        const updatedHistory = await SchedulesService.getTaskHoursHistory(task.id);
        const newActualHours = updatedHistory.reduce((total, entry) => {
          const hoursChanged = Number(entry.hoursChanged) || 0;
          return total + hoursChanged;
        }, 0);
        const updatedTask = { ...task, actualHours: Math.max(0, newActualHours) };
        onUpdateTask(updatedTask);
      }
      
      setEditModalOpen(false);
      setEditingEntry(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o histórico.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteEntry = async () => {
    if (!entryToDelete || !task) return;

    try {
      setIsLoading(true);
      await SchedulesService.deleteTaskHoursHistory(entryToDelete.id);
      
      toast({
        title: "Histórico excluído",
        description: "O lançamento foi excluído com sucesso.",
      });
      
      await loadHoursHistory();
      if (onUpdateTask) {
        const updatedHistory = await SchedulesService.getTaskHoursHistory(task.id);
        const newActualHours = updatedHistory.reduce((total, entry) => {
          const hoursChanged = Number(entry.hoursChanged) || 0;
          return total + hoursChanged;
        }, 0);
        const updatedTask = { ...task, actualHours: Math.max(0, newActualHours) };
        onUpdateTask(updatedTask);
      }
      
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o histórico.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-semibold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') handleCancelTitleEdit();
                  }}
                  autoFocus
                />
                <Button
                  onClick={handleSaveTitle}
                  disabled={isLoading || !title.trim()}
                  size="sm"
                  variant="default"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleCancelTitleEdit}
                  size="sm"
                  variant="outline"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-lg font-semibold">{task.title}</span>
                <Button
                  onClick={() => setIsEditingTitle(true)}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
            <Badge variant="outline">#{task.id}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Descrição */}
            <div>
              <label className="text-sm font-medium mb-2 block">Descrição</label>
              <RichTextEditor
                content={description}
                onChange={setDescription}
                placeholder="Descreva os detalhes da tarefa..."
                minHeight="120px"
                maxHeight="300px"
                onImageUpload={handleImageUpload}
                onFileAttach={async (file) => {
                  await handleAttachmentUpload({ target: { files: [file] } } as any);
                }}
                showToolbar={true}
              />
              <div className="flex items-center gap-2 mt-2">
                <Button
                  onClick={handleSaveDescription}
                  disabled={isLoading}
                  size="sm"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Descrição
                </Button>
              </div>

              {/* Lista de anexos */}
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  <label className="text-xs font-medium text-gray-500">Anexos da atividade</label>
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        {attachment.mimeType?.startsWith('image/') && (
                          <img
                            src={`${import.meta.env.VITE_API_BASE_URL}${attachment.fileUrl}`}
                            alt={attachment.fileName}
                            className="h-10 w-10 object-cover rounded cursor-pointer"
                            onClick={() => downloadFile(attachment.fileUrl, attachment.fileName)}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                          <p className="text-xs text-gray-500">
                            {attachment.fileSize ? (attachment.fileSize / (1024 * 1024)).toFixed(2) : '0'} MB
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadFile(attachment.fileUrl, attachment.fileName)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canDeleteAttachment(attachment) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(attachment.id)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <input
                ref={attachmentInputRef}
                type="file"
                className="hidden"
                onChange={handleAttachmentUpload}
              />
            </div>

            {/* Comentários */}
            <div>
              <h3 className="text-sm font-medium mb-3">Comentários e Anexos</h3>
              
              {/* Lista de comentários */}
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
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
                      {canEditComment(comment) && (
                        <div className="flex items-center gap-1">
                          {!comment.fileName && editingCommentId !== comment.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditingComment(comment)}
                              disabled={isLoading}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeComment(comment.id)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Se for um arquivo */}
                    {comment.fileName ? (
                      <div className="space-y-2">
                        {/* Texto do comentário (se diferente do nome do arquivo) */}
                        {comment.text && comment.text !== comment.fileName && (
                          <RichTextViewer content={comment.text} className="text-sm" />
                        )}
                        {/* Preview de imagem se for imagem */}
                        {comment.mimeType?.startsWith('image/') && comment.fileUrl && (
                          <div className="relative max-w-xs">
                            <img
                              src={`${import.meta.env.VITE_API_BASE_URL}${comment.fileUrl}`}
                              alt={comment.fileName}
                              className="rounded-lg max-h-40 object-contain cursor-pointer hover:opacity-90"
                              onClick={() => downloadFile(comment.fileUrl!, comment.fileName!)}
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <Paperclip className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{comment.fileName}</span>
                          <span className="text-xs text-gray-500">
                            ({comment.mimeType}) - {comment.fileSize ? (comment.fileSize / (1024 * 1024)).toFixed(2) : '0'} MB
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
                      </div>
                    ) : editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <RichTextEditor
                          content={editingCommentText}
                          onChange={setEditingCommentText}
                          placeholder="Editar comentário..."
                          minHeight="60px"
                          maxHeight="150px"
                          onImageUpload={handleImageUpload}
                          showToolbar={true}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={saveEditedComment}
                            disabled={isLoading || !editingCommentText.replace(/<[^>]*>/g, '').trim()}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditingComment}
                            disabled={isLoading}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <RichTextViewer content={comment.text} className="text-sm" />
                    )}
                  </div>
                ))}
              </div>

              {/* Novo comentário com editor rico */}
              <RichTextEditor
                content={newComment}
                onChange={setNewComment}
                onSubmit={handleSubmitComment}
                placeholder="Adicione um comentário..."
                minHeight="80px"
                maxHeight="200px"
                onImageUpload={handleImageUpload}
                onFileAttach={handleCommentFileAttach}
                isLoading={isLoading}
                submitLabel="Enviar"
                attachedFiles={commentAttachedFiles}
                onRemoveFile={handleRemoveCommentFile}
                variant="comment"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Informações da Tarefa */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <h3 className="text-sm font-medium">Informações</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Responsável: {task.assignee.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Período:</span>
                </div>
                <div className="ml-6 text-sm">
                  {formatDate(task.startDate)} - {formatDate(task.endDate)}
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Progresso:</span>
                </div>
                <div className="ml-6">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <div className="flex items-center gap-1">
                      <span>{Number(task.actualHours) || 0}h / {Number(task.estimatedHours) || 0}h</span>
                      {Number(task.actualHours) > Number(task.estimatedHours) && (
                        <AlertCircle className="h-3 w-3 text-orange-500" />
                      )}
                    </div>
                    <span>{Math.round(getProgressPercentage()) || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressColor()}`}
                      style={{ width: `${getProgressPercentage()}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs de Horas */}
            <Tabs defaultValue="lancamento" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="lancamento">Lançamento</TabsTrigger>
                <TabsTrigger value="historico" className="flex items-center gap-1">
                  <History className="h-3 w-3" />
                  Tempo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="lancamento" className="mt-0">
                <div className="bg-blue-50 p-4 rounded-lg h-[320px] flex flex-col">
                  <h3 className="text-sm font-medium mb-3">Lançar Horas</h3>
                  <div className="space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <Select value={reason} onValueChange={(value) => setReason(value as TaskHoursReason)}>
                        <SelectTrigger disabled={isLoading}>
                          <SelectValue placeholder="Selecione o motivo" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TaskHoursReasonLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        placeholder="Ex: 2, 5, 8"
                      />
                      <Textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Comentário (opcional)"
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={handleAddHours}
                      disabled={isLoading || !hours || !reason}
                      className="w-full"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Lançar Horas
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="historico" className="mt-0">
                <div className="bg-gray-50 p-4 rounded-lg h-[320px] flex flex-col">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico de Tempo
                  </h3>
                  <ScrollArea className="flex-1">
                    {loadingHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <Clock className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : hoursHistory.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhum lançamento registrado</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {hoursHistory.map((entry) => (
                          <div
                            key={entry.id}
                            className="border border-gray-200 rounded-lg p-3 bg-white"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="text-xs font-medium">{entry.user.name}</div>
                                <div className="text-xs text-gray-500">
                                  {formatDateTime(entry.createdAt)}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {entry.hoursChanged > 0 ? (
                                  <TrendingUp className="h-3 w-3 text-orange-600" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 text-green-600" />
                                )}
                                <span className={`text-sm font-medium ${
                                  entry.hoursChanged > 0 ? 'text-orange-600' : 'text-green-600'
                                }`}>
                                  {entry.hoursChanged > 0 ? '+' : ''}{entry.hoursChanged}h
                                </span>
                                {canAccessHoursEntryOptions(entry) && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleEditEntry(entry)}>
                                        <Edit className="h-3 w-3 mr-2" />
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => handleDeleteEntry(entry)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3 mr-2" />
                                        Excluir
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                            {entry.comment && (
                              <div className="text-xs bg-gray-100 rounded p-2 mt-2">
                                {entry.comment}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>

      {/* Modal de Edição de Histórico */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Lançamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editHours">Horas do Lançamento</Label>
              <Input
                id="editHours"
                type="number"
                min="0"
                step="0.5"
                value={editHours}
                onChange={(e) => setEditHours(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="editComment">Comentário</Label>
              <Textarea
                id="editComment"
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Comentário sobre este lançamento..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmEditEntry} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lançamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lançamento de horas? Esta ação não pode ser desfeita e afetará o total de horas da atividade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEntry} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default TaskDetailsModal;