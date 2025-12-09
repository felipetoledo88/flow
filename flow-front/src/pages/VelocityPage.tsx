
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Target, Calendar, Users } from 'lucide-react';

const VelocityPage = () => {
  const velocityData = [
    { sprint: 'Sprint 1', planned: 25, delivered: 24, team: 'Team Alpha' },
    { sprint: 'Sprint 2', planned: 28, delivered: 30, team: 'Team Alpha' },
    { sprint: 'Sprint 3', planned: 30, delivered: 26, team: 'Team Alpha' },
    { sprint: 'Sprint 4', planned: 32, delivered: 35, team: 'Team Alpha' },
    { sprint: 'Sprint 5', planned: 30, delivered: 29, team: 'Team Alpha' },
    { sprint: 'Sprint 6', planned: 28, delivered: 31, team: 'Team Alpha' }
  ];

  const teamComparison = [
    { team: 'Team Alpha', avgVelocity: 29.2, sprints: 6, predictability: 85 },
    { team: 'Team Beta', avgVelocity: 24.8, sprints: 6, predictability: 78 },
    { team: 'Team Gamma', avgVelocity: 32.5, sprints: 4, predictability: 92 }
  ];

  const throughputData = [
    { name: 'Stories', value: 45, color: '#ef4444' },
    { name: 'Bugs', value: 12, color: '#f97316' },
    { name: 'Tasks', value: 23, color: '#10b981' },
    { name: 'Epics', value: 8, color: '#3b82f6' }
  ];

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-success" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return 'text-success';
    if (current < previous) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <div className="min-h-screen animated-bg">
      {/* Header */}
      <div className="page-header p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              Velocity & Métricas
            </h1>
            <p className="text-muted-foreground mt-1">Analise a velocidade e performance das equipes</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="gradient-card-red">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Velocity Atual</p>
                  <p className="text-3xl font-bold text-primary">31 SP</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(31, 29)}
                    <span className={`text-sm ${getTrendColor(31, 29)}`}>
                      +6.9% vs sprint anterior
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-primary/20 rounded-full">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card-blue">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Média (6 Sprints)</p>
                  <p className="text-3xl font-bold text-chart-2">28.7 SP</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Target className="h-4 w-4 text-chart-2" />
                    <span className="text-sm text-chart-2">Meta: 30 SP</span>
                  </div>
                </div>
                <div className="p-3 bg-chart-2/20 rounded-full">
                  <Target className="h-6 w-6 text-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card-green">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Predictabilidade</p>
                  <p className="text-3xl font-bold text-success">85%</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar className="h-4 w-4 text-success" />
                    <span className="text-sm text-success">Muito bom</span>
                  </div>
                </div>
                <div className="p-3 bg-success/20 rounded-full">
                  <Calendar className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card-yellow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Throughput</p>
                  <p className="text-3xl font-bold text-warning">88 itens</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="h-4 w-4 text-warning" />
                    <span className="text-sm text-warning">Últimos 6 sprints</span>
                  </div>
                </div>
                <div className="p-3 bg-warning/20 rounded-full">
                  <Users className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Velocity Chart */}
          <Card className="dashboard-card col-span-full lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Velocity por Sprint - Planejado vs Entregue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={velocityData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="sprint" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="planned" fill="hsl(var(--muted-foreground))" name="Planejado" />
                    <Bar dataKey="delivered" fill="hsl(var(--primary))" name="Entregue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Comparison */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-chart-2" />
                Comparação entre Equipes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamComparison.map((team, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-accent/30 rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{team.team}</p>
                      <p className="text-sm text-muted-foreground">{team.sprints} sprints</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-lg font-bold text-primary">{team.avgVelocity} SP</p>
                      <Badge variant="secondary">
                        {team.predictability}% predictable
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Throughput Breakdown */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-success" />
                Distribuição do Throughput
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={throughputData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {throughputData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Velocity Trend */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-warning" />
              Tendência de Velocity - Últimos 6 Sprints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="sprint" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="delivered" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                    name="Velocity"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="planned" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: 'hsl(var(--muted-foreground))', r: 4 }}
                    name="Meta"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VelocityPage;
