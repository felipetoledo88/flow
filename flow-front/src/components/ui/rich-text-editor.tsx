import React, { useCallback, useRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Paperclip,
  Undo,
  Redo,
  Code,
  Quote,
  X,
  Loader2,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RichTextEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  editable?: boolean;
  minHeight?: string;
  maxHeight?: string;
  showToolbar?: boolean;
  onImageUpload?: (file: File) => Promise<string>;
  onFileAttach?: (file: File) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
  attachedFiles?: AttachedFile[];
  onRemoveFile?: (index: number) => void;
  variant?: 'default' | 'comment';
}

export interface AttachedFile {
  file: File;
  preview?: string;
}

const MenuButton: React.FC<{
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, isActive, disabled, title, children }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'h-8 w-8 p-0',
            isActive && 'bg-gray-200 text-gray-900'
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{title}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const MenuBar: React.FC<{
  editor: Editor | null;
  onImageUpload?: (file: File) => Promise<string>;
  onFileAttach?: (file: File) => Promise<void>;
  isLoading?: boolean;
}> = ({ editor, onImageUpload, onFileAttach, isLoading }) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!editor) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;

    try {
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (error) {
      console.error('Error uploading image:', error);
    }

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onFileAttach) return;

    try {
      await onFileAttach(file);
    } catch (error) {
      console.error('Error attaching file:', error);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL do link:', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      <MenuButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        disabled={isLoading}
        title="Negrito (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        disabled={isLoading}
        title="Itálico (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        disabled={isLoading}
        title="Sublinhado (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        disabled={isLoading}
        title="Tachado"
      >
        <Strikethrough className="h-4 w-4" />
      </MenuButton>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <MenuButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        disabled={isLoading}
        title="Lista"
      >
        <List className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        disabled={isLoading}
        title="Lista numerada"
      >
        <ListOrdered className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        disabled={isLoading}
        title="Citação"
      >
        <Quote className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        disabled={isLoading}
        title="Código"
      >
        <Code className="h-4 w-4" />
      </MenuButton>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <MenuButton
        onClick={setLink}
        isActive={editor.isActive('link')}
        disabled={isLoading}
        title="Link"
      >
        <LinkIcon className="h-4 w-4" />
      </MenuButton>

      {onImageUpload && (
        <>
          <MenuButton
            onClick={() => imageInputRef.current?.click()}
            disabled={isLoading}
            title="Inserir imagem"
          >
            <ImageIcon className="h-4 w-4" />
          </MenuButton>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </>
      )}

      {onFileAttach && (
        <>
          <MenuButton
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Anexar arquivo"
          >
            <Paperclip className="h-4 w-4" />
          </MenuButton>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileAttach}
          />
        </>
      )}

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <MenuButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo() || isLoading}
        title="Desfazer (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo() || isLoading}
        title="Refazer (Ctrl+Y)"
      >
        <Redo className="h-4 w-4" />
      </MenuButton>
    </div>
  );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content = '',
  onChange,
  onSubmit,
  placeholder = 'Digite aqui...',
  editable = true,
  minHeight = '100px',
  maxHeight = '300px',
  showToolbar = true,
  onImageUpload,
  onFileAttach,
  isLoading = false,
  submitLabel = 'Enviar',
  attachedFiles = [],
  onRemoveFile,
  variant = 'default',
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-2',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit]
  );

  return (
    <div
      className={cn(
        'border border-gray-200 rounded-lg overflow-hidden bg-white',
        variant === 'comment' && 'border-gray-300'
      )}
      onKeyDown={handleKeyDown}
    >
      {showToolbar && (
        <MenuBar
          editor={editor}
          onImageUpload={onImageUpload}
          onFileAttach={onFileAttach}
          isLoading={isLoading}
        />
      )}

      {/* Arquivos anexados */}
      {attachedFiles.length > 0 && (
        <div className="p-2 border-b border-gray-200 bg-blue-50">
          <div className="flex flex-wrap gap-2">
            {attachedFiles.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-2 py-1 bg-white rounded border border-blue-200"
              >
                {item.preview ? (
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    className="h-8 w-8 object-cover rounded"
                  />
                ) : (
                  <Paperclip className="h-4 w-4 text-blue-500" />
                )}
                <span className="text-sm text-gray-700 max-w-[150px] truncate">
                  {item.file.name}
                </span>
                {onRemoveFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => onRemoveFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <EditorContent
        editor={editor}
        className={cn(
          'prose prose-sm max-w-none p-3',
          '[&_.ProseMirror]:outline-none',
          '[&_.ProseMirror]:min-h-[var(--min-height)]',
          '[&_.ProseMirror]:max-h-[var(--max-height)]',
          '[&_.ProseMirror]:overflow-y-auto',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0'
        )}
        style={
          {
            '--min-height': minHeight,
            '--max-height': maxHeight,
          } as React.CSSProperties
        }
      />

      {onSubmit && (
        <div className="flex items-center justify-end gap-2 p-2 border-t border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-400 mr-auto">
            Ctrl+Enter para enviar
          </span>
          <Button
            type="button"
            size="sm"
            onClick={onSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : null}
            {submitLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export const RichTextViewer: React.FC<{
  content: string;
  className?: string;
}> = ({ content, className }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-2',
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
      Underline,
    ],
    content,
    editable: false,
  });

  return (
    <EditorContent
      editor={editor}
      className={cn(
        'prose prose-sm max-w-none',
        '[&_.ProseMirror]:outline-none',
        className
      )}
    />
  );
};

export default RichTextEditor;
