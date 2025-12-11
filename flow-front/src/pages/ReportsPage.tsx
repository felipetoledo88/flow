import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ReportsService } from '@/services/api/reports.service';
import { ProjectsService, Project } from '@/services/api/projects.service';
import TeamsService from '@/services/api/teams.service';
import { userManagementService } from '@/services/api/user-management.service';
import { ReportsOverview } from '@/types/reports';
import { Team } from '@/types/team';
import { User } from '@/types/user-management';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import * as XLSX from 'xlsx';
import { Loader2, BarChart3, Download, Filter, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useLocation } from 'react-router-dom';

type Scope = 'project' | 'team' | 'assignee';

const ReportsPage: React.FC = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [scope, setScope] = useState<Scope>('project');
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignees, setAssignees] = useState<User[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

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
    const filters: Record<string, any> = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    if (scope === 'project' && selectedProject) {
      filters.projectId = Number(selectedProject);
    }
    if (scope === 'team' && selectedTeam) {
      filters.teamId = Number(selectedTeam);
    }
    if (scope === 'assignee' && selectedAssignee) {
      filters.assigneeId = Number(selectedAssignee);
    }

    return filters;
  };

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

  useEffect(() => {
    if (startDate && endDate) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, startDate, endDate]);

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
                <Button onClick={loadData} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Atualizar
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="h-4 w-4" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={scope} onValueChange={(val) => setScope(val as Scope)}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="project">Por Projeto</TabsTrigger>
                    <TabsTrigger value="team">Por Equipe</TabsTrigger>
                    <TabsTrigger value="assignee">Por Responsável</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {scope === 'project' && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Projeto</p>
                      <Select
                        value={selectedProject}
                        onValueChange={setSelectedProject}
                        disabled={loadingOptions}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o projeto" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {scope === 'team' && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Equipe</p>
                      <Select
                        value={selectedTeam}
                        onValueChange={setSelectedTeam}
                        disabled={loadingOptions}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a equipe" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id.toString()}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {scope === 'assignee' && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Responsável</p>
                      <Select
                        value={selectedAssignee}
                        onValueChange={setSelectedAssignee}
                        disabled={loadingOptions}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignees.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

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

            {overview ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        Atrasos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-semibold">{overview.tasks.overdue}</p>
                      <p className="text-xs text-muted-foreground">Atividades com prazo estourado</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Horas por {scope === 'assignee' ? 'responsável' : scope === 'team' ? 'equipe' : 'projeto'}</span>
                        <Badge variant="outline">{currentHoursData.length} itens</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {currentHoursData.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum lançamento de horas no período.</p>
                      ) : (
                        <div className="space-y-2">
                          {currentHoursData.map((item) => (
                            <div
                              key={
                                scope === 'project'
                                  ? item.projectId
                                  : scope === 'team'
                                  ? item.teamId
                                  : item.assigneeId
                              }
                              className="flex items-center justify-between rounded-lg border p-3"
                            >
                              <div>
                                <p className="font-medium">
                                  {scope === 'project'
                                    ? item.projectName || 'Sem projeto'
                                    : scope === 'team'
                                    ? item.teamName || 'Sem equipe'
                                    : item.assigneeName || 'Sem responsável'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.hours.toFixed(2)}h registradas
                                </p>
                              </div>
                              <Badge variant="secondary">{item.hours.toFixed(2)}h</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Gráfico de atrasos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {currentDelayData.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma atividade encontrada para o período.</p>
                      ) : (
                        <div className="h-64">
                          <ResponsiveContainer>
                            <BarChart
                              data={currentDelayData.map((item: any) => ({
                                label:
                                  scope === 'assignee'
                                    ? item.assigneeName || 'Sem responsável'
                                    : item.teamName || 'Sem equipe',
                                atrasadas: item.delayed,
                                prazo: item.onTime,
                              }))}
                              margin={{ left: -10 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="prazo" stackId="a" fill="#22c55e" />
                              <Bar dataKey="atrasadas" stackId="a" fill="#f97316" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
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
                      <span>Referência</span>
                      <span className="text-center">Horas</span>
                      <span className="text-right">Participação</span>
                    </div>
                    <Separator />
                    {currentHoursData.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum dado para exibir.</p>
                    ) : (
                      <div className="space-y-2">
                        {currentHoursData.map((item) => {
                          const participation =
                            overview && overview.hours.total > 0
                              ? (item.hours / overview.hours.total) * 100
                              : 0;
                          return (
                            <div
                              key={`detail-${scope === 'project' ? item.projectId : scope === 'team' ? item.teamId : item.assigneeId}`}
                              className="grid grid-cols-3 items-center gap-2 text-sm"
                            >
                              <span className="truncate">
                                {scope === 'project'
                                  ? item.projectName || 'Sem projeto'
                                  : scope === 'team'
                                  ? item.teamName || 'Sem equipe'
                                  : item.assigneeName || 'Sem responsável'}
                              </span>
                              <span className="text-center font-medium">{item.hours.toFixed(2)}h</span>
                              <span className="text-right text-muted-foreground">{participation.toFixed(1)}%</span>
                            </div>
                          );
                        })}
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReportsPage;
