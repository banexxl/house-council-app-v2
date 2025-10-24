'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'src/store';
import toast from 'react-hot-toast';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { Seo } from 'src/components/seo';
import { ColumnCard } from 'src/sections/dashboard/kanban/column-card';
import { ColumnAdd } from 'src/sections/dashboard/kanban/column-add';

// dnd-kit
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';

function useColumnsIds(): string[] {
  const { columns } = useSelector((s) => s.kanban);
  return columns.allIds;
}

function useColumnsById(): Record<string, { id: string; name: string; taskIds: string[] }> {
  const { columns } = useSelector((s) => s.kanban);
  return columns.byId;
}

const Page = () => {
  const dispatch = useDispatch();
  const columnsIds = useColumnsIds();
  const columnsById = useColumnsById();
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // Track the column where drag started (so we don’t rely on DOM during end)
  const dragStartColumnIdRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleTaskOpen = useCallback((taskId: string): void => {
    setCurrentTaskId(taskId);
  }, []);

  const handleTaskClose = useCallback((): void => {
    setCurrentTaskId(null);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    // event.active.data.current is set in Sortable item
    const data = event.active.data.current as { type: 'task'; columnId: string } | undefined;
    dragStartColumnIdRef.current = data?.type === 'task' ? data.columnId : null;
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      try {
        const { active, over } = event;
        if (!over) return;

        // Active is always a task in our setup
        const activeData = active.data.current as
          | { type: 'task'; columnId: string }
          | undefined;
        const overData = over.data.current as
          | { type: 'task'; columnId: string; index?: number }
          | { type: 'column' }
          | undefined;

        const taskId = String(active.id);
        const sourceColumnId =
          activeData?.type === 'task'
            ? activeData.columnId
            : dragStartColumnIdRef.current;

        // Destination may be a task (dropping above/below it) or the column container (empty area)
        let destinationColumnId: string;
        let destinationIndex: number;

        if (overData?.type === 'task') {
          destinationColumnId = overData.columnId;
          // Compute index where it should land relative to the over task
          const destTasks = columnsById[destinationColumnId]?.taskIds ?? [];
          const overIndex = destTasks.indexOf(String(over.id));
          destinationIndex = overIndex < 0 ? destTasks.length : overIndex;
        } else {
          // Dropped on a column container (id is the column id)
          destinationColumnId = String(over.id);
          const destTasks = columnsById[destinationColumnId]?.taskIds ?? [];
          destinationIndex = destTasks.length; // append to end
        }

        if (!sourceColumnId || !destinationColumnId) return;

        // If nothing changed, bail
        if (sourceColumnId === destinationColumnId) {
          const arr = columnsById[sourceColumnId]?.taskIds ?? [];
          const oldIndex = arr.indexOf(taskId);
          if (oldIndex === destinationIndex || oldIndex < 0) return;

          // Same-column move
          // await dispatch(thunks.moveTask({ taskId, position: destinationIndex }));
          // If you don't want to call thunks yet, remove the comment above and use your thunk.
        } else {
          // Cross-column move
          // await dispatch(thunks.moveTask({ taskId, position: destinationIndex, columnId: destinationColumnId }));
        }
      } catch (err) {
        console.error(err);
        toast.error('Something went wrong with drag & drop!');
      } finally {
        dragStartColumnIdRef.current = null;
      }
    },
    [columnsById /*, dispatch*/]
  );

  // If you plan to block sorting while data is loading, you can memo guards here.
  useMemo(() => columnsIds, [columnsIds]);

  return (
    <>
      <Seo title="Dashboard: Kanban" />
      <Box
        component="main"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          overflow: 'hidden',
          pt: 8,
        }}
      >
        <Box sx={{ px: 3 }}>
          <Typography variant="h4">Kanban</Typography>
        </Box>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Box
            sx={{
              display: 'flex',
              flexGrow: 1,
              flexShrink: 1,
              overflowX: 'auto',
              overflowY: 'hidden',
              px: 3,
              py: 3,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 3,
              }}
            >
              {columnsIds.map((columnId) => (
                <ColumnCard
                  key={columnId}
                  columnId={columnId}
                  // onClear={() => dispatch(thunks.clearColumn({ columnId }))}
                  // onDelete={() => dispatch(thunks.deleteColumn({ columnId }))}
                  // onRename={(name) => dispatch(thunks.updateColumn({ columnId, update: { name } }))}
                  // onTaskAdd={(name) => dispatch(thunks.createTask({ columnId, name: name || 'Untitled Task' }))}
                  onTaskOpen={handleTaskOpen}
                />
              ))}

              {/* <ColumnAdd onAdd={(name) => dispatch(thunks.createColumn({ name: name || 'Untitled Column' }))} /> */}
              <ColumnAdd onAdd={() => { /* wire your thunk here */ }} />
            </Box>
          </Box>
        </DndContext>
      </Box>

      {/* <TaskModal
        onClose={handleTaskClose}
        open={!!currentTaskId}
        taskId={currentTaskId || undefined}
      /> */}
    </>
  );
};

export default Page;
