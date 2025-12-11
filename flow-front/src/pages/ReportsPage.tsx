import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from '@/components/ui/multi-select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ReportsService } from '@/services/api/reports.service';
import { ProjectsService, Project } from '@/services/api/projects.service';
import TeamsService from '@/services/api/teams.service';
import { userManagementService } from '@/services/api/user-management.service';
import { ReportsOverview, TaskHoursItem, DailyHoursReport, AssigneeDailyHours } from '@/types/reports';
import { Team } from '@/types/team';
import { User } from '@/types/user-management';
import * as XLSX from 'xlsx';
import { Loader2, BarChart3, Download, Filter, Clock, AlertCircle, CalendarDays, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Scope = 'project' | 'team' | 'assignee';

const ReportsPage: React.FC = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [scope, setScope] = useState<Scope>('project');
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignees, setAssignees] = useState<User[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [dailyHoursReport, setDailyHoursReport] = useState<DailyHoursReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDailyHours, setLoadingDailyHours] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [activeTab, setActiveTab] = useState('hours');

  const setDefaultMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    const toInput = (d: Date) => d.toISOString().slice(0, 10);
    setStartDate(toInput(firstDay));
    setEndDate(toInput(lastDay));
  };

  useEffect(() => {
    const loadOptions = async () => {
      try {
        setLoadingOptions(true);
        const [projectsRes, teamsRes, usersRes] = await Promise.all([
          ProjectsService.getProjects({ page: 1, limit: 100 }),
          TeamsService.getTeams(),
          userManagementService.getUsers({ page: 1, limit: 100 }),
        ]);

        setProjects(projectsRes.projects || []);
        setTeams(teamsRes || []);
        setAssignees(usersRes.data || []);
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Não foi possível carregar filtros';
        toast.error(message);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, []);

  useEffect(() => {
    setDefaultMonthRange();
  }, []);

  const buildFilters = () => {
    return {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      projectIds: selectedProjects,
      teamIds: selectedTeams,
      assigneeIds: selectedAssignees,
      statusCodes: selectedStatuses,
    };
  };

  const selectedProjectIds = useMemo(() => selectedProjects.map(Number), [selectedProjects]);

  const availableTeams = useMemo(() => {
    if (selectedProjectIds.length === 0) return teams;
    const projectTeamIds = projects
      .filter(p => selectedProjectIds.includes(p.id))
      .map(p => p.team?.id)
      .filter(Boolean) as number[];
    return teams.filter(team => projectTeamIds.includes(team.id));
  }, [selectedProjectIds, projects, teams]);

  const availableAssignees = useMemo(() => {
    if (selectedTeams.length === 0) return assignees;
    const teamIds = selectedTeams.map(Number);
    const members = teams
      .filter(team => teamIds.includes(team.id))
      .flatMap(team => team.members || []);
    const unique = new Map<number, User>();
    members.forEach(member => {
      if (member.user) {
        unique.set(member.user.id, member.user as User);
      }
    });
    return Array.from(unique.values());
  }, [assignees, selectedTeams, teams]);

  useEffect(() => {
    setSelectedTeams(prev => prev.filter(id => availableTeams.some(t => t.id.toString() === id)));
  }, [availableTeams]);

  useEffect(() => {
    setSelectedAssignees(prev => prev.filter(id => availableAssignees.some(u => u.id.toString() === id)));
  }, [availableAssignees]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await ReportsService.getOverview(buildFilters());
      setOverview(data);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Não foi possível carregar os relatórios';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const loadDailyHoursReport = async () => {
    try {
      setLoadingDailyHours(true);
      const data = await ReportsService.getDailyHours(buildFilters());
      setDailyHoursReport(data);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Não foi possível carregar o relatório de horas';
      toast.error(message);
    } finally {
      setLoadingDailyHours(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      loadData();
      if (activeTab === 'gaps') {
        loadDailyHoursReport();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, startDate, endDate]);

  useEffect(() => {
    if (activeTab === 'gaps' && startDate && endDate && !dailyHoursReport) {
      loadDailyHoursReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const currentHoursData = useMemo(() => {
    if (!overview) return [];
    if (scope === 'project') return overview.hours.byProject;
    if (scope === 'team') return overview.hours.byTeam;
    return overview.hours.byAssignee;
  }, [overview, scope]);

  const currentDelayData = useMemo(() => {
    if (!overview) return [];
    if (scope === 'project') return overview.delays.byTeam;
    if (scope === 'team') return overview.delays.byTeam;
    return overview.delays.byAssignee;
  }, [overview, scope]);

  const currentTaskHours = useMemo(() => {
    if (!overview) return [];
    if (scope === 'assignee' && overview.tasksByAssignee) {
      return Object.values(overview.tasksByAssignee);
    }
    if (scope === 'team' && overview.tasksByTeam) {
      return Object.values(overview.tasksByTeam);
    }
    return [];
  }, [overview, scope]);

  const totalAssigneeHours = useMemo(() => {
    if (!overview?.tasksByAssignee) return 0;
    return Object.values(overview.tasksByAssignee).reduce(
      (sum, group) => sum + (group.totalHours || 0),
      0
    );
  }, [overview?.tasksByAssignee]);

  const handleExport = () => {
    if (!overview) return;

    const wb = XLSX.utils.book_new();

    const hoursSheet = XLSX.utils.json_to_sheet(
      currentHoursData.map((item) => ({
        Referencia:
          scope === 'project'
            ? item.projectName || 'Sem projeto'
            : scope === 'team'
            ? item.teamName || 'Sem equipe'
            : item.assigneeName || 'Sem responsável',
        Horas: item.hours,
      })),
    );

    const delaysSheet = XLSX.utils.json_to_sheet(
      currentDelayData.map((item: any) => ({
        Referencia:
          scope === 'assignee'
            ? item.assigneeName || 'Sem responsável'
            : item.teamName || 'Sem equipe',
        Atrasadas: item.delayed,
        NoPrazo: item.onTime,
        Total: item.total,
      })),
    );

    const summarySheet = XLSX.utils.json_to_sheet([
      { Métrica: 'Horas Totais', Valor: overview.hours.total },
      { Métrica: 'Atividades', Valor: overview.tasks.total },
      { Métrica: 'Concluídas', Valor: overview.tasks.completed },
      { Métrica: 'Atrasadas', Valor: overview.tasks.overdue },
    ]);

    XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumo');
    XLSX.utils.book_append_sheet(wb, hoursSheet, 'Horas');
    XLSX.utils.book_append_sheet(wb, delaysSheet, 'Atrasos');

    const filename = `relatorios-${scope}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success('Relatório exportado em Excel');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex">
        <Sidebar
          isOpen={sidebarOpen}
          currentPath={location.pathname}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1">
          <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Relatórios Operacionais</p>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Relatórios
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!overview || loading}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          <Button
            onClick={() => {
              loadData();
              if (activeTab === 'gaps') {
                loadDailyHoursReport();
              }
            }}
            disabled={loading || loadingDailyHours}
          >
            {(loading || loadingDailyHours) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Atualizar
          </Button>
        </div>
      </div>

            <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-4 w-4" />
              Relatório de Horas Realizadas
            </CardTitle>
            <p className="text-sm text-muted-foreground">Selecione projeto, equipe, responsáveis, status e período.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Projetos</p>
                <MultiSelect value={selectedProjects} onValueChange={setSelectedProjects} disabled={loadingOptions}>
                  <MultiSelectTrigger>
                    <MultiSelectValue placeholder="Selecione projetos" />
                  </MultiSelectTrigger>
                  <MultiSelectContent>
                    {projects.map((project) => (
                      <MultiSelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </MultiSelectItem>
                    ))}
                  </MultiSelectContent>
                </MultiSelect>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Equipes</p>
                <MultiSelect value={selectedTeams} onValueChange={setSelectedTeams} disabled={loadingOptions}>
                  <MultiSelectTrigger>
                    <MultiSelectValue placeholder="Selecione equipes" />
                  </MultiSelectTrigger>
                  <MultiSelectContent>
                    {availableTeams.map((team) => (
                      <MultiSelectItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </MultiSelectItem>
                    ))}
                  </MultiSelectContent>
                </MultiSelect>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Responsáveis</p>
                <MultiSelect value={selectedAssignees} onValueChange={setSelectedAssignees} disabled={loadingOptions}>
                  <MultiSelectTrigger>
                    <MultiSelectValue placeholder="Selecione responsáveis" />
                  </MultiSelectTrigger>
                  <MultiSelectContent>
                    {availableAssignees.map((user) => (
                      <MultiSelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </MultiSelectItem>
                    ))}
                  </MultiSelectContent>
                </MultiSelect>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Status</p>
                <MultiSelect value={selectedStatuses} onValueChange={setSelectedStatuses}>
                  <MultiSelectTrigger>
                    <MultiSelectValue placeholder="Selecione status" />
                  </MultiSelectTrigger>
                  <MultiSelectContent>
                    <MultiSelectItem value="todo">A Fazer</MultiSelectItem>
                    <MultiSelectItem value="in_progress">Em andamento</MultiSelectItem>
                    <MultiSelectItem value="blocked">Bloqueado</MultiSelectItem>
                    <MultiSelectItem value="completed">Concluído</MultiSelectItem>
                  </MultiSelectContent>
                </MultiSelect>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Início</p>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Fim</p>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="hours" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Horas Realizadas
                </TabsTrigger>
                <TabsTrigger value="gaps" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Lacunas de Lançamento
                </TabsTrigger>
              </TabsList>

              <TabsContent value="hours" className="space-y-4">
                {overview ? (
                  <>
                    {(scope === 'assignee' || scope === 'team') && currentTaskHours.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between">
                            <span>Atividades no período</span>
                            <Badge variant="outline">
                              {scope === 'assignee' ? 'Por responsável' : 'Por equipe'}
                            </Badge>
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Período: {startDate} a {endDate}
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {currentTaskHours.map((group) => (
                            <div key={group.assigneeName || group.teamName} className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">
                                    {scope === 'assignee' ? group.assigneeName : group.teamName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">Total: {group.totalHours.toFixed(2)}h</p>
                                </div>
                                <Badge variant="secondary">{group.tasks.length} atividades</Badge>
                              </div>

                              <div className="space-y-2">
                                {group.tasks.map((task: TaskHoursItem) => (
                                  <div key={task.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                                    <div className="flex flex-col">
                                      <span className="font-medium">{task.title}</span>
                                      <span className="text-xs text-muted-foreground">
                                        Horas: {Number(task.actualHours || 0).toFixed(2)}h
                                        {task.endDate ? ` • Prazo: ${task.endDate?.toString().slice(0,10)}` : ''}
                                      </span>
                                    </div>
                                    <Badge variant="outline">{task.status}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-muted-foreground">Horas totais</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl font-semibold">{overview.hours.total.toFixed(2)}h</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Baseado nos lançamentos do período filtrado
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-muted-foreground">Atividades</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between">
                          <div>
                            <p className="text-3xl font-semibold">{overview.tasks.total}</p>
                            <p className="text-xs text-muted-foreground">No escopo selecionado</p>
                          </div>
                          <Badge variant="secondary">{overview.tasks.completed} concluídas</Badge>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Lançamentos detalhados
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground">
                          <span>Atividade</span>
                          <span className="text-center">Responsável</span>
                          <span className="text-right">Horas</span>
                        </div>
                        <Separator />
                        {overview?.tasksByAssignee && Object.keys(overview.tasksByAssignee).length === 0 && (
                          <p className="text-sm text-muted-foreground">Nenhum dado para exibir.</p>
                        )}
                        {overview?.tasksByAssignee && Object.values(overview.tasksByAssignee).length > 0 && (
                          <div className="space-y-4">
                            {Object.values(overview.tasksByAssignee).map(group => (
                              <div key={group.assigneeName} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-semibold">{group.assigneeName}</span>
                                  <span className="text-muted-foreground">{group.totalHours.toFixed(2)}h</span>
                                </div>
                                <div className="space-y-1">
                                  {group.tasks.map(task => (
                                    <div key={task.id} className="grid grid-cols-3 items-center gap-2 text-sm border rounded-md px-3 py-2">
                                      <span className="truncate">{task.title}</span>
                                      <span className="text-center">{task.assigneeName || '—'}</span>
                                      <span className="text-right font-medium">{Number(task.actualHours || 0).toFixed(2)}h</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                            <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
                              <span>Total geral (colaboradores)</span>
                              <span>{totalAssigneeHours.toFixed(2)}h</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando dados do relatório...
                  </div>
                )}
              </TabsContent>

              <TabsContent value="gaps" className="space-y-4">
                {loadingDailyHours ? (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando relatório de lacunas...
                  </div>
                ) : dailyHoursReport ? (
                  <>
                    {/* Resumo Geral */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-muted-foreground">Horas Esperadas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-semibold">{dailyHoursReport.summary.totalExpected.toFixed(1)}h</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-muted-foreground">Horas Lançadas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-semibold">{dailyHoursReport.summary.totalLogged.toFixed(1)}h</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            Dias Completos
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-semibold text-green-600">{dailyHoursReport.summary.daysComplete}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-600" />
                            Dias com Lacunas
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-semibold text-red-600">{dailyHoursReport.summary.daysWithGaps}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Legenda */}
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <span className="font-medium">Legenda:</span>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-green-100 border border-green-300 flex items-center justify-center">
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                            </div>
                            <span>Horas completas</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-red-100 border border-red-300 flex items-center justify-center">
                              <XCircle className="h-3 w-3 text-red-600" />
                            </div>
                            <span>Lacuna (horas faltando)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-gray-100 border border-gray-200" />
                            <span>Folga / Não é dia útil</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Relatório por Colaborador */}
                    {dailyHoursReport.assignees.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-center">
                            Nenhum colaborador encontrado com a configuração de horas de trabalho.
                            <br />
                            <span className="text-sm">Verifique se os membros da equipe têm dias de trabalho configurados.</span>
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      dailyHoursReport.assignees.map((assignee: AssigneeDailyHours) => (
                        <Card key={assignee.assigneeId}>
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span>{assignee.assigneeName}</span>
                                <Badge variant="outline" className="text-xs">
                                  {assignee.dailyWorkHours}h/dia
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-muted-foreground">
                                  {assignee.totalLogged.toFixed(1)}h / {assignee.totalExpected.toFixed(1)}h
                                </span>
                                <Badge
                                  variant={assignee.completionPercentage >= 100 ? "default" : "destructive"}
                                  className={cn(
                                    assignee.completionPercentage >= 100
                                      ? "bg-green-100 text-green-700 hover:bg-green-100"
                                      : ""
                                  )}
                                >
                                  {assignee.completionPercentage}%
                                </Badge>
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <TooltipProvider>
                              <div className="flex flex-wrap gap-1">
                                {assignee.days.map((day) => (
                                  <Tooltip key={day.date}>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={cn(
                                          "w-8 h-8 rounded flex items-center justify-center text-xs font-medium cursor-default transition-colors",
                                          !day.isWorkDay && "bg-gray-100 text-gray-400 border border-gray-200",
                                          day.isWorkDay && !day.hasGap && "bg-green-100 text-green-700 border border-green-300",
                                          day.isWorkDay && day.hasGap && "bg-red-100 text-red-700 border border-red-300"
                                        )}
                                      >
                                        {new Date(day.date + 'T12:00:00').getDate()}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      <div className="space-y-1">
                                        <p className="font-medium">
                                          {day.dayName}, {new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                        </p>
                                        {day.isWorkDay ? (
                                          <>
                                            <p>Esperado: {day.expectedHours}h</p>
                                            <p>Lançado: {day.loggedHours.toFixed(1)}h</p>
                                            {day.hasGap && (
                                              <p className="text-red-600 font-medium">
                                                Faltam: {(day.expectedHours - day.loggedHours).toFixed(1)}h
                                              </p>
                                            )}
                                          </>
                                        ) : (
                                          <p className="text-muted-foreground">Não é dia útil</p>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                ))}
                              </div>
                            </TooltipProvider>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-muted-foreground text-center">
                        Selecione os filtros e clique em Atualizar para ver o relatório de lacunas.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReportsPage;
