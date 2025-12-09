import React, { useState } from 'react';
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
import { NewLoader } from '@/components/ui/new-loader';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTaskStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusCreated?: () => void;
  projectId?: number;
}

const CreateTaskStatusModal: React.FC<CreateTaskStatusModalProps> = ({
  isOpen,
  onClose,
  onStatusCreated,
  projectId,
}) => {
  const { createStatus } = useTaskStatus(projectId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      const newStatus = await createStatus(values.name);
      
      if (newStatus) {
        toast.success('Status criado com sucesso!');
        form.reset();
        onClose();
        onStatusCreated?.();
      } else {
        toast.error('Erro ao criar status. Tente novamente.');
      }
    } catch (error) {
      toast.error('Erro ao criar status. Tente novamente.');
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
          <DialogTitle>Criar Nova Coluna</DialogTitle>
          <DialogDescription>
            Crie uma nova coluna de tarefa para o Kanban. O código será gerado automaticamente.
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
                {isSubmitting ? (
                    'Criando'
                ) : (
                  'Criar Coluna'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskStatusModal;