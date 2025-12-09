import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project } from '../../types/user-management';

export interface ProjectState {
  selectedProject: Project | null;
  availableProjects: Project[];
  showAllProjects: boolean;
  isLoading: boolean;
}

interface ProjectActions {
  setSelectedProject: (project: Project | null) => void;
  setAvailableProjects: (projects: Project[]) => void;
  setShowAllProjects: (showAll: boolean) => void;
  setLoading: (loading: boolean) => void;
  clearSelection: () => void;
}

interface ProjectStore extends ProjectState, ProjectActions {}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      selectedProject: null,
      availableProjects: [],
      showAllProjects: true, // Mostrar todos os projetos por padrão
      isLoading: false,

      setSelectedProject: (project: Project | null) => {
        set({ selectedProject: project });
      },

      setAvailableProjects: (projects: Project[]) => {
        set({ availableProjects: projects });
      },

      setShowAllProjects: (showAll: boolean) => {
        set({ 
          showAllProjects: showAll,
          selectedProject: showAll ? null : get().selectedProject
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      clearSelection: () => {
        set({ 
          selectedProject: null, 
          availableProjects: [], 
          showAllProjects: false 
        });
      },
    }),
    {
      name: 'project-storage',
      partialize: (state) => ({
        // Persistir seleções para manter consistência entre navegações
        selectedProject: state.selectedProject,
        showAllProjects: state.showAllProjects,
      }),
    }
  )
);