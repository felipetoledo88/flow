import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sprint, CreateSprintDto, UpdateSprintDto, SprintsService } from '@/services/api/sprints.service';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface SprintFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprint?: Sprint | null;
  projectId: number;
  onSave: () => void;
}

interface FormData {
  name: string;
  expectDate: string;
  expectEndDate: string;
}

const SprintFormModal: React.FC<SprintFormModalProps> = ({
  isOpen,
  onClose,
  sprint,
  projectId,
  onSave,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    expectDate: '',
    expectEndDate: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (sprint) {
      setFormData({
        name: sprint.name,
        expectDate: sprint.expectDate ? sprint.expectDate.split('T')[0] : '',
        expectEndDate: sprint.expectEndDate ? sprint.expectEndDate.split('T')[0] : '',
      });
    } else {
      setFormData({
        name: '',
        expectDate: '',
        expectEndDate: '',
      });
    }
  }, [sprint, isOpen]);

  // Função para converter data de input para formato local correto
  const formatDateForApi = (dateString: string | undefined): string | undefined => {
    if (!dateString) return undefined;
    
    // Garante que a data seja tratada como local (não UTC)
    // Input format: "2025-10-01" -> queremos manter exatamente essa data
    return dateString;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validação de sobreposição de datas
      if (formData.expectDate && formData.expectEndDate) {
        const existingSprints = await SprintsService.getSprints(projectId);
        const currentStartDate = new Date(formData.expectDate);
        const currentEndDate = new Date(formData.expectEndDate);
        
        // Filtrar sprints existentes (excluir a atual se for edição)
        const otherSprints = sprint 
          ? existingSprints.filter(s => s.id !== sprint.id)
          : existingSprints;

        for (const existingSprint of otherSprints) {
          if (existingSprint.expectEndDate && existingSprint.expectDate) {
            const existingStartDate = new Date(existingSprint.expectDate);
            const existingEndDate = new Date(existingSprint.expectEndDate);
            const isOverlapping = (
              (currentStartDate >= existingStartDate && currentStartDate <= existingEndDate) ||
              (currentEndDate >= existingStartDate && currentEndDate <= existingEndDate) ||
              (currentStartDate <= existingStartDate && currentEndDate >= existingEndDate)
            );
            
            if (isOverlapping) {
              toast.error(`A Data Prevista de Início desta sprint conflita com a Data Prevista de Término da sprint "${existingSprint.name}". Sprints não podem ter períodos sobrepostos.`);
              return;
            }
          }
        }
      }

      if (sprint) {
        const updateData: UpdateSprintDto = {
          ...formData,
          expectDate: formatDateForApi(formData.expectDate),
          expectEndDate: formatDateForApi(formData.expectEndDate),
        };
        await SprintsService.updateSprint(sprint.id, updateData);
        toast.success('Sprint atualizada com sucesso!');
      } else {
        const createData: CreateSprintDto = {
          ...formData,
          projectId,
          expectDate: formatDateForApi(formData.expectDate),
          expectEndDate: formatDateForApi(formData.expectEndDate),
        };
        await SprintsService.createSprint(createData);
        toast.success('Sprint criada com sucesso!');
      }
      onSave();
      onClose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar sprint';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {sprint ? 'Editar Sprint' : 'Nova Sprint'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Sprint</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ex: Sprint 1, Sprint de Funcionalidades..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectDate">Data Prevista de Início</Label>
            <Input
              id="expectDate"
              type="date"
              value={formData.expectDate}
              onChange={(e) => handleInputChange('expectDate', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectEndDate">Data Prevista de Término</Label>
            <Input
              id="expectEndDate"
              type="date"
              value={formData.expectEndDate}
              onChange={(e) => handleInputChange('expectEndDate', e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {sprint ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SprintFormModal;