import React, { memo } from 'react';
import { ScheduleTask, TaskStatusEntity } from '@/types/schedule';
import { FastReorderItem, FastReorderContainer } from '@/components/ui/fast-reorder';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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
  MoreVertical,
  Edit,
  Trash2,
  Clock,
  AlertCircle,
  Package,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { Sprint } from '@/types';

interface FastTaskRowProps {
  task: ScheduleTask;
  index: number;
  containerId: string;
  formatDate: (date: string | Date) => string;
  calculateProgress: (task: ScheduleTask) => number;
  getStatusBadge: (status: ScheduleTask['status']) => React.ReactNode;
  handleUpdateHours: (task: ScheduleTask) => void;
  handleEditTask: (task: ScheduleTask) => void;
  handleDeleteTask: (task: ScheduleTask) => void;
  handleUpdateAssignee: (taskId: number, assigneeId: number) => void;
  handleUpdateStatus: (taskId: number, statusId: number) => void;
  getStatusColors: (status: ScheduleTask['status']) => { bg: string; text: string; border: string; };
  teamMembers: { id: string; name: string; email: string; }[];
  isInBacklog?: boolean;
  sprints?: Sprint[];
  handleSprintChange?: (taskId: number, sprintId: number | null, moveToBacklog: boolean) => void;
  statuses: TaskStatusEntity[];
  onTaskClick?: (task: ScheduleTask) => void;
}

