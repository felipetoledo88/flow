import { Injectable } from '@nestjs/common';
import { TeamMember } from '../../teams/entities/team-member.entity';

export interface WorkCapacity {
  dailyWorkHours: number;
  workDays: number[];
}

@Injectable()
export class DateCalculatorService {
  /**
   * Calcula a data de fim baseado na data de início, horas estimadas e capacidade do desenvolvedor
   */
  calculateEndDate(
    startDate: Date,
    estimatedHours: number,
    workCapacity: WorkCapacity,
  ): Date {
    const currentDate = new Date(startDate);
    let remainingHours = estimatedHours;

    while (remainingHours > 0) {
      const dayOfWeek = currentDate.getUTCDay();

      if (workCapacity.workDays.includes(dayOfWeek)) {
        const hoursToday = Math.min(
          remainingHours,
          workCapacity.dailyWorkHours,
        );
        remainingHours -= hoursToday;

        if (remainingHours > 0) {
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
      } else {
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }
    }

    return currentDate;
  }

  /**
   * Calcula a data de fim considerando horas já usadas no dia de início
   * @param startDate Data de início da tarefa
   * @param taskHours Horas da tarefa
   * @param hoursAlreadyUsedInStartDate Horas já usadas no dia de início (antes da tarefa começar)
   * @param workCapacity Capacidade de trabalho
   * @returns Data de fim da tarefa
   */
  calculateEndDateWithStartDayOffset(
    startDate: Date,
    taskHours: number,
    hoursAlreadyUsedInStartDate: number,
    workCapacity: WorkCapacity,
  ): Date {
    const currentDate = new Date(startDate);
    let remainingHours = taskHours;

    // Primeiro dia: pode ter menos horas disponíveis
    const availableHoursFirstDay = Math.max(
      0,
      workCapacity.dailyWorkHours - hoursAlreadyUsedInStartDate,
    );

    if (availableHoursFirstDay > 0) {
      const hoursUsedToday = Math.min(remainingHours, availableHoursFirstDay);
      remainingHours -= hoursUsedToday;
    }

    // Se ainda sobram horas, distribui nos próximos dias
    while (remainingHours > 0) {
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      const dayOfWeek = currentDate.getUTCDay();

      if (workCapacity.workDays.includes(dayOfWeek)) {
        const hoursToday = Math.min(
          remainingHours,
          workCapacity.dailyWorkHours,
        );
        remainingHours -= hoursToday;
      }
    }

    return currentDate;
  }

  /**
   * Calcula a próxima data de trabalho disponível após uma data específica
   */
  getNextWorkDate(date: Date, workCapacity: WorkCapacity): Date {
    const nextDate = new Date(date);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    while (!workCapacity.workDays.includes(nextDate.getUTCDay())) {
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    }

    return nextDate;
  }

  /**
   * Calcula a próxima data de início considerando as horas acumuladas no dia
   * @param previousTaskEndDate Data de fim da tarefa anterior
   * @param accumulatedHoursInDay Horas acumuladas no dia atual (incluindo tarefa anterior)
   * @param nextTaskHours Horas estimadas da próxima tarefa
   * @param workCapacity Capacidade de trabalho do desenvolvedor
   * @returns Data de início da próxima tarefa
   */
  getNextStartDate(
    previousTaskEndDate: Date,
    accumulatedHoursInDay: number,
    nextTaskHours: number,
    workCapacity: WorkCapacity,
  ): Date {
    // Calcula horas disponíveis no dia atual
    const availableHoursInDay = Math.max(
      0,
      workCapacity.dailyWorkHours - accumulatedHoursInDay,
    );

    // Se há espaço disponível no dia (qualquer quantidade), começa no mesmo dia
    if (availableHoursInDay > 0) {
      return new Date(previousTaskEndDate);
    }

    // Se o dia está completamente cheio, vai para o próximo dia útil
    return this.getNextWorkDate(previousTaskEndDate, workCapacity);
  }

  /**
   * Calcula quantas horas já foram usadas no mesmo dia de uma data específica
   * Usado para determinar se novas tarefas cabem no dia atual
   */
  calculateAccumulatedHoursInDay(
    tasks: { startDate: Date; endDate: Date; hours: number }[],
    referenceDate: Date,
  ): number {
    const referenceDateStr = this.dateToString(referenceDate);

    return tasks
      .filter((task) => {
        const taskStartStr = this.dateToString(task.startDate);
        return taskStartStr === referenceDateStr;
      })
      .reduce((sum, task) => sum + task.hours, 0);
  }

  /**
   * Converte Date para string YYYY-MM-DD (helper privado)
   */
  private dateToString(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Calcula as horas restantes de uma tarefa
   */
  calculateRemainingHours(estimatedHours: number, actualHours: number): number {
    return Math.max(0, estimatedHours - actualHours);
  }

  /**
   * Recalcula a data de fim de uma tarefa baseado nas horas utilizadas
   */
  recalculateEndDate(
    startDate: Date,
    estimatedHours: number,
    actualHours: number,
    workCapacity: WorkCapacity,
  ): Date {
    // Se já usou mais horas do que o estimado, calcula baseado nas horas utilizadas
    const hoursToConsider = Math.max(estimatedHours, actualHours);
    return this.calculateEndDate(startDate, hoursToConsider, workCapacity);
  }

  /**
   * Calcula a data de início de uma tarefa dependente
   */
  calculateDependentStartDate(
    predecessorEndDate: Date,
    workCapacity: WorkCapacity,
    lagDays: number = 0,
  ): Date {
    let startDate = new Date(predecessorEndDate);

    // Adiciona o lag (atraso) em dias
    if (lagDays > 0) {
      let daysAdded = 0;
      while (daysAdded < lagDays) {
        startDate.setUTCDate(startDate.getUTCDate() + 1);
        if (workCapacity.workDays.includes(startDate.getUTCDay())) {
          daysAdded++;
        }
      }
    }

    // Garante que começa no próximo dia útil
    startDate = this.getNextWorkDate(startDate, workCapacity);

    return startDate;
  }

  /**
   * Calcula o número de dias úteis entre duas datas
   */
  calculateWorkDays(
    startDate: Date,
    endDate: Date,
    workDays: number[],
  ): number {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      if (workDays.includes(current.getUTCDay())) {
        count++;
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return count;
  }

  /**
   * Converte TeamMember para WorkCapacity
   */
  getWorkCapacityFromTeamMember(teamMember: TeamMember): WorkCapacity {
    return {
      dailyWorkHours: Number(teamMember.dailyWorkHours),
      workDays: teamMember.workDays.map(Number),
    };
  }

  /**
   * Verifica se uma data é um dia de trabalho
   */
  isWorkDay(date: Date, workDays: number[]): boolean {
    return workDays.includes(date.getUTCDay());
  }
}
