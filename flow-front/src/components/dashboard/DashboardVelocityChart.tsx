import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VelocityData {
  created: number;
  completed: number;
  state: string;
}

interface DashboardVelocityChartProps {
  velocityData: VelocityData[];
}

const DashboardVelocityChart: React.FC<DashboardVelocityChartProps> = ({ velocityData }) => {
  const totalPlanned = velocityData.reduce((acc, item) => acc + item.created, 0);
  const totalCompleted = velocityData.reduce((acc, item) => acc + item.completed, 0);

  return (
    <Card className="dashboard-card bg-gradient-to-br from-card via-card/90 to-card/70 shadow-xl border-0">
      <CardHeader className="pb-4 bg-gradient-to-r from-transparent to-accent/20 rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Itens entregues (Planejado X Realizado)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {velocityData.length > 0 ? (
          <>
            <div className="h-80 relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={velocityData}
                  margin={{ top: 20, right: 30, left: 50, bottom: 50 }}
                >
                  <defs>
                    <linearGradient id="velocityBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#1E40AF" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="velocityGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#047857" stopOpacity={0.7} />
                    </linearGradient>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.1" />
                    </filter>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E5E7EB"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="sprint"
                    tick={{ fontSize: 13, fill: '#6B7280', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                    dy={10}
                  />

                  <YAxis
                    tick={{ fontSize: 13, fill: '#6B7280', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                    label={{
                      value: 'Total de Atividades',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: 14, fill: '#4B5563', fontWeight: 600 }
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      padding: '12px',
                      fontSize: '14px'
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                  />
                  <Bar
                    dataKey="created"
                    fill="url(#velocityBlue)"
                    name="Planejadas"
                    radius={[8, 8, 0, 0]}
                    filter="url(#shadow)"
                    barSize={60}
                  />

                  <Bar
                    dataKey="completed"
                    fill="url(#velocityGreen)"
                    name="Concluídas"
                    radius={[8, 8, 0, 0]}
                    filter="url(#shadow)"
                    barSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Estatísticas da Velocidade */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-center gap-8 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-gradient-to-b from-blue-500 to-blue-700 shadow-sm"></div>
                  <span className="text-sm font-medium text-gray-700">Planejadas</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-gradient-to-b from-emerald-500 to-emerald-700 shadow-sm"></div>
                  <span className="text-sm font-medium text-gray-700">Concluídas</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 rounded-lg bg-accent/30">
                  <p className="text-lg font-semibold text-indigo-600">
                    {totalPlanned}
                  </p>
                  <p className="text-xs text-muted-foreground">Atividades Planejadas</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/30">
                  <p className="text-lg font-semibold text-emerald-600">
                    {totalCompleted}
                  </p>
                  <p className="text-xs text-muted-foreground">Atividades Concluídas</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-accent/30 to-accent/10 rounded-full mx-auto mb-4 flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Não há atividade para exibir o gráfico.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardVelocityChart;