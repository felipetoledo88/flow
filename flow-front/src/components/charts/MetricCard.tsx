
import { TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react";
import { Metric } from "@/types";

interface MetricCardProps {
  metric: Metric;
  index?: number;
  tooltip?: string;
  isLast?: boolean;
}

const MetricCard = ({ metric, index = 0, tooltip, isLast = false }: MetricCardProps) => {
  const getTrendIcon = () => {
    switch (metric.trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-emerald-600" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <Minus className="h-3 w-3 text-slate-500" />;
    }
  };

  const getMetricStatus = () => {
    const numericValue = parseFloat(metric.value.replace(/[^\d.-]/g, ''));
    
    // Determinar status baseado no nome da métrica e valor
    if (metric.label === "Escopo Entregue") {
      if (numericValue >= 70) return "good";  // Ajustado de 80 para 70
      if (numericValue >= 50) return "moderate";
      return "bad";
    }
    
    if (metric.label === "Taxa de Retrabalho") {
      if (numericValue <= 10) return "good";
      if (numericValue <= 25) return "moderate";
      return "bad";
    }
    
    if (metric.label === "Confiabilidade") {
      if (numericValue >= 80) return "good";
      if (numericValue >= 60) return "moderate";
      return "bad";
    }
    
    if (metric.label === "Saúde do Projeto") {
      // Verificar o valor textual primeiro
      const valueText = metric.value.toLowerCase();
      if (valueText.includes('saudável') || valueText.includes('saudavel')) {
        return "good";
      }
      if (valueText.includes('moderado')) {
        return "moderate";
      }
      if (valueText.includes('crítico') || valueText.includes('critico')) {
        return "bad";
      }
      // Caso contrário, usar lógica numérica
      if (numericValue >= 70) return "good";
      if (numericValue >= 50) return "moderate";
      return "bad";
    }
    
    if (metric.label === "Velocidade Média") {
      // Para velocidade, assumir que qualquer valor > 0 é bom
      if (numericValue > 0) return "good";
      return "moderate";
    }

    if (metric.label === "Data Prevista") {
      if (metric.customStatus) {
        return metric.customStatus === 'on-time' ? "good" : "bad";
      }

      if (metric.unit.includes("dias restantes")) {
        const daysRemaining = parseInt(metric.unit.replace(/[^\d]/g, ''));
        if (daysRemaining > 30) return "good";
        if (daysRemaining > 7) return "moderate";
        return "bad";
      }
      if (metric.unit.includes("dias em atraso")) {
        return "bad";
      }
      if (metric.unit.includes("sem prazo")) {
        return "moderate";
      }
      return "moderate";
    }

    return "moderate";
  };

  const getStatusColors = () => {
    const status = getMetricStatus();
    
    switch (status) {
      case "good":
        return {
          border: "border-l-emerald-500",
          background: "bg-emerald-50/80 dark:bg-emerald-950/20",
          value: "text-emerald-900 dark:text-emerald-100",
          label: "text-emerald-700 dark:text-emerald-300",
          accent: "text-emerald-600"
        };
      case "bad":
        return {
          border: "border-l-red-500",
          background: "bg-red-50/80 dark:bg-red-950/20",
          value: "text-red-900 dark:text-red-100",
          label: "text-red-700 dark:text-red-300",
          accent: "text-red-600"
        };
      case "moderate":
      default:
        return {
          border: "border-l-amber-500",
          background: "bg-amber-50/80 dark:bg-amber-950/20",
          value: "text-amber-900 dark:text-amber-100",
          label: "text-amber-700 dark:text-amber-300",
          accent: "text-amber-600"
        };
    }
  };

  const colors = getStatusColors();
  
  return (
    <div className={`
      border rounded-xl border-l-4 p-4 
      ${colors.border} ${colors.background}
      hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5
      transition-all duration-300 hover:scale-[1.02]
      backdrop-blur-sm
    `}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-xs font-semibold uppercase tracking-wide ${colors.label} truncate`}>
          {metric.label}
        </h3>
        {tooltip && (
          <div className="relative group">
            <HelpCircle className={`h-4 w-4 ${colors.accent} hover:opacity-70 cursor-help transition-opacity`} />
            <div className={`absolute bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20 ${
              isLast ? 'right-0' : 'left-1/2 transform -translate-x-1/2'
            }`}>
              <div className="whitespace-pre-line">{tooltip}</div>
              <div className={`absolute top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 ${
                isLast ? 'right-4' : 'left-1/2 transform -translate-x-1/2'
              }`}></div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-black ${colors.value} tracking-tight`}>
            {metric.value}
          </span>
          {metric.unit && (
            <span className={`text-sm font-medium ${colors.accent} opacity-80`}>
              {metric.unit}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {getTrendIcon()}
        </div>
      </div>
      
      {metric.additionalInfo && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <p className={`text-xs ${colors.label} opacity-90 font-medium`}>
            {metric.additionalInfo}
          </p>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
