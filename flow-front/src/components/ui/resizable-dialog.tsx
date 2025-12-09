import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const ResizableDialog = DialogPrimitive.Root;
const ResizableDialogTrigger = DialogPrimitive.Trigger;
const ResizableDialogPortal = DialogPrimitive.Portal;
const ResizableDialogClose = DialogPrimitive.Close;

const ResizableDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
ResizableDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface ResizableDialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  minWidth?: number;
  minHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

const ResizableDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ResizableDialogContentProps
>(
  (
    {
      className,
      children,
      minWidth = 600,
      minHeight = 400,
      defaultWidth = 1200,
      defaultHeight = 700,
      maxWidth,
      maxHeight,
      ...props
    },
    ref
  ) => {
    const [size, setSize] = React.useState({ width: defaultWidth, height: defaultHeight });
    const [position, setPosition] = React.useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = React.useState(false);
    const [isResizing, setIsResizing] = React.useState<string | null>(null);
    const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
    const [initialPos, setInitialPos] = React.useState({ x: 0, y: 0 });
    const [initialSize, setInitialSize] = React.useState({ width: 0, height: 0 });
    const contentRef = React.useRef<HTMLDivElement>(null);

    // Calcular limites máximos baseados na viewport
    const effectiveMaxWidth = maxWidth || window.innerWidth - 40;
    const effectiveMaxHeight = maxHeight || window.innerHeight - 40;

    // Centralizar no mount
    React.useEffect(() => {
      const centerX = 0;
      const centerY = 0;
      setPosition({ x: centerX, y: centerY });
    }, []);

    const handleMouseDown = (e: React.MouseEvent, type: string) => {
      e.preventDefault();
      e.stopPropagation();

      if (type === 'drag') {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setInitialPos({ x: position.x, y: position.y });
      } else {
        setIsResizing(type);
        setDragStart({ x: e.clientX, y: e.clientY });
        setInitialSize({ width: size.width, height: size.height });
        setInitialPos({ x: position.x, y: position.y });
      }
    };

    React.useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          const deltaX = e.clientX - dragStart.x;
          const deltaY = e.clientY - dragStart.y;
          setPosition({
            x: initialPos.x + deltaX,
            y: initialPos.y + deltaY,
          });
        } else if (isResizing) {
          const deltaX = e.clientX - dragStart.x;
          const deltaY = e.clientY - dragStart.y;

          let newWidth = initialSize.width;
          let newHeight = initialSize.height;
          let newX = initialPos.x;
          let newY = initialPos.y;

          if (isResizing.includes('e')) {
            newWidth = Math.max(minWidth, Math.min(effectiveMaxWidth, initialSize.width + deltaX));
          }
          if (isResizing.includes('w')) {
            const widthDelta = Math.max(minWidth, Math.min(effectiveMaxWidth, initialSize.width - deltaX)) - initialSize.width;
            newWidth = initialSize.width + widthDelta;
            newX = initialPos.x - widthDelta;
          }
          if (isResizing.includes('s')) {
            newHeight = Math.max(minHeight, Math.min(effectiveMaxHeight, initialSize.height + deltaY));
          }
          if (isResizing.includes('n')) {
            const heightDelta = Math.max(minHeight, Math.min(effectiveMaxHeight, initialSize.height - deltaY)) - initialSize.height;
            newHeight = initialSize.height + heightDelta;
            newY = initialPos.y - heightDelta;
          }

          setSize({ width: newWidth, height: newHeight });
          setPosition({ x: newX, y: newY });
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(null);
      };

      if (isDragging || isResizing) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = isDragging ? 'grabbing' : isResizing ? `${isResizing}-resize` : 'default';
        document.body.style.userSelect = 'none';
      }

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      };
    }, [isDragging, isResizing, dragStart, initialPos, initialSize, minWidth, minHeight, effectiveMaxWidth, effectiveMaxHeight]);

    return (
      <ResizableDialogPortal>
        <ResizableDialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            'fixed z-50 bg-white shadow-2xl rounded-lg border border-gray-200 flex flex-col',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            className
          )}
          style={{
            width: size.width,
            height: size.height,
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
          }}
          {...props}
        >
          {/* Resize handles */}
          {/* Corners */}
          <div
            className="absolute -top-1 -left-1 w-3 h-3 cursor-nw-resize z-50"
            onMouseDown={(e) => handleMouseDown(e, 'nw')}
          />
          <div
            className="absolute -top-1 -right-1 w-3 h-3 cursor-ne-resize z-50"
            onMouseDown={(e) => handleMouseDown(e, 'ne')}
          />
          <div
            className="absolute -bottom-1 -left-1 w-3 h-3 cursor-sw-resize z-50"
            onMouseDown={(e) => handleMouseDown(e, 'sw')}
          />
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 cursor-se-resize z-50 group"
            onMouseDown={(e) => handleMouseDown(e, 'se')}
          >
            <div className="absolute bottom-1 right-1 w-4 h-4 flex items-end justify-end opacity-40 group-hover:opacity-70">
              <svg width="10" height="10" viewBox="0 0 10 10" className="text-gray-400">
                <path d="M9 1v8H1" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M6 4v4H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
          </div>

          {/* Edges */}
          <div
            className="absolute -top-1 left-3 right-3 h-2 cursor-n-resize z-40"
            onMouseDown={(e) => handleMouseDown(e, 'n')}
          />
          <div
            className="absolute -bottom-1 left-3 right-3 h-2 cursor-s-resize z-40"
            onMouseDown={(e) => handleMouseDown(e, 's')}
          />
          <div
            className="absolute -left-1 top-3 bottom-3 w-2 cursor-w-resize z-40"
            onMouseDown={(e) => handleMouseDown(e, 'w')}
          />
          <div
            className="absolute -right-1 top-3 bottom-3 w-2 cursor-e-resize z-40"
            onMouseDown={(e) => handleMouseDown(e, 'e')}
          />

          {/* Content wrapper with overflow handling */}
          <div ref={contentRef} className="flex flex-col h-full overflow-hidden">
            {children}
          </div>

          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-50">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </ResizableDialogPortal>
    );
  }
);
ResizableDialogContent.displayName = DialogPrimitive.Content.displayName;

const ResizableDialogHeader = ({
  className,
  onDragStart,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { onDragStart?: (e: React.MouseEvent) => void }) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-lg cursor-grab active:cursor-grabbing shrink-0',
      className
    )}
    onMouseDown={onDragStart}
    {...props}
  />
);
ResizableDialogHeader.displayName = 'ResizableDialogHeader';

const ResizableDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-lg shrink-0',
      className
    )}
    {...props}
  />
);
ResizableDialogFooter.displayName = 'ResizableDialogFooter';

const ResizableDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
ResizableDialogTitle.displayName = DialogPrimitive.Title.displayName;

const ResizableDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
ResizableDialogDescription.displayName = DialogPrimitive.Description.displayName;

// Hook para usar drag no header
const useDialogDrag = () => {
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = React.useState({ x: 0, y: 0 });

  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, [role="button"]')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ x: position.x, y: position.y });
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setPosition({
        x: initialPos.x + deltaX,
        y: initialPos.y + deltaY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isDragging, dragStart, initialPos]);

  return { position, handleDragStart, isDragging };
};

export {
  ResizableDialog,
  ResizableDialogPortal,
  ResizableDialogOverlay,
  ResizableDialogClose,
  ResizableDialogTrigger,
  ResizableDialogContent,
  ResizableDialogHeader,
  ResizableDialogFooter,
  ResizableDialogTitle,
  ResizableDialogDescription,
  useDialogDrag,
};
