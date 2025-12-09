import { useSelectedProject } from '../../hooks/use-selected-project';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { FolderOpen, Users } from 'lucide-react';

export const ProjectInfo = () => {
  const { selectedProject, showAllProjects, hasProjectSelected } = useSelectedProject();

  if (showAllProjects) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Visualização Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Mostrando dados de todos os projetos disponíveis para o usuário.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hasProjectSelected) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Nenhum Projeto Selecionado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Selecione um projeto no dropdown do cabeçalho para ver as informações específicas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          {selectedProject?.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm">
            <strong>ID:</strong> {selectedProject?.id}
          </p>
          {selectedProject?.description && (
            <p className="text-sm">
              <strong>Descrição:</strong> {selectedProject.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            💡 Este é um exemplo de como usar o projeto selecionado em qualquer componente da aplicação.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};