import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ScheduleTask, UpdateTaskHoursDto, TaskHoursHistory } from '@/types/schedule';
import { SchedulesService } from '@/services/api/schedules.service';
import { TaskHoursReason, TaskHoursReasonLabels } from '@/enums/task-hours-reason.enum';
import { toast } from 'sonner';
import { Loader2, Clock, AlertTriangle, TrendingUp, TrendingDown, History, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';

interface UpdateTaskHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ScheduleTask | null;
  onSave: (taskWasCompleted?: boolean, forceRecalculate?: boolean) => void;
}

const UpdateTaskHoursModal: React.FC<UpdateTaskHoursModalProps> = ({
  isOpen,
  onClose,
  task,
  onSave,
}) => {
  const [actualHours, setActualHours] = useState<number>(0);
  const [reason, setReason] = useState<TaskHoursReason | ''>('');
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [history, setHistory] = useState<TaskHoursHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TaskHoursHistory | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { user: currentUser } = useAuth();

  const canAccessHoursEntryOptions = (entry: TaskHoursHistory) => {
    if (!currentUser) return false;
    if (currentUser.role === 'client') return false;
    if (currentUser.role !== 'user' && currentUser.role !== 'qa') return true;
    return entry.user.id === parseInt(currentUser.id);
  };

  const [entryToDelete, setEntryToDelete] = useState<TaskHoursHistory | null>(null);
  const [editHours, setEditHours] = useState<number>(0);
  const [editComment, setEditComment] = useState<string>('');

  useEffect(() => {
    if (isOpen && task) {
      setActualHours(0);
      setReason('');
      setComment('');
      setError('');
      loadHistory();
    }
  }, [isOpen, task]);

  const loadHistory = async () => {
    if (!task) return;

    try {
      setLoadingHistory(true);
      const historyData = await SchedulesService.getTaskHoursHistory(task.id);
      setHistory(historyData);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error loading history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!task) return;

    if (actualHours < 0) {
      setError('Horas não podem ser negativas');
      return;
    }

    if (!reason) {
      setError('Motivo do lançamento é obrigatório');
      return;
    }
    setLoading(true);

    try {
      const newTotalHours = Number(task.actualHours) + actualHours;
      const data: UpdateTaskHoursDto = {
        actualHours: newTotalHours,
        comment: comment.trim() || undefined,
      };
      const updatedTask = await SchedulesService.updateTaskHours(task.id, data);
      
      // Verificar se a atividade foi marcada como concluída
      const wasCompleted = updatedTask.status?.code === 'completed';
      
      if (wasCompleted) {
        toast.success(`${actualHours}h adicionadas. Total: ${newTotalHours}h. Atividade concluída!`, {
          description: 'Datas serão recalculadas automaticamente.',
        });
      } else {
        toast.success(`${actualHours}h adicionadas. Total: ${newTotalHours}h.`, {
          description: 'Lançamento registrado com sucesso.',
        });
      }

      // Só chamar onSave com recálculo se a atividade foi realmente concluída
      onSave(wasCompleted, false); // false = não forçar recálculo no frontend
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Erro ao atualizar horas';
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
      setLoading(true);
      const newTotalHours = Number(editingEntry.previousHours) + Number(editHours);
      await SchedulesService.updateTaskHoursHistory(editingEntry.id, { 
        newHours: newTotalHours, 
        comment: editComment 
      });
      toast.success('Histórico atualizado com sucesso. Datas serão recalculadas.');
      loadHistory();
      onSave(true);
      setEditModalOpen(false);
      setEditingEntry(null);
    } catch (error: any) {
      toast.error('Erro ao atualizar histórico');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteEntry = async () => {
    if (!entryToDelete || !task) return;
    try {
      setLoading(true);
      await SchedulesService.deleteTaskHoursHistory(entryToDelete.id);
      loadHistory();
      onSave(false, true);
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    } catch (error: any) {
      toast.error('Erro ao excluir histórico');
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  const estimatedHours = Number(task.estimatedHours);
  const currentHours = Number(task.actualHours);
  const newTotalHours = currentHours + actualHours; // Total após adicionar
  const hoursChange = actualHours; // Agora mostra as horas que serão adicionadas
  const remainingHours = estimatedHours - newTotalHours;
  const isOverBudget = newTotalHours > estimatedHours;
  const isOnTrack = newTotalHours <= estimatedHours;

  // Função para formatar data sem problemas de timezone
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  };

  // Função para formatar data e hora
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[100vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Lançamento de Horas
          </DialogTitle>
          <DialogDescription>
            {task.title}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="form" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">Lançamento</TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Tempo ({history.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Horas Estimadas</p>
              <p className="text-lg font-semibold">{estimatedHours}h</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horas Lançadas</p>
              <p className="text-lg font-semibold">{currentHours}h</p>
            </div>
          </div>

          {/* Hours Input */}
          <div className="space-y-2">
            <Label htmlFor="actualHours">Horas</Label>
            <Input
              id="actualHours"
              type="number"
              min="0"
              step="0.5"
              value={actualHours}
              onChange={(e) => {
                setActualHours(parseFloat(e.target.value) || 0);
                setError('');
              }}
              disabled={loading}
              className="text-lg"
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo do Lançamento *</Label>
            <Select value={reason} onValueChange={(value) => {
              setReason(value as TaskHoursReason);
              setError('');
            }}>
              <SelectTrigger disabled={loading}>
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TaskHoursReasonLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comment Input */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comentário</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                setError('');
              }}
              placeholder="Adicione um comentário sobre este lançamento..."
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Impact Preview */}
          {actualHours > 0 && (
            <Alert className={isOverBudget ? 'border-orange-500 bg-orange-50' : 'border-blue-500 bg-blue-50'}>
              <AlertTriangle className={`h-4 w-4 ${isOverBudget ? 'text-orange-600' : 'text-blue-600'}`} />
              <AlertDescription className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">
                    +{actualHours}h serão adicionadas
                  </span>
                </div>
                
                <div className="text-sm">
                  <p><strong>Total atual:</strong> {currentHours}h</p>
                  <p><strong>Novo total:</strong> {newTotalHours}h</p>
                </div>

                {isOverBudget ? (
                  <p className="text-sm text-orange-800">
                    Atividade ultrapassará o estimado em {newTotalHours - estimatedHours}h.
                  </p>
                ) : (
                  <p className="text-sm text-blue-800">
                    {remainingHours > 0
                      ? `Restarão ${remainingHours}h para concluir.`
                      : 'Atividade ficará completa!'
                    }
                  </p>
                )}

                <div className="mt-2 p-2 bg-white/50 rounded border border-current">
                  <p className="text-xs font-medium">ℹ️ Observação:</p>
                  <ul className="text-xs mt-1 space-y-1 ml-4 list-disc">
                    <li>Horas lançadas serão registradas na atividade</li>
                    <li>Datas só serão recalculadas quando a atividade for concluída</li>
                    <li>Para recalcular datas agora, marque como "Concluído"</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Info e Footer combinados */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-4">
            {/* Info sobre responsável */}
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Responsável:</strong> {task.assignee?.name}
              </p>
              <p className="mt-1">
                <strong>Período:</strong> {formatDate(task.startDate)} até{' '}
                {formatDate(task.endDate)}
              </p>
            </div>

            {/* Botões */}
            <div className="flex gap-2">
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
                disabled={loading || actualHours <= 0 || !reason}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Lançar Horas
              </Button>
            </div>
          </div>
        </form>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum lançamento de horas registrado ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{entry.user.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(entry.createdAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.hoursChanged > 0 ? (
                            <TrendingUp className="h-4 w-4 text-orange-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-green-600" />
                          )}
                          <span className={`font-medium ${entry.hoursChanged > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            {entry.hoursChanged > 0 ? '+' : ''}{entry.hoursChanged}h
                          </span>
                          {canAccessHoursEntryOptions(entry) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditEntry(entry)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteEntry(entry)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          )}
                        </div>
                      </div>
                      {entry.comment && (
                        <div className="text-sm bg-muted rounded p-2">
                          {entry.comment}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Lançamento</DialogTitle>
            <DialogDescription>
              Edite as horas e comentário deste lançamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editHours">Horas do Lançamento *</Label>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmEditEntry} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
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
            <AlertDialogAction onClick={confirmDeleteEntry} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default UpdateTaskHoursModal;
