import React from 'react';
import { useSelectedProject } from '@/hooks/use-selected-project';
import { AuthService } from '@/services/api/auth.service';
import SprintFilter from './SprintFilter';
import { Sprint } from '@/services/api/sprints.service';

interface DashboardHeaderProps {
  projectName: string;
  projectDescription?: string;
  projectId?: number;
  selectedSprint?: string;
  onSprintChange?: (sprint: string) => void;
  sprints?: Sprint[];
  sprintLoading?: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  projectId,
  selectedSprint,
  onSprintChange,
  sprints = [],
  sprintLoading = false
}) => {
  const { selectedProject } = useSelectedProject();
  const { user } = AuthService.getAuthData();
  const isAdmin = user?.role === 'admin';
  const title = selectedProject?.name ? `Dashboard - ${selectedProject.name}` : 'Dashboard - Todos os Projetos';

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {title}
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão geral das métricas e performance
          </p>
        </div>
      </div>
      
      {projectId && (
        <div className="mt-4">
          <SprintFilter
            selectedSprint={selectedSprint || 'all'}
            onSprintChange={onSprintChange || (() => {})}
            sprints={sprints}
            loading={sprintLoading}
          />
        </div>
      )}
    </div>
  );
};

export default DashboardHeader;