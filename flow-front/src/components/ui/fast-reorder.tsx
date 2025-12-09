import React, { useState, useCallback, useRef, useMemo } from 'react';
import { formatHoursToDisplay } from '@/lib/time-utils';

interface FastReorderContextProps {
  children: React.ReactNode;
  onReorder: (sourceId: string, targetId: string, insertPosition: 'before' | 'after') => Promise<void>;
  onMove: (taskId: number, targetContainerId: string) => Promise<void>;
}

interface DragState {
  isDragging: boolean;
  draggedItemId: string | null;
  draggedFromContainer: string | null;
  hoverItemId: string | null;
  hoverPosition: 'before' | 'after' | null;
  cursorPosition: { x: number; y: number };
  draggedTaskInfo: {
    title: string;
    assigneeName?: string;
    status: string;
    estimatedHours: string;
  } | null;
}

const FastReorderContext = React.createContext<{
  dragState: DragState;
  startDrag: (itemId: string, containerId: string, event: React.MouseEvent, taskInfo?: { title: string; assigneeName?: string; status: string; estimatedHours: string }) => void;
  endDrag: () => void;
  updateHover: (itemId: string | null, position: 'before' | 'after' | null) => void;
  updateCursor: (x: number, y: number) => void;
} | null>(null);

export const FastReorderProvider: React.FC<FastReorderContextProps> = ({
  children,
  onReorder,
  onMove,
}) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItemId: null,
    draggedFromContainer: null,
    hoverItemId: null,
    hoverPosition: null,
    cursorPosition: { x: 0, y: 0 },
    draggedTaskInfo: null,
  });

  const dragTimeoutRef = useRef<NodeJS.Timeout>();

  const startDrag = useCallback((itemId: string, containerId: string, event: React.MouseEvent, taskInfo?: { title: string; assigneeName?: string; status: string; estimatedHours: string }) => {
    event.preventDefault();
    
    // Debounce para evitar drag acidental
    if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    
    dragTimeoutRef.current = setTimeout(() => {
      setDragState({
        isDragging: true,
        draggedItemId: itemId,
        draggedFromContainer: containerId,
        hoverItemId: null,
        hoverPosition: null,
        cursorPosition: { x: event.clientX, y: event.clientY },
        draggedTaskInfo: taskInfo || null,
      });

      const handleMouseMove = (e: MouseEvent) => {
        setDragState(prev => ({
          ...prev,
          cursorPosition: { x: e.clientX, y: e.clientY },
        }));
      };

      const handleMouseUp = async () => {
        setDragState(currentState => {
          if (currentState.hoverItemId && currentState.hoverPosition && currentState.draggedItemId) {
            setTimeout(async () => {
              try {
                let targetContainerId = '';
                if (currentState.hoverItemId.includes('-drop')) {
                  targetContainerId = currentState.hoverItemId.replace('-drop', '');
                } else {
                  await onReorder(currentState.draggedItemId, currentState.hoverItemId, currentState.hoverPosition);
                  return;
                }
                
                // Se chegou aqui, é movimento entre containers
                if (currentState.draggedFromContainer !== targetContainerId) {
                  await onMove(parseInt(currentState.draggedItemId), targetContainerId);
                } else {
                  await onReorder(currentState.draggedItemId, currentState.hoverItemId, currentState.hoverPosition);
                }
              } catch (error) {
                console.error('Erro na reorganização:', error);
              }
            }, 0);
          }
          
          // Retornar o estado resetado
          return {
            isDragging: false,
            draggedItemId: null,
            draggedFromContainer: null,
            hoverItemId: null,
            hoverPosition: null,
            cursorPosition: { x: 0, y: 0 },
            draggedTaskInfo: null,
          };
        });

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }, 150); // Delay maior para evitar drags acidentais
  }, [onReorder, onMove]);

  const endDrag = useCallback(() => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    setDragState({
      isDragging: false,
      draggedItemId: null,
      draggedFromContainer: null,
      hoverItemId: null,
      hoverPosition: null,
      cursorPosition: { x: 0, y: 0 },
      draggedTaskInfo: null,
    });
  }, []);

  const updateHover = useCallback((itemId: string | null, position: 'before' | 'after' | null) => {
    if (!dragState.isDragging) return;
    
    setDragState(prev => ({
      ...prev,
      hoverItemId: itemId,
      hoverPosition: position,
    }));
  }, [dragState.isDragging]);

  const updateCursor = useCallback((x: number, y: number) => {
    if (!dragState.isDragging) return;
    
    setDragState(prev => ({
      ...prev,
      cursorPosition: { x, y },
    }));
  }, [dragState.isDragging]);

  const contextValue = useMemo(() => ({
    dragState,
    startDrag,
    endDrag,
    updateHover,
    updateCursor,
  }), [dragState, startDrag, endDrag, updateHover, updateCursor]);

  // Expor updateHover e dragState globalmente para drop zones externas
  React.useEffect(() => {
    (window as any).fastReorderUpdateHover = updateHover;
    (window as any).fastReorderDragState = dragState;
    return () => {
      delete (window as any).fastReorderUpdateHover;
      delete (window as any).fastReorderDragState;
    };
  }, [updateHover, dragState]);

  return (
    <FastReorderContext.Provider value={contextValue}>
      {children}
      {/* Indicador de atividade durante drag */}
      {dragState.isDragging && dragState.draggedTaskInfo && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: dragState.cursorPosition.x + 10,
            top: dragState.cursorPosition.y - 20,
          }}
        >
          <div className="bg-white border-2 border-blue-500 rounded-lg p-3 shadow-lg min-w-[200px] max-w-[300px]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
              <h3 className="font-medium text-sm text-gray-900 truncate">
                {dragState.draggedTaskInfo.title}
              </h3>
            </div>
            
            <div className="space-y-1 text-xs text-gray-600">
              {dragState.draggedTaskInfo.assigneeName && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">👤</span>
                  <span>{dragState.draggedTaskInfo.assigneeName}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <span className="text-gray-500">📊</span>
                <span>{dragState.draggedTaskInfo.status}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <span className="text-gray-500">⏱️</span>
                <span>{formatHoursToDisplay(dragState.draggedTaskInfo.estimatedHours)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </FastReorderContext.Provider>
  );
};

