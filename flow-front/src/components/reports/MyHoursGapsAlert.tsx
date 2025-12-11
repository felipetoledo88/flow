import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ReportsService } from '@/services/api/reports.service';
import { DailyHoursReport, DailyHoursEntry } from '@/types/reports';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export const MyHoursGapsAlert = () => {
  const [report, setReport] = useState<DailyHoursReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await ReportsService.getMyDailyHours();
      setReport(data);
    } catch (error) {
      console.error('Erro ao carregar lacunas de horas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-orange-200 bg-orange-50/50">
        <CardContent className="py-4 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verificando lançamento de horas...
        </CardContent>
      </Card>
    );
  }

  if (!report || report.assignees.length === 0) {
    return null;
  }

  const { summary, assignees } = report;
  const myData = assignees[0];

  // Se não houver lacunas, mostra mensagem de sucesso compacta
  if (summary.daysWithGaps === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-700">Horas em dia!</p>
              <p className="text-sm text-green-600">
                Você lançou {summary.totalLogged.toFixed(1)}h de {summary.totalExpected.toFixed(1)}h esperadas este mês.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcula horas faltantes
  const missingHours = summary.totalExpected - summary.totalLogged;

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span>Atenção: Horas pendentes de lançamento</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive">
              {summary.daysWithGaps} {summary.daysWithGaps === 1 ? 'dia' : 'dias'} com lacuna
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 p-0"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              <strong>{summary.totalLogged.toFixed(1)}h</strong> lançadas de{' '}
              <strong>{summary.totalExpected.toFixed(1)}h</strong> esperadas
            </span>
          </div>
          <Badge variant="outline" className="text-red-600 border-red-300">
            Faltam {missingHours.toFixed(1)}h
          </Badge>
          <Badge
            variant={summary.completionPercentage >= 100 ? "default" : "secondary"}
            className={cn(
              summary.completionPercentage < 50 && "bg-red-100 text-red-700",
              summary.completionPercentage >= 50 && summary.completionPercentage < 100 && "bg-orange-100 text-orange-700"
            )}
          >
            {summary.completionPercentage}% completo
          </Badge>
        </div>

        {expanded && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">Legenda:</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
                <span>OK</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-red-100 border border-red-300" />
                <span>Pendente</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200" />
                <span>Folga</span>
              </div>
            </div>

            <TooltipProvider>
              <div className="flex flex-wrap gap-1">
                {myData.days.map((day: DailyHoursEntry) => (
                  <Tooltip key={day.date}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "w-7 h-7 rounded flex items-center justify-center text-xs font-medium cursor-default transition-colors",
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

            <p className="text-xs text-muted-foreground">
              Lance suas horas nas tarefas para manter o cronograma atualizado.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MyHoursGapsAlert;
