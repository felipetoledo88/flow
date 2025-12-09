import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Upload, FileSpreadsheet, Download, AlertCircle } from 'lucide-react';
import { SchedulesService } from '@/services/api/schedules.service';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TaskImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleId: number;
  onImportSuccess: () => void;
}

const TaskImportModal: React.FC<TaskImportModalProps> = ({
  isOpen,
  onClose,
  scheduleId,
  onImportSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    const validExtensions = ['csv', 'xlsx', 'xls'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      toast.error('Formato de arquivo inválido. Use CSV ou Excel (.xlsx, .xls)');
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo para importar');
      return;
    }

    setLoading(true);

    try {
      const result = await SchedulesService.importTasks(scheduleId, selectedFile);
      toast.success(result.message || 'Tarefas importadas com sucesso!');
      onImportSuccess();
      handleClose();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Erro ao importar tarefas';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'title',
      'description',
      'order',
      'assignee_email',
      'sprint_id',
      'isBacklog',
      'estimatedHours',
      'actualHours',
      'status_id',
      'status',
    ];

    const exampleRows = [
      [
        '[ Feat ] [ API ] Cadastro de usuários',
        'Realizar endpoints CRUD de usuários',
        '0',
        'dev1@example.com',
        '1',
        'FALSE',
        '8',
        '4',
        '1',
        'TODO',
      ],
      [
        '[ Feat ] [ WEB ] Cadastro de usuários',
        'Criação da interface de usuários',
        '1',
        'dev2@example.com',
        '1',
        'FALSE',
        '12',
        '8',
        '',
        'IN_PROGRESS',
      ],
      [
        '[ Fix ] [ API ] Correção de bug',
        'Corrigir problema no endpoint de login',
        '2',
        'dev1@example.com',
        '',
        'TRUE',
        '4',
        '',
        '',
        'DONE',
      ],
    ];

    const csvContent = [
      headers.join(','),
      ...exampleRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template-importacao-tarefas.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Template baixado com sucesso!');
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Atividades em Massa</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV ou Excel para importar múltiplas atividades de uma vez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Área de informação */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Colunas obrigatórias:</strong> title, order, estimatedHours
              <br />
              <strong>Colunas opcionais:</strong> description, assignee_email, sprint_id, isBacklog, actualHours, status_id, status
              <br />
              <strong>Assignee:</strong> Use assignee_email para buscar automaticamente o usuário pelo email.
              <br />
              <strong>Status:</strong> Use status_id (número) ou status (texto). Se usar status como texto, o sistema buscará automaticamente o ID correspondente.
            </AlertDescription>
          </Alert>

          {/* Botão de download do template */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadTemplate}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Baixar Template de Exemplo
            </Button>
          </div>

          {/* Área de upload */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}
              ${selectedFile ? 'bg-green-50 border-green-300' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-3">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-700">
                    Arquivo selecionado:
                  </p>
                  <p className="text-sm text-gray-600">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  Remover arquivo
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="h-12 w-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Arraste e solte seu arquivo aqui
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ou clique para selecionar
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClickUpload}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Selecionar Arquivo
                </Button>
                <p className="text-xs text-gray-500">
                  Formatos aceitos: CSV, XLSX, XLS
                </p>
              </div>
            )}
          </div>

          {/* Informações adicionais */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Como funciona:</strong>
            </p>
            <ul className="text-sm text-blue-700 list-disc list-inside mt-2 space-y-1">
              <li>As datas serão calculadas automaticamente com base na ordem e horas estimadas</li>
              <li>Cada desenvolvedor terá suas tarefas distribuídas respeitando sua capacidade</li>
              <li>As tarefas podem ser associadas a sprints ou ir direto para o backlog</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={loading || !selectedFile}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? 'Importando...' : 'Importar Atividades'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskImportModal;
