import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTaskStatus } from '@/hooks/use-task-status';
import { toast } from 'sonner';
import { TaskStatusEntity } from '@/types/schedule';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
});

type FormValues = z.infer<typeof formSchema>;

interface EditTaskStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: TaskStatusEntity | null;
  onStatusUpdated?: () => void;
  projectId?: number;
}

const EditTaskStatusModal: React.FC<EditTaskStatusModalProps> = ({
  isOpen,
  onClose,
  status,
  onStatusUpdated,
  projectId,
}) => {
  const { updateStatus } = useTaskStatus(projectId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (status) {
      form.reset({
        name: status.name,
      });
    }
  }, [status, form]);

  const onSubmit = async (values: FormValues) => {
    if (!status) return;

    try {
      setIsSubmitting(true);

      const result = await updateStatus(status.id, values.name);

      if (result.success) {
        toast.success('Coluna atualizada com sucesso!');
        form.reset();
        onClose();
        onStatusUpdated?.();
      } else {
        toast.error(result.message || 'Erro ao atualizar coluna. Tente novamente.');
      }
    } catch (error) {
      toast.error('Erro ao atualizar coluna. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Coluna</DialogTitle>
          <DialogDescription>
            Altere o nome da coluna. O código será regenerado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Coluna</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Em Revisão, Aguardando Deploy..."
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskStatusModal;
