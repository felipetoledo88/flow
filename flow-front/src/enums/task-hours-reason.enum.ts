export enum TaskHoursReason {
  DEVELOPMENT = 'development',
  BUG_FIX = 'bug_fix',
  CODE_REVIEW = 'code_review',
  TESTING = 'testing',
  MEETING = 'meeting',
  RESEARCH = 'research',
  BLOCKED = 'blocked'
}

export const TaskHoursReasonLabels: Record<TaskHoursReason, string> = {
  [TaskHoursReason.DEVELOPMENT]: 'Desenvolvimento',
  [TaskHoursReason.BUG_FIX]: 'Correção de Bug',
  [TaskHoursReason.CODE_REVIEW]: 'Revisão de Código',
  [TaskHoursReason.TESTING]: 'Testes',
  [TaskHoursReason.MEETING]: 'Reunião',
  [TaskHoursReason.RESEARCH]: 'Estudo',
  [TaskHoursReason.BLOCKED]: 'Bloqueado',
};