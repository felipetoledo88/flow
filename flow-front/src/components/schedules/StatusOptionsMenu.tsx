import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Trash2, Edit } from 'lucide-react';
import { TaskStatusEntity } from '@/types/schedule';

interface StatusOptionsMenuProps {
  status: TaskStatusEntity;
  onDelete: (statusId: number) => void;
  onEdit: (status: TaskStatusEntity) => void;
}

const StatusOptionsMenu: React.FC<StatusOptionsMenuProps> = ({
  status,
  onDelete,
  onEdit,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = () => {
    onDelete(status.id);
    setIsOpen(false);
  };

  const handleEdit = () => {
    onEdit(status);
    setIsOpen(false);
  };

  // Verifica se é o status "completed" que não pode ser editado/excluído
  const isCompletedStatus = status.code === 'completed';

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-black/10"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {!isCompletedStatus && (
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Editar status
          </DropdownMenuItem>
        )}
        {!isCompletedStatus && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir status
            </DropdownMenuItem>
          </>
        )}
        {isCompletedStatus && (
          <DropdownMenuItem disabled className="text-gray-400">
            Status protegido
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StatusOptionsMenu;