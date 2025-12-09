import React from 'react';
import MetricCard from '@/components/charts/MetricCard';
import { TrendingUp } from 'lucide-react';
import { Metric } from '@/types';

interface DashboardMetricsProps {
  metrics: Metric[];
}

const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ metrics }) => {

  return (
    <div>
      <div className="flex justify-start mb-4">
        <h3 className="text-lg font-medium flex items-center gap-2 ">
          <TrendingUp className="h-5 w-5 text-primary" />
          Métricas Principais
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            metric={metric}
            index={index}
            tooltip={metric.tooltip}
            isLast={index === metrics.length - 1}
          />
        ))}
      </div>
    </div>
  );
};

export default DashboardMetrics;