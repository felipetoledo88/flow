import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScheduleTaskInfo, ScheduleInfo } from '@/services/api/dashboard.service';
import { Clock, CheckCircle2, AlertTriangle, PlayCircle } from 'lucide-react';

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
  tasks: ScheduleTaskInfo[];
}

const KanbanView: React.FC<KanbanViewProps> = ({ tasks, schedules }) => {
  // Função para obter estilo visual baseado no status
  const getStatusStyle = (status: string) => {
    const statusLower = status.toLowerCase().trim();

    // Mapeamento de cores e ícones baseado em palavras-chave
    if (statusLower.includes('fazer') || statusLower.includes('todo') || statusLower.includes('novo') || statusLower.includes('aberto') || statusLower.includes('pendente')) {
      return {
        icon: <PlayCircle className="h-5 w-5" />,
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700'
      };
    } else if (statusLower.includes('progresso') || statusLower.includes('andamento') || statusLower.includes('desenvolvimento') || statusLower.includes('ativo') || statusLower.includes('working')) {
      return {
        icon: <Clock className="h-5 w-5" />,
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700'
      };
    } else if (statusLower.includes('bloqueado') || statusLower.includes('impedido') || statusLower.includes('parado') || statusLower.includes('blocked')) {
      return {
        icon: <AlertTriangle className="h-5 w-5" />,
        bgColor: 'bg-red-50',
        textColor: 'text-red-700'
      };
    } else if (statusLower.includes('concluído') || statusLower.includes('concluido') || statusLower.includes('finalizado') || statusLower.includes('done') || statusLower.includes('fechado') || statusLower.includes('completo')) {
      return {
        icon: <CheckCircle2 className="h-5 w-5" />,
        bgColor: 'bg-green-50',
        textColor: 'text-green-700'
      };
    } else {
      // Status desconhecido - usar estilo neutro
      return {
        icon: <Clock className="h-5 w-5" />,
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700'
      };
    }
  };

  // Encontrar a schedule atual (ativa ou mais recente)
  const getCurrentSchedule = (): ScheduleInfo | null => {
    // Primeiro, procurar por schedule ativa
    const activeSchedule = schedules.find(schedule => schedule.status === 'active');
    if (activeSchedule) return activeSchedule;

    // Se não há schedule ativa, pegar a mais recente (por data de início)
    const sortedSchedules = schedules
      .filter(schedule => schedule.startDate)
      .sort((a, b) => new Date(b.startDate!).getTime() - new Date(a.startDate!).getTime());

    return sortedSchedules.length > 0 ? sortedSchedules[0] : null;
  };

  // Filtrar tasks da schedule atual
  const getCurrentScheduleTasks = (): ScheduleTaskInfo[] => {
    const currentSchedule = getCurrentSchedule();
    if (!currentSchedule) return [];

    // Filtrar APENAS tasks que estão explicitamente atribuídas à schedule atual
    // E excluir épicos (mostrar apenas atividades)
    const scheduleTasks = tasks.filter(task => {
      // Só incluir tasks que têm schedule definida e é igual à schedule atual
      if (task.schedule !== null && task.schedule !== undefined) {
        // Converter ambos para string para comparação segura
        const taskSprintId = task.schedule.toString();
        const currentSprintId = currentSprint.id.toString();

        // Verificar se é da schedule atual
        const isCurrentSprint = taskSprintId === currentSprintId;

        // Excluir épicos - apenas atividades (tarefas, bugs, stories, etc.)
        const isNotEpic = task.taskType.toLowerCase() !== 'épico' &&
                         task.taskType.toLowerCase() !== 'epic';

        return isCurrentSprint && isNotEpic;
      }

      // Não incluir tasks sem schedule definida (schedule: null)
      return false;
    });

    return scheduleIssues;
  };

  const currentSprintIssues = getCurrentSprintIssues();
  const currentSprint = getCurrentSprint();

  // Criar colunas dinâmicas baseadas nos status reais das atividades
  const createDynamicColumns = (): KanbanColumn[] => {
    // Obter todos os status únicos das atividades da schedule atual
    const uniqueStatuses = [...new Set(currentSprintIssues.map(task => task.status))];

    // Criar uma coluna para cada status único
    const columns = uniqueStatuses.map(status => {
      const statusStyle = getStatusStyle(status);
      const tasksInStatus = currentSprintIssues.filter(task => task.status === status);

      return {
        id: status.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, ''),
        title: status,
        icon: statusStyle.icon,
        bgColor: statusStyle.bgColor,
        textColor: statusStyle.textColor,
        tasks: tasksInStatus
      };
    });

    // Ordenar colunas para manter uma ordem lógica (A fazer → Em progresso → Concluído, etc.)
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

      // Se não encontrou na ordem, colocar no final
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });
  };

  const columns = createDynamicColumns();

  if (currentSprintIssues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Sprint Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
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
      <div className="mb-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Sprint Atual
          {currentSprint && (
            <Badge variant="outline" className="ml-2">
              {currentSprint.name}
            </Badge>
          )}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {currentSprintIssues.length} atividade{currentSprintIssues.length !== 1 ? 's' : ''} na schedule
        </p>
      </div>

      <div className={`grid gap-6 ${
        columns.length === 1 ? 'grid-cols-1' :
        columns.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
        columns.length === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
        columns.length === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
      }`}>
        {columns.map((column) => (
          <Card key={column.id} className={`${column.bgColor} border-0`}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-medium ${column.textColor} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  {column.icon}
                  {column.title}
                </div>
                <Badge variant="secondary" className="bg-white/50">
                  {column.tasks.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {column.tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma atividade
                  </p>
                ) : (
                  column.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white rounded-lg p-3 shadow-sm border border-white/50"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900 flex-1" style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {task.summary}
                        </h4>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {task.key}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {task.taskType}
                          </Badge>
                          {task.storyPoints > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {task.storyPoints} pts
                            </span>
                          )}
                        </div>

                        {task.assignee && (
                          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                            {task.assignee}
                          </span>
                        )}
                      </div>

                      {task.dueDate && (
                        <div className="mt-2 flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          <span className="text-muted-foreground">
                            {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default KanbanView;