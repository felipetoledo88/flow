import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { TaskStatusEntity } from '@/types/schedule';

interface DeleteStatusModalProps {
  isOpen: boolean;
  status: TaskStatusEntity | null;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

const DeleteStatusModal: React.FC<DeleteStatusModalProps> = ({
  isOpen,
  status,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  if (!status) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Excluir Status
          </DialogTitle>
          <DialogDescription className="text-left">
            Tem certeza que deseja excluir o status{' '}
            <span className="font-semibold">"{status.name}"</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            <strong>Atenção:</strong> Esta ação não pode ser desfeita. O status será excluído permanentemente do banco de dados. Todas as tarefas que estão atualmente neste status precisarão ser movidas para outro status antes da exclusão.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
{isLoading ? 'Excluindo...' : 'Excluir Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteStatusModal;