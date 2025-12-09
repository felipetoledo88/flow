import { useEffect, useState } from 'react';
import { useProjectStore } from '../stores/project/project.store';
import { useAuth } from './use-auth';
import ProjectsService from '../services/api/projects.service';

export const useProjects = () => {
  const { user, isLoading: authLoading } = useAuth();
  const {
    selectedProject,
    availableProjects,
    showAllProjects,
    isLoading,
    setSelectedProject,
    setAvailableProjects,
    setShowAllProjects,
    setLoading,
    clearSelection,
  } = useProjectStore();

  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      // Aguarda a autenticação terminar antes de buscar projetos
      if (authLoading) {
        return;
      }
      
      if (!user) {
        // Se não há usuário após o loading de auth, limpa os projetos
        setAvailableProjects([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        let projects;
        
        if (user.role === 'admin') {
          const response = await ProjectsService.getProjects();
          projects = response.projects;
        } else {
          projects = await ProjectsService.getUserProjects();
        }
        
        
        setAvailableProjects(projects);
        
        // Definir estado padrão baseado na quantidade de projetos APENAS se não houver seleção persistida
        if (projects.length === 0) {
          // Nenhum projeto - limpar seleção
          setSelectedProject(null);
          setShowAllProjects(false);
        } else if (projects.length === 1) {
          // Um projeto - se não há seleção persistida, definir como padrão
          if (!selectedProject && !showAllProjects) {
            setSelectedProject(projects[0]);
            setShowAllProjects(false);
          }
        } else {
          // Múltiplos projetos - se não há seleção persistida, mostrar "Todos os Projetos" por padrão
          if (!selectedProject && !showAllProjects) {
            setShowAllProjects(true);
          }
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user, authLoading, setLoading, setAvailableProjects, setSelectedProject, setShowAllProjects]);

  const selectProject = (projectId: string | null) => {
    if (projectId === null) {
      setSelectedProject(null);
      return;
    }

    const project = availableProjects.find(p => p.id === projectId);
    if (project) {
      setSelectedProject(project);
      setShowAllProjects(false);
    }
  };

  const toggleShowAll = () => {
    const newShowAll = !showAllProjects;
    setShowAllProjects(newShowAll);
    if (newShowAll) {
      setSelectedProject(null);
    }
  };

  const canShowAllOption = availableProjects.length > 1;

  return {
    selectedProject,
    availableProjects,
    showAllProjects,
    isLoading,
    error,
    selectProject,
    toggleShowAll,
    canShowAllOption,
    clearSelection,
  };
};