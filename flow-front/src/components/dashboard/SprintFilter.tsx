import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { Sprint } from '@/services/api/sprints.service';

interface SprintFilterProps {
  selectedSprint: string;
  onSprintChange: (sprint: string) => void;
  sprints?: Sprint[];
  loading?: boolean;
}

const SprintFilter: React.FC<SprintFilterProps> = ({ selectedSprint, onSprintChange, sprints = [], loading = false }) => {
  return (
    <div className="ml-2 flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Sprint:</span>
      </div>
      <Select value={selectedSprint} onValueChange={onSprintChange} disabled={loading}>
        <SelectTrigger className="w-auto">
          <SelectValue placeholder={loading ? "Carregando..." : "Selecione uma sprint"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as Sprints</SelectItem>
          {sprints.map((sprint) => (
            <SelectItem key={sprint.id} value={sprint.name}>
              {sprint.name}
              {sprint.statusSprint?.name && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({sprint.statusSprint.name})
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SprintFilter;