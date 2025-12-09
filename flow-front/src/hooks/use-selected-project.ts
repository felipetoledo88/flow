import { useProjectStore } from '../stores/project/project.store';

export const useSelectedProject = () => {
  const { selectedProject, showAllProjects } = useProjectStore();

  return {
    selectedProject,
    showAllProjects,
    hasProjectSelected: !!selectedProject,
    isShowingAll: showAllProjects,
  };
};