import { useState, useEffect } from 'react';
import { DashboardService, DashboardData, ProjectOption, ProjectInfo } from '@/services/api/dashboard.service';
import { AuthService } from '@/services/api/auth.service';
import { useSelectedProject } from './use-selected-project';
import { useProjectStore } from '../stores/project/project.store';

interface UseDashboardDataReturn {
  dashboardData: DashboardData | null;
  projectInfo: ProjectInfo | null;
  availableProjects: ProjectOption[];
  selectedProjectId: string;
  userRole: string;
  loading: boolean;
  handleProjectChange: (projectId: string) => Promise<void>;
  refreshDashboard: () => Promise<void>;
}

export const useDashboardData = (): UseDashboardDataReturn => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [availableProjects, setAvailableProjects] = useState<ProjectOption[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // Usar o store global de projetos
  const { selectedProject, showAllProjects } = useSelectedProject();
  const { setSelectedProject } = useProjectStore();
  
  // Converter o projeto selecionado para o formato esperado pelo dashboard
  const selectedProjectId = selectedProject?.id || '';
  const setSelectedProjectId = (projectId: string) => {
    const project = availableProjects.find(p => p.id === projectId);
    if (project) {
      setSelectedProject({
        id: project.id,
        name: project.name,
        description: project.description
      });
    }
  };

  const loadProjectInfo = async (projectId: string) => {
    try {
      const info = await DashboardService.getProjectInfo(projectId);
      setProjectInfo(info);
    } catch (error) {
      setProjectInfo(null);
    }
  };

  const handleProjectChange = async (projectId: string) => {
    if (projectId === selectedProjectId) return;

    setSelectedProjectId(projectId);
    setLoading(true);
    try {
      const [dashboardData, projectInfo] = await Promise.all([
        DashboardService.getDashboardData(projectId),
        DashboardService.getProjectInfo(projectId)
      ]);

      setDashboardData(dashboardData);
      setProjectInfo(projectInfo);
    } catch (error) {
      console.error('Erro ao carregar dados do projeto:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshDashboard = async () => {
    if (!selectedProject?.id) return;
    
    try {
      const [dashboardData, projectInfo] = await Promise.all([
        DashboardService.getDashboardData(selectedProject.id),
        DashboardService.getProjectInfo(selectedProject.id)
      ]);

      setDashboardData(dashboardData);
      setProjectInfo(projectInfo);
    } catch (error) {
      console.error('Erro ao atualizar dados do dashboard:', error);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const { user } = AuthService.getAuthData();
        if (user) {
          setUserRole(user.role);

          if (user.role === 'client') {
            // Para clientes, buscar dados do projeto selecionado ou do primeiro projeto disponível
            const projects = await DashboardService.getAvailableProjects();
            setAvailableProjects(projects);

            if (projects.length > 0) {
              // Se há projeto selecionado no store global e ele existe nos projetos disponíveis, usar ele
              const projectId = selectedProject?.id && projects.find(p => p.id === selectedProject.id) 
                ? selectedProject.id 
                : projects[0].id;

              const [dashboardData, projectInfo] = await Promise.all([
                DashboardService.getDashboardData(projectId),
                DashboardService.getProjectInfo(projectId)
              ]);
              setDashboardData(dashboardData);
              setProjectInfo(projectInfo);

              // Atualizar o projeto selecionado no store se necessário
              if (!selectedProject?.id || selectedProject.id !== projectId) {
                const project = projects.find(p => p.id === projectId);
                if (project) {
                  setSelectedProject({
                    id: project.id,
                    name: project.name,
                    description: project.description
                  });
                }
              }
            }
          } else {
            const projects = await DashboardService.getAvailableProjects();
            setAvailableProjects(projects);

            if (projects.length > 0) {
              // Se há projeto selecionado no store global e ele existe nos projetos disponíveis, usar ele
              if (selectedProject?.id && projects.find(p => p.id === selectedProject.id)) {
                const [dashboardData, projectInfo] = await Promise.all([
                  DashboardService.getDashboardData(selectedProject.id),
                  DashboardService.getProjectInfo(selectedProject.id)
                ]);
                setDashboardData(dashboardData);
                setProjectInfo(projectInfo);
              } else {
                // Caso contrário, selecionar o primeiro projeto
                setSelectedProjectId(projects[0].id);
                const [dashboardData, projectInfo] = await Promise.all([
                  DashboardService.getDashboardData(projects[0].id),
                  DashboardService.getProjectInfo(projects[0].id)
                ]);
                setDashboardData(dashboardData);
                setProjectInfo(projectInfo);
              }
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Reagir quando o projeto selecionado mudar no dropdown
  useEffect(() => {
    const updateDashboardForSelectedProject = async () => {
      if (selectedProject?.id && availableProjects.length > 0) {
        try {
          setLoading(true);
          const [dashboardData, projectInfo] = await Promise.all([
            DashboardService.getDashboardData(selectedProject.id),
            DashboardService.getProjectInfo(selectedProject.id)
          ]);
          setDashboardData(dashboardData);
          setProjectInfo(projectInfo);
        } catch (error) {
          console.error('❌ Erro ao carregar dados do projeto selecionado:', error);
        } finally {
          setLoading(false);
        }
      } else if (showAllProjects && availableProjects.length > 0) {
        // Quando "Todos os Projetos" estiver selecionado, limpar dados específicos
        // Para evitar mostrar dados incorretos, não carregar dados agregados
        setDashboardData(null);
        setProjectInfo(null);
        setLoading(false);
      }
    };

    if (availableProjects.length > 0) {
      updateDashboardForSelectedProject();
    }
  }, [selectedProject?.id, showAllProjects, availableProjects]);

  return {
    dashboardData,
    projectInfo,
    availableProjects,
    selectedProjectId,
    userRole,
    loading,
    handleProjectChange,
    refreshDashboard,
  };
};