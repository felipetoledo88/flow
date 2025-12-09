import { api } from './index';

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
}

export interface ProcessAnalysisRequest {
  analysisText: string;
  projectId: number;
}

export interface ProcessAnalysisResponse {
  success: boolean;
  message: string;
  data?: {
    epics: number;
    sprints: number;
    stories: number;
  };
}


export interface RefineActivityRequest {
  taskId: string;
  userPrompt: string;
}

export interface RefineActivityResponse {
  success: boolean;
  message: string;
  data?: {
    taskId: string;
    updatedFields: string[];
    refinementNotes: string;
  };
}

export interface ConversationRequest {
  message: string;
  conversationState?: any;
}

export interface ConversationResponse {
  success: boolean;
  message: string;
  data?: any;
  nextStep?: string;
  showProjectSelection?: boolean;
  projects?: Project[];
}

export interface ProjectSelectionRequest {
  projectId: number;
  conversationState?: any;
}

class POService {
  private readonly baseURL = '/po';

  async getUserProjects(): Promise<Project[]> {
    const response = await api.get<Project[]>(`${this.baseURL}/projects`);
    return response.data;
  }

  async processAnalysis(request: ProcessAnalysisRequest): Promise<ProcessAnalysisResponse> {
    const response = await api.post<ProcessAnalysisResponse>(
      `${this.baseURL}/process-analysis`,
      request
    );
    return response.data;
  }


  async refineActivity(request: RefineActivityRequest): Promise<RefineActivityResponse> {
    const response = await api.post<RefineActivityResponse>(
      `${this.baseURL}/refine-activity`,
      request
    );
    return response.data;
  }

  async processConversation(request: ConversationRequest): Promise<ConversationResponse> {
    const response = await api.post<ConversationResponse>(
      `${this.baseURL}/conversation`,
      request
    );
    return response.data;
  }

  async selectProject(request: ProjectSelectionRequest): Promise<ConversationResponse> {
    const response = await api.post<ConversationResponse>(
      `${this.baseURL}/select-project`,
      request
    );
    return response.data;
  }
}

export const poService = new POService();