interface FastReorderItemProps {
  id: string;
  containerId: string;
  children: React.ReactNode;
  className?: string;
  dragHandleSelector?: string; // Seletor CSS para o handle de drag
  taskInfo?: {
    title: string;
    assigneeName?: string;
    status: string;
    estimatedHours: string;
  };
}

export const FastReorderItem: React.FC<FastReorderItemProps> = ({
  id,
  containerId,
  children,
  className = '',
  dragHandleSelector,
  taskInfo,
}) => {
  const context = React.useContext(FastReorderContext);
  const elementRef = useRef<HTMLDivElement>(null);
  
  if (!context) {
    throw new Error('FastReorderItem deve ser usado dentro de FastReorderProvider');
  }

  const { dragState, startDrag, updateHover } = context;
  
  const isBeingDragged = dragState.isDragging && dragState.draggedItemId === id;
  const isHovering = dragState.hoverItemId === id;

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    // Se um seletor de drag handle foi fornecido, verificar se o clique foi no handle
    if (dragHandleSelector) {
      const target = event.target as HTMLElement;
      const handle = target.closest(dragHandleSelector);
      
      // Se não clicou no handle, não iniciar o drag
      if (!handle) {
        return;
      }
    }
    
    event.preventDefault();
    startDrag(id, containerId, event, taskInfo);
  }, [id, containerId, startDrag, taskInfo, dragHandleSelector]);

  const handleMouseEnter = useCallback((event: React.MouseEvent) => {
    if (!dragState.isDragging || dragState.draggedItemId === id) return;

    const rect = elementRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseY = event.clientY;
    const centerY = rect.top + rect.height / 2;
    const position = mouseY < centerY ? 'before' : 'after';
    updateHover(id, position);
  }, [dragState.isDragging, dragState.draggedItemId, id, updateHover]);

  const handleMouseLeave = useCallback(() => {
    if (dragState.isDragging) {
      updateHover(null, null);
    }
  }, [dragState.isDragging, updateHover]);

  return (
    <>
      {/* Linha de inserção antes */}
      {isHovering && dragState.hoverPosition === 'before' && (
        <tr className="h-1">
          <td colSpan={9} className="p-0 relative">
            <div className="absolute inset-x-2 top-0 h-0.5 bg-blue-500 z-10" />
          </td>
        </tr>
      )}
      
      {React.cloneElement(children as React.ReactElement, {
        ref: elementRef,
        className: `${(children as React.ReactElement).props.className || ''} ${className} ${isBeingDragged ? 'opacity-30' : ''}`,
        onMouseDown: handleMouseDown,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        style: { 
          userSelect: 'none', 
          cursor: dragHandleSelector ? 'default' : 'grab',
          ...(children as React.ReactElement).props.style 
        },
      })}

      {/* Linha de inserção depois */}
      {isHovering && dragState.hoverPosition === 'after' && (
        <tr className="h-1">
          <td colSpan={9} className="p-0 relative">
            <div className="absolute inset-x-2 bottom-0 h-0.5 bg-blue-500 z-10" />
          </td>
        </tr>
      )}
    </>
  );
};

interface FastReorderContainerProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export const FastReorderContainer: React.FC<FastReorderContainerProps> = ({
  id,
  children,
  className = '',
}) => {
  const context = React.useContext(FastReorderContext);
  
  if (!context) {
    throw new Error('FastReorderContainer deve ser usado dentro de FastReorderProvider');
  }

  const { dragState, updateHover } = context;

  const handleMouseEnter = useCallback(() => {
    if (dragState.isDragging) {
      // Verificar se é um movimento entre containers
      if (dragState.draggedFromContainer !== id) {
        updateHover(`${id}-drop`, 'after');
      }
    }
  }, [dragState.isDragging, dragState.draggedFromContainer, id, updateHover]);

  return (
    <div
      className={className}
      onMouseEnter={handleMouseEnter}
      data-container-id={id}
    >
      {children}
    </div>
  );
};