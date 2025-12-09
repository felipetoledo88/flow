import { useMemo } from 'react';
import { DashboardData, ProjectInfo, ScheduleTaskInfo } from '@/services/api/dashboard.service';
import { Metric } from '@/types';

interface ProjectEndInfo {
  endDate: string | null;
  daysRemaining: number | null;
  status: 'on-time' | 'overdue' | 'no-date';
  isBeforeProjectEndDate: boolean;
}

interface ProjectHealthInfo {
  value: string;
  status: 'healthy' | 'warning' | 'critical';
  score: number;
  datePrevista?: number;
}

interface VelocityData {
  schedule: string;
  created: number;
  completed: number;
  state: string;
}

interface UseDashboardCalculationsReturn {
  metrics: Metric[];
  velocityData: VelocityData[];
  averageLeadTime: number;
  teamReliability: number;
  scopeDelivery: number;
  projectHealth: ProjectHealthInfo;
  projectEndInfo: ProjectEndInfo;
}

export const useDashboardCalculations = (
  dashboardData: DashboardData | null,
  projectInfo: ProjectInfo,
  sprintFilter?: string,
  selectedSprintData?: { expectDate?: string; expectEndDate?: string }
): UseDashboardCalculationsReturn => {
  const getActiveTasks = () => {
    if (!dashboardData) return [];
    let filteredTasks = dashboardData.tasks.filter(task => !task.isBacklog);
    if (sprintFilter === 'all') {
      // "Todas as Sprints": mostrar TODAS as tasks (independente do status da sprint)
      // Não aplicar nenhum filtro adicional além de !isBacklog
    } else if (sprintFilter !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.sprint && task.sprint === sprintFilter);
    } else {
      filteredTasks = filteredTasks.filter(task => isInActiveSprintOrNoSprint(task));
    }
    return filteredTasks;
  };

  const isInActiveSprintOrNoSprint = (task: ScheduleTaskInfo): boolean => {
    if (!task.sprintStatus) return true;
    return task.sprintStatus === 'Em andamento';
  };

  const calculateAverageLeadTime = (): number => {
    const activeTasks = getActiveTasks();
    if (activeTasks.length === 0) return 0;
    const completedTasks = activeTasks.filter(task => task.status === 'completed');
    if (completedTasks.length === 0) return 0;
    const leadTimes = completedTasks.map(task => {
      const created = new Date(task.created);
      const completed = new Date(task.updated);
      const diffTime = completed.getTime() - created.getTime();
      return Math.round(diffTime / (1000 * 60 * 60 * 24));
    });
    return Math.round(leadTimes.reduce((sum, time) => sum + time, 0) / leadTimes.length);
  };

  const calculateTeamReliability = (): number => {
    const activeTasks = getActiveTasks();
    if (activeTasks.length === 0) return 0;
    const tasksWithDueDate = activeTasks.filter(task => task.endDate);
    if (tasksWithDueDate.length === 0) return 0;
    const tasksOnTime = tasksWithDueDate.filter(task => {
      if (!projectInfo?.startDate || !projectInfo?.endDate) {
        return task.onTime === true;
      }
      const projectStartDate = new Date(projectInfo.startDate);
      const projectEndDate = new Date(projectInfo.endDate);
      
      if (task.status === 'completed') {
        const completedDate = new Date(task.updated);
        return completedDate >= projectStartDate && completedDate <= projectEndDate;
      } else {
        const today = new Date();
        return today <= projectEndDate;
      }
    });
    return Math.round((tasksOnTime.length / tasksWithDueDate.length) * 100);
  };

  const calculateScopeDelivery = (): number => {
    const activeTasks = getActiveTasks();
    if (activeTasks.length === 0) return 0;
    const completedTasks = activeTasks.filter(task => task.status === 'completed').length;
    const totalTasks = activeTasks.length;
    return Math.round((completedTasks / totalTasks) * 100);
  };


  const calculateProjectEndDate = (): ProjectEndInfo => {
    const activeTasks = getActiveTasks();
    const tasksWithDueDate = activeTasks.filter(task => task.endDate);
    let currentActualEndDate: string | null = null;
    
    if (tasksWithDueDate.length > 0) {
      const latestEndDate = tasksWithDueDate.reduce((latest, task) => {
        const taskEndDate = new Date(task.endDate);
        return taskEndDate > latest ? taskEndDate : latest;
      }, new Date(tasksWithDueDate[0].endDate));
      currentActualEndDate = latestEndDate.toISOString().split('T')[0];
    }

    if (projectInfo?.endDate && currentActualEndDate) {
      const initialEndDate = projectInfo.endDate.includes('T') 
        ? projectInfo.endDate.split('T')[0] 
        : projectInfo.endDate;
      const initialDateUTC = new Date(initialEndDate + 'T00:00:00.000Z');
      const actualDateUTC = new Date(currentActualEndDate + 'T00:00:00.000Z');
      const diffTime = initialDateUTC.getTime() - actualDateUTC.getTime();
      const daysDifference = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const status: 'on-time' | 'overdue' | 'no-date' = daysDifference >= 0 ? 'on-time' : 'overdue';

      return {
        endDate: currentActualEndDate,
        daysRemaining: daysDifference,
        status,
        isBeforeProjectEndDate: daysDifference >= 0
      };
    }
    if (projectInfo?.endDate) {
      const initialEndDate = projectInfo.endDate.includes('T') 
        ? projectInfo.endDate.split('T')[0] 
        : projectInfo.endDate;
      const today = new Date();
      const todayUTC = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endDateUTC = new Date(initialEndDate + 'T00:00:00.000Z');
      const diffTime = endDateUTC.getTime() - todayUTC.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const status: 'on-time' | 'overdue' | 'no-date' = daysRemaining >= 0 ? 'on-time' : 'overdue';
      return {
        endDate: initialEndDate,
        daysRemaining,
        status,
        isBeforeProjectEndDate: true
      };
    }
    if (activeTasks.length === 0 || tasksWithDueDate.length === 0) {
      return { endDate: null, daysRemaining: null, status: 'no-date', isBeforeProjectEndDate: false };
    }
    const today = new Date();
    const todayUTC = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endDateUTC = new Date(currentActualEndDate! + 'T00:00:00.000Z');
    const diffTime = endDateUTC.getTime() - todayUTC.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const status: 'on-time' | 'overdue' | 'no-date' = daysRemaining >= 0 ? 'on-time' : 'overdue';
    return {
      endDate: currentActualEndDate!,
      daysRemaining,
      status,
      isBeforeProjectEndDate: false
    };
  };

  const calculateProjectHealth = (): ProjectHealthInfo => {
    if (!dashboardData) return { value: "N/A", status: "warning", score: 0 };
    const scopeDelivery = calculateScopeDelivery();
    const teamReliability = calculateTeamReliability();
    const projectEndInfo = calculateProjectEndDate();
    const datePrevista = (() => {
      if (projectEndInfo.status === 'no-date') return 50;
      
      if (projectEndInfo.status === 'on-time') {
        if (projectEndInfo.daysRemaining === null) return 100;
        if (projectEndInfo.daysRemaining > 30) return 100;
        if (projectEndInfo.daysRemaining > 15) return 85;
        if (projectEndInfo.daysRemaining > 7) return 70;
        if (projectEndInfo.daysRemaining >= 0) return 60;
        return 100;
      } else {
        const daysOverdue = Math.abs(projectEndInfo.daysRemaining || 0);
        if (daysOverdue <= 7) return 40;
        if (daysOverdue <= 15) return 25;
        if (daysOverdue <= 30) return 10;
        return 0;
      }
    })();

    const totalScore = Math.round((scopeDelivery + teamReliability + datePrevista) / 3);
    let status: 'healthy' | 'warning' | 'critical';
    let healthLabel: string;
    if (totalScore >= 75) {
      status = 'healthy';
      healthLabel = 'Saudável';
    } else if (totalScore >= 50) {
      status = 'warning';
      healthLabel = 'Moderado';
    } else {
      status = 'critical';
      healthLabel = 'Crítico';
    }
    return {
      value: healthLabel,
      status,
      score: totalScore,
      datePrevista
    };
  };

  const getVelocityBySchedule = (): VelocityData[] => {
    const activeTasks = getActiveTasks();
    if (activeTasks.length === 0) return [];

    return (dashboardData?.schedules || []).map(schedule => {
      const tasksInSchedule = activeTasks.filter(task =>
        task.scheduleId === schedule.id
      );

      const created = tasksInSchedule.length;
      const completed = tasksInSchedule.filter(task => task.status === 'completed').length;

      return {
        schedule: schedule.name,
        created,
        completed,
        state: schedule.status
      };
    });
  };

  const getMetrics = (): Metric[] => {
    const activeTasks = getActiveTasks();
    if (activeTasks.length === 0 || !dashboardData) return [];
    const teamReliability = calculateTeamReliability();
    const scopeDelivery = calculateScopeDelivery();
    const projectHealth = calculateProjectHealth();
    const projectEndInfo = calculateProjectEndDate();
    const datePrevistaScore = projectHealth.datePrevista;
    const healthTooltip = `Fórmula: Média simples dos 3 indicadores (${scopeDelivery}% + ${teamReliability}% + ${datePrevistaScore}%) ÷ 3 = ${projectHealth.score}% de saúde do projeto`;

    return [
      {
        label: "Escopo Entregue",
        value: scopeDelivery > 0 ? scopeDelivery.toString() + "%" : "N/A",
        unit: "do planejado",
        additionalInfo: (() => {
          const completedTasks = activeTasks.filter(task => task.status === 'completed').length;
          const totalTasks = activeTasks.length;
          return `${completedTasks} de ${totalTasks} atividades`;
        })(),
        tooltip: "Quantas atividades foram concluídas em relação ao total de atividades ativas (filtradas por sprint quando aplicável)."
      },
      {
        label: "Confiabilidade",
        value: (() => {
          const completedTasks = activeTasks.filter(task => task.status === 'completed');
          if (activeTasks.length === 0) {
            return "N/A";
          }
          
          const reliabilityPercentage = Math.round((completedTasks.length / activeTasks.length) * 100);
          return reliabilityPercentage.toString() + "%";
        })(),
        unit: "concluído",
        additionalInfo: (() => {
          const completedTasks = activeTasks.filter(task => task.status === 'completed');
          const inProgressTasks = activeTasks.filter(task => task.status === 'in_progress');
          const todoTasks = activeTasks.filter(task => task.status === 'todo');
          const blockedTasks = activeTasks.filter(task => task.status === 'blocked');
          
          const parts = [];
          if (completedTasks.length > 0) parts.push(`${completedTasks.length} concluídas`);
          if (inProgressTasks.length > 0) parts.push(`${inProgressTasks.length} em andamento`);
          if (blockedTasks.length > 0) parts.push(`${blockedTasks.length} bloqueadas`);
          if (todoTasks.length > 0) parts.push(`${todoTasks.length} pendentes`);
          
          return `${parts.join(' • ')} (${activeTasks.length} total)`;
        })(),
        tooltip: "Percentual de atividades concluídas em relação ao total de atividades ativas (não incluindo backlog). Mostra o progresso real de conclusão das atividades do projeto."
      },
      {
        label: "Data Prevista",
        value: (() => {
          // Se uma sprint específica for selecionada, mostrar as datas da sprint
          if (sprintFilter && sprintFilter !== 'all' && selectedSprintData?.expectDate && selectedSprintData?.expectEndDate) {
            const startDate = new Date(selectedSprintData.expectDate + 'T00:00:00').toLocaleDateString('pt-BR');
            const endDate = new Date(selectedSprintData.expectEndDate + 'T00:00:00').toLocaleDateString('pt-BR');
            return `${startDate} - ${endDate}`;
          }
          // Caso contrário, usar a lógica original
          return projectInfo.endDate
            ? new Date(projectInfo.actualExpectedEndDate + 'T00:00:00').toLocaleDateString('pt-BR')
            : "N/A";
        })(),
        unit: projectEndInfo.daysRemaining !== null
          ? projectEndInfo.daysRemaining >= 0
            ? projectEndInfo.daysRemaining === 0 
              ? "no prazo" 
              : `${projectEndInfo.daysRemaining} dias antecipado`
            : `${Math.abs(projectEndInfo.daysRemaining)} dias em atraso`
          : "sem prazo",
        additionalInfo: (() => {
          // Se uma sprint específica for selecionada, mostrar informação da sprint
          if (sprintFilter && sprintFilter !== 'all' && selectedSprintData?.expectDate && selectedSprintData?.expectEndDate) {
            return "Período da sprint selecionada (Início - Término)";
          }
          // Caso contrário, usar a lógica original
          if (projectInfo?.endDate && projectEndInfo.endDate) {
            return "Comparação: Data Fim Prevista (Inicial) vs Data Fim Prevista (Atual)";
          } else if (projectInfo?.endDate) {
            return "Baseado na data fim prevista inicial do projeto";
          } else {
            const tasksCount = activeTasks.filter(task => task.endDate).length;
            return projectEndInfo.endDate
              ? `Baseado em ${tasksCount} atividades com prazo`
              : "Nenhuma atividade com prazo definido";
          }
        })(),
        tooltip: (() => {
          // Se uma sprint específica for selecionada, tooltip da sprint
          if (sprintFilter && sprintFilter !== 'all' && selectedSprintData?.expectDate && selectedSprintData?.expectEndDate) {
            return "Mostra o período de duração da sprint selecionada (data de início e término previstas).";
          }
          // Caso contrário, usar a lógica original
          return projectInfo?.endDate && projectEndInfo.endDate
            ? "Comparação entre Data Fim Prevista (Inicial) e Data Fim Prevista (Atual) calculada das atividades. Verde = projeto antecipado/no prazo, Vermelho = projeto em atraso."
            : projectInfo?.endDate
            ? "Data prevista de finalização inicial do projeto comparada com hoje."
            : "Data prevista de finalização baseada na atividade com maior endDate.";
        })(),
        customStatus: (() => {
          if (!projectInfo?.endDate) {
            return projectEndInfo.status === 'on-time' ? 'on-time' : 'overdue';
          }
          return projectEndInfo.isBeforeProjectEndDate ? 'on-time' : 'overdue';
        })()
      },
      {
        label: "Saúde do Projeto",
        value: projectHealth.value,
        unit: `${Math.round((scopeDelivery + teamReliability + datePrevistaScore) / 3)}%`,
        additionalInfo: `Escopo: ${scopeDelivery}% • Confiabilidade: ${teamReliability}% • Data Prevista: ${datePrevistaScore}%`,
        tooltip: healthTooltip
      }
    ];
  };

  return useMemo(() => {
    const metrics = getMetrics();
    const velocityData = getVelocityBySchedule();
    const averageLeadTime = calculateAverageLeadTime();
    const teamReliability = calculateTeamReliability();
    const scopeDelivery = calculateScopeDelivery();
    const projectHealth = calculateProjectHealth();
    const projectEndInfo = calculateProjectEndDate();
    
    return {
      metrics,
      velocityData,
      averageLeadTime,
      teamReliability,
      scopeDelivery,
      projectHealth,
      projectEndInfo,
    };
  }, [dashboardData, projectInfo, sprintFilter, selectedSprintData]);
};