const FastTaskRow = memo<FastTaskRowProps>(({
  task,
  index,
  containerId,
  formatDate,
  calculateProgress,
  handleUpdateHours,
  handleEditTask,
  handleDeleteTask,
  handleUpdateAssignee,
  handleUpdateStatus,
  getStatusColors,
  teamMembers,
  isInBacklog = false,
  sprints = [],
  handleSprintChange,
  statuses,
  onTaskClick,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(task.title);
    setCopied(true);
    toast.success('Título copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRowClick = (e: React.MouseEvent) => {
    // Não abrir modal se clicou em elementos interativos
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('select') ||
      target.closest('[role="combobox"]') ||
      target.closest('[role="listbox"]') ||
      target.closest('[data-radix-collection-item]') ||
      target.closest('.drag-handle')
    ) {
      return;
    }
    onTaskClick?.(task);
  };

  const taskInfo = {
    title: task.title,
    assigneeName: teamMembers.find(m => m.id === task.assigneeId?.toString())?.name,
    status: task.status.name,
    estimatedHours: task.estimatedHours.toString(),
  };

  return (
    <FastReorderItem 
      id={task.id.toString()} 
      containerId={containerId}
      taskInfo={taskInfo}
      dragHandleSelector=".drag-handle"
    >
      <TableRow
        className="select-none cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={handleRowClick}
      >
        <TableCell className="w-16 font-medium">
          <div className="flex items-center gap-2">
            <div className="drag-handle w-4 h-4 flex items-center justify-center text-muted-foreground cursor-grab hover:text-gray-700 transition-colors">
              ⋮⋮
            </div>
            {index + 1}
          </div>
        </TableCell>
        <TableCell className="w-32 xl:w-48">
          <div className="flex items-center gap-2 group">
            <p className="font-medium truncate flex-1">{task.title}</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={handleCopyTitle}
              title="Copiar título"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
          </div>
        </TableCell>
        <TableCell className="w-28 xl:w-36">
          <Select
            value={task.assigneeId?.toString()}
            onValueChange={(value) => handleUpdateAssignee(task.id, parseInt(value))}
          >
            <SelectTrigger className="w-full h-8 text-sm">
              <SelectValue placeholder="Sem responsável" />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        {/* Coluna consolidada Data - visível apenas em telas < 1366px */}
        <TableCell className="w-32 2xl:hidden">
          <div className="text-sm space-y-1">
            <div>{isInBacklog ? '-' : formatDate(task.startDate)}</div>
            <div>{isInBacklog ? '-' : formatDate(task.endDate)}</div>
          </div>
        </TableCell>
        {/* Colunas separadas - visíveis apenas em telas >= 1366px */}
        <TableCell className="w-28 hidden 2xl:table-cell">
          <div className="text-sm">
            {isInBacklog ? '-' : formatDate(task.startDate)}
          </div>
        </TableCell>
        <TableCell className="w-28 hidden 2xl:table-cell">
          <div className="text-sm">
            {isInBacklog ? '-' : formatDate(task.endDate)}
          </div>
        </TableCell>
        <TableCell className="w-32">
          <Select
            value={isInBacklog ? 'backlog' : task.sprintId?.toString() || 'backlog'}
            onValueChange={(value) => {
              if (!handleSprintChange) return;

              if (value === 'backlog') {
                handleSprintChange(task.id, null, true);
              } else {
                handleSprintChange(task.id, parseInt(value), false);
              }
            }}
          >
            <SelectTrigger className="w-full h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="backlog">
                <div className="flex items-center gap-2">
                  <Package className="h-3 w-3" />
                  Backlog
                </div>
              </SelectItem>
              {sprints.map((sprint) => (
                <SelectItem key={sprint.id} value={sprint.id.toString()}>
                  {sprint.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="w-32">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {task.actualHours}h / {task.estimatedHours}h
              </span>
              {Number(task.actualHours) > Number(task.estimatedHours) && (
                <AlertCircle className="h-4 w-4 text-orange-500" />
              )}
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  Number(task.actualHours) > Number(task.estimatedHours)
                    ? 'bg-orange-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${calculateProgress(task)}%` }}
              />
            </div>
          </div>
        </TableCell>
        <TableCell className="w-24 xl:w-32">
          <Select
            value={task.statusId.toString()}
            onValueChange={(value) => handleUpdateStatus(task.id, parseInt(value))}
          >
            <SelectTrigger className={`w-full h-8 text-sm ${getStatusColors(task.status).bg} ${getStatusColors(task.status).text} ${getStatusColors(task.status).border}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => {
                const tempStatus = { code: status.code, name: status.name, id: status.id, createdAt: '', updatedAt: '' };
                const colors = getStatusColors(tempStatus as any);
                return (
                  <SelectItem
                    key={status.id}
                    value={status.id.toString()}
                    className={`${colors.bg} ${colors.text} hover:${colors.bg} hover:${colors.text}`}
                  >
                    {status.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="w-20 xl:w-36 text-right">
          <div className="flex items-center justify-end gap-0.5">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleUpdateHours(task)}
              className="h-7 px-1 text-xs"
            >
              <Clock className="h-3 w-3 2xl:mr-1" />
              <span className="hidden 2xl:inline">Lançar Horas</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditTask(task)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteTask(task)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>
    </FastReorderItem>
  );
});

FastTaskRow.displayName = 'FastTaskRow';

interface FastTaskTableProps {
  tasks: ScheduleTask[];
  containerId: string;
  formatDate: (date: string | Date) => string;
  calculateProgress: (task: ScheduleTask) => number;
  getStatusBadge: (status: ScheduleTask['status']) => React.ReactNode;
  handleUpdateHours: (task: ScheduleTask) => void;
  handleEditTask: (task: ScheduleTask) => void;
  handleDeleteTask: (task: ScheduleTask) => void;
  handleUpdateAssignee: (taskId: number, assigneeId: number) => void;
  handleUpdateStatus: (taskId: number, statusId: number) => void;
  getStatusColors: (status: ScheduleTask['status']) => { bg: string; text: string; border: string; };
  teamMembers: { id: string; name: string; email: string; }[];
  isInBacklog?: boolean;
  sprints?: Sprint[];
  handleSprintChange?: (taskId: number, sprintId: number | null, moveToBacklog: boolean) => void;
  statuses: TaskStatusEntity[];
  maxVisible?: number;
  onTaskClick?: (task: ScheduleTask) => void;
}

export const FastTaskTable = memo<FastTaskTableProps>(({
  tasks,
  containerId,
  formatDate,
  calculateProgress,
  getStatusBadge,
  handleUpdateHours,
  handleEditTask,
  handleDeleteTask,
  handleUpdateAssignee,
  handleUpdateStatus,
  getStatusColors,
  teamMembers,
  isInBacklog = false,
  sprints = [],
  handleSprintChange,
  statuses,
  onTaskClick,
}) => {
  return (
    <FastReorderContainer id={containerId}>
      <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead className="w-32 xl:w-48">Título</TableHead>
            <TableHead className="w-28 xl:w-36">Responsável</TableHead>
            <TableHead className="w-32 2xl:hidden">Data</TableHead>
            <TableHead className="w-28 hidden 2xl:table-cell">Data Início</TableHead>
            <TableHead className="w-28 hidden 2xl:table-cell">Data Fim</TableHead>
            <TableHead className="w-32">Sprint</TableHead>
            <TableHead className="w-32">Horas</TableHead>
            <TableHead className="w-24 xl:w-32">Status</TableHead>
            <TableHead className="w-20 xl:w-36 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task, index) => (
            <FastTaskRow
              key={task.id}
              task={task}
              index={index}
              containerId={containerId}
              formatDate={formatDate}
              calculateProgress={calculateProgress}
              getStatusBadge={getStatusBadge}
              handleUpdateHours={handleUpdateHours}
              handleEditTask={handleEditTask}
              handleDeleteTask={handleDeleteTask}
              handleUpdateAssignee={handleUpdateAssignee}
              handleUpdateStatus={handleUpdateStatus}
              getStatusColors={getStatusColors}
              teamMembers={teamMembers}
              isInBacklog={isInBacklog}
              sprints={sprints}
              handleSprintChange={handleSprintChange}
              statuses={statuses}
              onTaskClick={onTaskClick}
            />
          ))}
        </TableBody>
      </Table>
    </FastReorderContainer>
  );
});

FastTaskTable.displayName = 'FastTaskTable';