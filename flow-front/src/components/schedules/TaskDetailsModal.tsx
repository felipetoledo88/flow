import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ResizableDialog,
  ResizableDialogContent,
  ResizableDialogHeader,
  ResizableDialogTitle,
} from '@/components/ui/resizable-dialog';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  AlertCircle,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  FileText,
  GripHorizontal,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { compressImage, isImageFile } from '@/lib/image-utils';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onUpdateTask?: (task: Task) => void;
}


const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  isOpen,
  onClose,
  task: initialTask,
  onUpdateTask
}) => {
  // Estado local da tarefa para manter dados atualizados
  const [currentTask, setCurrentTask] = useState<Task | null>(initialTask);
  const [description, setDescription] = useState(initialTask?.description || '');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [hours, setHours] = useState('');
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState<TaskHoursReason | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [hoursHistory, setHoursHistory] = useState<TaskHoursHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingTask, setLoadingTask] = useState(false);

  // Estados para edição e exclusão de histórico
  const [editingEntry, setEditingEntry] = useState<TaskHoursHistory | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Estados para edição do título
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(initialTask?.title || '');
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

  // Estados para seções colapsáveis
  const [descriptionOpen, setDescriptionOpen] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [attachmentsOpen, setAttachmentsOpen] = useState(true);

  // Hook para autenticação
  const { user: currentUser } = useAuth();

  // Função para recarregar dados da tarefa do servidor
  const reloadTask = async () => {
    if (!initialTask) return;

    setLoadingTask(true);
    try {
      const freshTask = await SchedulesService.getTask(initialTask.id);
      // Mesclar dados atualizados mantendo relações que podem não vir na API
      const updatedTask = {
        ...initialTask,
        ...freshTask,
        assignee: freshTask.assignee || initialTask.assignee,
        status: freshTask.status || initialTask.status,
      };
      setCurrentTask(updatedTask);
      setTitle(updatedTask.title);
      setDescription(updatedTask.description || '');

      // Notificar componente pai
      if (onUpdateTask) {
        onUpdateTask(updatedTask);
      }
    } catch (error) {
      console.error('Error reloading task:', error);
      // Em caso de erro, usa os dados iniciais
      setCurrentTask(initialTask);
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
    } finally {
      setLoadingTask(false);
    }
  };

  // Atualizar currentTask quando initialTask mudar
  useEffect(() => {
    if (initialTask) {
      setCurrentTask(initialTask);
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      setIsEditingTitle(false);
    }
  }, [initialTask]);

  // Recarregar dados da tarefa quando o modal abrir
  useEffect(() => {
    if (isOpen && initialTask) {
      reloadTask();
    }
  }, [isOpen, initialTask?.id]);

  // Função para verificar se o usuário pode editar/excluir entrada de horas
  const canAccessHoursEntryOptions = (entry: TaskHoursHistory) => {
    if (!currentUser) return false;
    if (currentUser.role === 'client') return false;
    if (currentUser.role !== 'user' && currentUser.role !== 'qa') return true;
    return entry.user.id === parseInt(currentUser.id);
  };

  // Função para verificar se o usuário pode editar/excluir comentário
  const canEditComment = (commentItem: TaskComment) => {
    if (!currentUser) return false;
    return commentItem.user.id === parseInt(currentUser.id);
  };

  // Carregar histórico, comentários e anexos quando o modal abrir
  React.useEffect(() => {
    if (isOpen && currentTask) {
      loadHoursHistory();
      loadComments();
      loadAttachments();
    }
  }, [isOpen, currentTask?.id]);

  // Resetar campos do formulário quando o modal abrir ou a tarefa mudar
  React.useEffect(() => {
    if (isOpen) {
      setHours('');
      setComment('');
      setReason('');
      setNewComment('');
    }
  }, [isOpen, currentTask?.id]);

  // Usar currentTask como task para o resto do componente
  const task = currentTask;

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
      // Comprimir se for imagem
      let fileToUpload = file;
      if (isImageFile(file)) {
        fileToUpload = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.8,
          maxSizeKB: 500,
        });
      }

      const newAttachment = await SchedulesService.createTaskAttachment(task.id, fileToUpload);
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

  // Upload de imagem inline para o editor (com compressão)
  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      // Comprimir imagem antes do upload
      let fileToUpload = file;
      if (isImageFile(file)) {
        fileToUpload = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.8,
          maxSizeKB: 500,
        });
      }
      const url = await SchedulesService.uploadImage(fileToUpload);
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

  // Anexar arquivo no comentário (com compressão para imagens)
  const handleCommentFileAttach = async (file: File) => {
    let fileToAttach = file;

    // Comprimir se for imagem
    if (isImageFile(file)) {
      try {
        fileToAttach = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.8,
          maxSizeKB: 500,
        });
      } catch (error) {
        console.error('Error compressing image:', error);
        // Se falhar a compressão, usa o arquivo original
      }
    }

    const newAttachedFile: AttachedFile = {
      file: fileToAttach,
      preview: fileToAttach.type.startsWith('image/') ? URL.createObjectURL(fileToAttach) : undefined,
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
      const newTotalHours = Number(task.actualHours) + hoursToAdd;

      const updateData: UpdateTaskHoursDto = {
        actualHours: newTotalHours,
        comment: comment || undefined,
        reason: reason,
      };

      await SchedulesService.updateTaskHours(task.id, updateData);

      toast({
        title: "Horas lançadas",
        description: `${hoursToAdd}h adicionadas com sucesso. Total: ${newTotalHours}h`,
      });

      setHours('');
      setComment('');
      setReason('');

      await loadHoursHistory();

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
    const hasContent = newComment && newComment.replace(/<[^>]*>/g, '').trim().length > 0;
    const hasFiles = commentAttachedFiles.length > 0;

    if (!task || (!hasContent && !hasFiles)) return;

    setIsLoading(true);
    try {
      const newComments: TaskComment[] = [];

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
        const commentObj = await SchedulesService.createTaskComment(task.id, newComment);
        newComments.push(commentObj);
        toast({
          title: "Comentário adicionado",
          description: "Seu comentário foi adicionado com sucesso.",
        });
      }

      setComments([...newComments.reverse(), ...comments]);
      setNewComment('');
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
    <ResizableDialog open={isOpen} onOpenChange={onClose}>
      <ResizableDialogContent
        minWidth={800}
        minHeight={500}
        defaultWidth={1200}
        defaultHeight={750}
      >
        {/* Header arrastável */}
        <ResizableDialogHeader className="cursor-grab active:cursor-grabbing select-none">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3 flex-1">
              <GripHorizontal className="h-4 w-4 text-gray-400" />
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
                    onClick={(e) => e.stopPropagation()}
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
                  <ResizableDialogTitle className="text-lg font-semibold truncate max-w-[600px]">
                    {task.title}
                  </ResizableDialogTitle>
                  <Button
                    onClick={() => setIsEditingTitle(true)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 shrink-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Badge variant="outline" className="shrink-0">#{task.id}</Badge>
            </div>
          </div>
        </ResizableDialogHeader>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna Principal */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Card de Informações Resumidas */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Responsável</p>
                          <p className="text-sm font-medium">{task.assignee.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <Calendar className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Período</p>
                          <p className="text-sm font-medium">{formatDate(task.startDate)} - {formatDate(task.endDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <Clock className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">Progresso</p>
                            <span className="text-xs font-medium">{Math.round(getProgressPercentage())}%</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${getProgressColor()}`}
                                style={{ width: `${getProgressPercentage()}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium whitespace-nowrap">
                              {Number(task.actualHours) || 0}h / {Number(task.estimatedHours) || 0}h
                            </span>
                            {Number(task.actualHours) > Number(task.estimatedHours) && (
                              <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Descrição - Colapsável */}
                  <Collapsible open={descriptionOpen} onOpenChange={setDescriptionOpen}>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-gray-600" />
                            <span className="font-medium text-gray-900">Descrição</span>
                          </div>
                          {descriptionOpen ? (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-4 border-t border-gray-100">
                          <RichTextEditor
                            content={description}
                            onChange={setDescription}
                            placeholder="Descreva os detalhes da tarefa..."
                            minHeight="150px"
                            maxHeight="400px"
                            onImageUpload={handleImageUpload}
                            onFileAttach={async (file) => {
                              await handleAttachmentUpload({ target: { files: [file] } } as any);
                            }}
                            showToolbar={true}
                          />
                          <div className="flex items-center gap-2 mt-3">
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
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>

                  {/* Anexos - Colapsável */}
                  {attachments.length > 0 && (
                    <Collapsible open={attachmentsOpen} onOpenChange={setAttachmentsOpen}>
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-5 w-5 text-gray-600" />
                              <span className="font-medium text-gray-900">Anexos</span>
                              <Badge variant="secondary" className="ml-2">{attachments.length}</Badge>
                            </div>
                            {attachmentsOpen ? (
                              <ChevronDown className="h-5 w-5 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="p-4 border-t border-gray-100">
                            <div className="grid grid-cols-2 gap-3">
                              {attachments.map((attachment) => (
                                <div key={attachment.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                  {attachment.mimeType?.startsWith('image/') && (
                                    <img
                                      src={`${import.meta.env.VITE_API_BASE_URL}${attachment.fileUrl}`}
                                      alt={attachment.fileName}
                                      className="h-12 w-12 object-cover rounded cursor-pointer"
                                      onClick={() => downloadFile(attachment.fileUrl, attachment.fileName)}
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                                    <p className="text-xs text-gray-500">
                                      {attachment.fileSize ? (attachment.fileSize / (1024 * 1024)).toFixed(2) : '0'} MB
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
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
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  )}

                  <input
                    ref={attachmentInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleAttachmentUpload}
                  />

                  {/* Comentários - Colapsável */}
                  <Collapsible open={commentsOpen} onOpenChange={setCommentsOpen}>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-gray-600" />
                            <span className="font-medium text-gray-900">Comentários</span>
                            {comments.length > 0 && (
                              <Badge variant="secondary" className="ml-2">{comments.length}</Badge>
                            )}
                          </div>
                          {commentsOpen ? (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-4 border-t border-gray-100 space-y-4">
                          {/* Lista de comentários */}
                          {comments.length > 0 && (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                              {comments.map((comment) => (
                                <div key={comment.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                                        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                          {getInitials(comment.user.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <span className="text-sm font-medium">{comment.user.name}</span>
                                        <span className="text-xs text-gray-500 ml-2">
                                          {formatDateTime(comment.createdAt)}
                                        </span>
                                      </div>
                                    </div>
                                    {canEditComment(comment) && (
                                      <div className="flex items-center gap-1">
                                        {!comment.fileName && editingCommentId !== comment.id && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => startEditingComment(comment)}
                                            disabled={isLoading}
                                            className="h-8 w-8 p-0"
                                          >
                                            <Edit className="h-4 w-4 text-gray-500" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeComment(comment.id)}
                                          disabled={isLoading}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>

                                  {comment.fileName ? (
                                    <div className="space-y-2">
                                      {comment.text && comment.text !== comment.fileName && (
                                        <RichTextViewer content={comment.text} className="text-sm" />
                                      )}
                                      {comment.mimeType?.startsWith('image/') && comment.fileUrl && (
                                        <div className="relative max-w-sm">
                                          <img
                                            src={`${import.meta.env.VITE_API_BASE_URL}${comment.fileUrl}`}
                                            alt={comment.fileName}
                                            className="rounded-lg max-h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => downloadFile(comment.fileUrl!, comment.fileName!)}
                                          />
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2 text-sm bg-white p-2 rounded-lg">
                                        <Paperclip className="h-4 w-4 text-gray-500" />
                                        <span className="font-medium truncate">{comment.fileName}</span>
                                        <span className="text-xs text-gray-500">
                                          {comment.fileSize ? (comment.fileSize / (1024 * 1024)).toFixed(2) : '0'} MB
                                        </span>
                                        {comment.fileUrl && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => downloadFile(comment.fileUrl!, comment.fileName!)}
                                            className="ml-auto h-7 px-2"
                                          >
                                            <Download className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ) : editingCommentId === comment.id ? (
                                    <div className="space-y-3">
                                      <RichTextEditor
                                        content={editingCommentText}
                                        onChange={setEditingCommentText}
                                        placeholder="Editar comentário..."
                                        minHeight="80px"
                                        maxHeight="200px"
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
                          )}

                          {/* Novo comentário */}
                          <div className="pt-2 border-t border-gray-100">
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
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  {/* Tabs de Horas */}
                  <Tabs defaultValue="lancamento" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="lancamento" className="text-xs">Lançamento</TabsTrigger>
                      <TabsTrigger value="historico" className="flex items-center gap-1 text-xs">
                        <History className="h-3 w-3" />
                        Histórico
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="lancamento" className="mt-2">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-xl">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          Lançar Horas
                        </h3>
                        <div className="space-y-3">
                          <Select value={reason} onValueChange={(value) => setReason(value as TaskHoursReason)}>
                            <SelectTrigger disabled={isLoading} className="bg-white">
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
                            placeholder="Horas (ex: 2, 5, 8)"
                            className="bg-white"
                          />
                          <Textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Comentário (opcional)"
                            rows={3}
                            className="bg-white resize-none"
                          />
                          <Button
                            onClick={handleAddHours}
                            disabled={isLoading || !hours || !reason}
                            className="w-full"
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Clock className="h-4 w-4 mr-2" />
                            )}
                            Lançar Horas
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="historico" className="mt-2">
                      <div className="bg-white border border-gray-200 p-4 rounded-xl">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                          <History className="h-4 w-4 text-gray-600" />
                          Histórico de Tempo
                        </h3>
                        <ScrollArea className="h-[300px]">
                          {loadingHistory ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                            </div>
                          ) : hoursHistory.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                              <p className="text-sm">Nenhum lançamento registrado</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {hoursHistory.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="border border-gray-100 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium">{entry.user.name}</span>
                                      <span className="text-xs text-gray-400">
                                        {formatDateTime(entry.createdAt)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {entry.hoursChanged > 0 ? (
                                        <TrendingUp className="h-3 w-3 text-orange-600" />
                                      ) : (
                                        <TrendingDown className="h-3 w-3 text-green-600" />
                                      )}
                                      <span className={`text-sm font-semibold ${
                                        entry.hoursChanged > 0 ? 'text-orange-600' : 'text-green-600'
                                      }`}>
                                        {entry.hoursChanged > 0 ? '+' : ''}{entry.hoursChanged}h
                                      </span>
                                      {canAccessHoursEntryOptions(entry) && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1">
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
                                    <div className="text-xs text-gray-600 bg-white rounded p-2 mt-2">
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
            </div>
          </ScrollArea>
        </div>
      </ResizableDialogContent>

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
    </ResizableDialog>
  );
};

export default TaskDetailsModal;
