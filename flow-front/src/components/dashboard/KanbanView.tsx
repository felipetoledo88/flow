import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScheduleTaskInfo, ScheduleInfo } from '@/services/api/dashboard.service';
import { Clock, CheckCircle2, AlertTriangle, PlayCircle } from 'lucide-react';
import { getColorByIndex } from '@/utils/status-colors';

interface KanbanViewProps {
  tasks: ScheduleTaskInfo[];
  schedules: ScheduleInfo[];
}

interface KanbanColumn {
  id: string;
  title: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  bgSolid: string;
  tasks: ScheduleTaskInfo[];
}

const KanbanView: React.FC<KanbanViewProps> = ({ tasks, schedules }) => {
  // Função para obter estilo visual baseado no status
  const getStatusStyle = (status: string, index: number) => {
    const statusLower = status.toLowerCase().trim();

    // Ícone baseado em palavras-chave
    let icon = <Clock className="h-5 w-5" />;

    if (statusLower.includes('fazer') || statusLower.includes('todo') || statusLower.includes('novo') || statusLower.includes('aberto') || statusLower.includes('pendente')) {
      icon = <PlayCircle className="h-5 w-5" />;
    } else if (statusLower.includes('progresso') || statusLower.includes('andamento') || statusLower.includes('desenvolvimento') || statusLower.includes('ativo') || statusLower.includes('working')) {
      icon = <Clock className="h-5 w-5" />;
    } else if (statusLower.includes('bloqueado') || statusLower.includes('impedido') || statusLower.includes('parado') || statusLower.includes('blocked')) {
      icon = <AlertTriangle className="h-5 w-5" />;
    } else if (statusLower.includes('concluído') || statusLower.includes('concluido') || statusLower.includes('finalizado') || statusLower.includes('done') || statusLower.includes('fechado') || statusLower.includes('completo')) {
      icon = <CheckCircle2 className="h-5 w-5" />;
    }

    // Mapear status conhecidos para índices de cor específicos
    let colorIndex = index;
    if (statusLower.includes('fazer') || statusLower.includes('todo') || statusLower.includes('novo') || statusLower.includes('aberto') || statusLower.includes('pendente')) {
      colorIndex = 0; // Azul
    } else if (statusLower.includes('progresso') || statusLower.includes('andamento') || statusLower.includes('desenvolvimento') || statusLower.includes('ativo') || statusLower.includes('working')) {
      colorIndex = 1; // Âmbar
    } else if (statusLower.includes('bloqueado') || statusLower.includes('impedido') || statusLower.includes('parado') || statusLower.includes('blocked')) {
      colorIndex = 2; // Vermelho
    } else if (statusLower.includes('concluído') || statusLower.includes('concluido') || statusLower.includes('finalizado') || statusLower.includes('done') || statusLower.includes('fechado') || statusLower.includes('completo')) {
      colorIndex = 3; // Verde
    } else {
      // Para status desconhecidos, usar índice + 4 para cores diferentes
      colorIndex = 4 + index;
    }

    const colors = getColorByIndex(colorIndex);

    return {
      icon,
      bgColor: colors.bg,
      textColor: colors.text,
      bgSolid: colors.bgSolid,
    };
  };

  // Encontrar a schedule atual (ativa ou mais recente)
  const getCurrentSchedule = (): ScheduleInfo | null => {
    const activeSchedule = schedules.find(schedule => schedule.status === 'active');
    if (activeSchedule) return activeSchedule;

    const sortedSchedules = schedules
      .filter(schedule => schedule.startDate)
      .sort((a, b) => new Date(b.startDate!).getTime() - new Date(a.startDate!).getTime());

    return sortedSchedules.length > 0 ? sortedSchedules[0] : null;
  };

  const currentSprint = getCurrentSchedule();

  // Filtrar tasks da schedule atual
  const getCurrentScheduleTasks = (): ScheduleTaskInfo[] => {
    if (!currentSprint) return [];

    const scheduleTasks = tasks.filter(task => {
      if (task.schedule !== null && task.schedule !== undefined) {
        const taskSprintId = task.schedule.toString();
        const currentSprintId = currentSprint.id.toString();
        const isCurrentSprint = taskSprintId === currentSprintId;
        const isNotEpic = task.taskType.toLowerCase() !== 'épico' &&
                         task.taskType.toLowerCase() !== 'epic';
        return isCurrentSprint && isNotEpic;
      }
      return false;
    });

    return scheduleTasks;
  };

  const currentSprintIssues = getCurrentScheduleTasks();

  // Criar colunas dinâmicas baseadas nos status reais das atividades
  const createDynamicColumns = (): KanbanColumn[] => {
    const uniqueStatuses = [...new Set(currentSprintIssues.map(task => task.status))];

    const columns = uniqueStatuses.map((status, index) => {
      const statusStyle = getStatusStyle(status, index);
      const tasksInStatus = currentSprintIssues.filter(task => task.status === status);

      return {
        id: status.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, ''),
        title: status,
        icon: statusStyle.icon,
        bgColor: statusStyle.bgColor,
        textColor: statusStyle.textColor,
        bgSolid: statusStyle.bgSolid,
        tasks: tasksInStatus
      };
    });

    // Ordenar colunas para manter uma ordem lógica
    const statusOrder = [
      'a fazer', 'fazer', 'novo', 'aberto', 'pendente', 'backlog',
      'em progresso', 'progresso', 'andamento', 'desenvolvimento', 'ativo', 'working',
      'teste', 'test', 'revisão', 'review', 'aguardando',
      'bloqueado', 'impedido', 'parado', 'blocked',
      'concluído', 'concluido', 'finalizado', 'done', 'fechado', 'completo'
    ];

    return columns.sort((a, b) => {
      const aIndex = statusOrder.findIndex(orderStatus =>
        a.title.toLowerCase().includes(orderStatus)
      );
      const bIndex = statusOrder.findIndex(orderStatus =>
        b.title.toLowerCase().includes(orderStatus)
      );

      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });
  };

  const columns = createDynamicColumns();

  if (currentSprintIssues.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-700">
            <Clock className="h-5 w-5 text-gray-400" />
            Sprint Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            {currentSprint ?
              `Nenhuma atividade encontrada para a schedule "${currentSprint.name}"` :
              'Nenhuma schedule ativa encontrada'
            }
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
          <Clock className="h-5 w-5 text-blue-500" />
          Sprint Atual
          {currentSprint && (
            <Badge variant="outline" className="ml-2 font-normal">
              {currentSprint.name}
            </Badge>
          )}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {currentSprintIssues.length} atividade{currentSprintIssues.length !== 1 ? 's' : ''} na schedule
        </p>
      </div>

      <div className={`grid gap-4 ${
        columns.length === 1 ? 'grid-cols-1' :
        columns.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
        columns.length === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
        columns.length === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
      }`}>
        {columns.map((column) => (
          <div key={column.id} className={`${column.bgColor} rounded-2xl`}>
            {/* Header da coluna */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-1 h-8 rounded-full ${column.bgSolid}`} />
                  <div>
                    <h3 className={`text-sm font-semibold ${column.textColor}`}>
                      {column.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {column.tasks.length} {column.tasks.length === 1 ? 'tarefa' : 'tarefas'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Conteúdo da coluna */}
            <div className="px-3 pb-3">
              <div className="space-y-3">
                {column.tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4">
                    <div className={`w-10 h-10 rounded-full ${column.bgColor} flex items-center justify-center mb-2`}>
                      <CheckCircle2 className={`h-5 w-5 ${column.textColor} opacity-40`} />
                    </div>
                    <p className="text-sm text-gray-400 text-center">
                      Nenhuma tarefa
                    </p>
                  </div>
                ) : (
                  column.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h4 className="text-sm font-medium text-gray-900 flex-1 line-clamp-2 leading-snug">
                          {task.summary}
                        </h4>
                        <Badge variant="outline" className="text-[10px] shrink-0 font-mono bg-gray-50">
                          {task.key}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-600">
                            {task.taskType}
                          </Badge>
                          {task.storyPoints > 0 && (
                            <span className="text-gray-400 font-medium">
                              {task.storyPoints} pts
                            </span>
                          )}
                        </div>

                        {task.assignee && (
                          <span className="text-gray-400 truncate max-w-[80px]">
                            {task.assignee}
                          </span>
                        )}
                      </div>

                      {task.dueDate && (
                        <div className="mt-3 pt-2 border-t border-gray-50 flex items-center gap-1.5 text-[11px] text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanView;
