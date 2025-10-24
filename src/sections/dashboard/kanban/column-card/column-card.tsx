import type { FC } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';

import { useSelector } from 'src/store';
import type { Column } from 'src/types/kanban';

import { TaskAdd } from '../task-add';
import { TaskCard } from '../task-card';
import { ColumnHeader } from './column-header';

// dnd-kit
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const useColumn = (columnId: string): Column | undefined => {
  return useSelector((state) => {
    const { columns } = state.kanban;
    return columns.byId[columnId];
  });
};

interface ColumnCardProps {
  columnId: string;
  onClear?: () => void;
  onDelete?: () => void;
  onRename?: (name: string) => void;
  onTaskAdd?: (name?: string) => void;
  onTaskOpen?: (taskId: string) => void;
}

export const ColumnCard: FC<ColumnCardProps> = (props) => {
  const { columnId, onTaskAdd, onTaskOpen, onClear, onDelete, onRename, ...other } = props;
  const column = useColumn(columnId);

  // Make the column body a droppable container so you can drop into an empty column
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: columnId,
    data: { type: 'column' },
  });

  if (!column) return null;

  const tasks = column.taskIds;
  const tasksCount = tasks.length;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
        overflowX: 'hidden',
        overflowY: 'hidden',
        width: { xs: 300, sm: 380 },
      }}
      {...other}
    >
      <ColumnHeader
        name={column.name}
        onClear={onClear}
        onDelete={onDelete}
        onRename={onRename}
        tasksCount={tasksCount}
      />

      <Box
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark' ? 'neutral.900' : 'neutral.100',
          borderRadius: 2.5,
        }}
      >
        {/* Sortable list context for the tasks in this column */}
        <SortableContext items={tasks} strategy={verticalListSortingStrategy}>
          <Box
            ref={setDroppableRef}
            sx={{
              flexGrow: 1,
              minHeight: 80,
              overflowY: 'auto',
              px: 3,
              pt: 1.5,
              // optional visual cue when dragging over this column
              outline: isOver ? '2px dashed rgba(0,0,0,0.2)' : 'none',
              outlineOffset: isOver ? '2px' : '0',
              borderRadius: 2,
              transition: 'outline 120ms ease',
            }}
          >
            {tasks.map((taskId) => (
              <SortableTask
                key={taskId}
                taskId={taskId}
                columnId={columnId}
                onOpen={onTaskOpen}
              />
            ))}
          </Box>
        </SortableContext>

        <Box sx={{ pt: 1.5, pb: 3, px: 3 }}>
          <TaskAdd onAdd={onTaskAdd} />
        </Box>
      </Box>
    </Box>
  );
};

ColumnCard.propTypes = {
  columnId: PropTypes.string.isRequired,
  onClear: PropTypes.func,
  onDelete: PropTypes.func,
  onRename: PropTypes.func,
  onTaskAdd: PropTypes.func,
  onTaskOpen: PropTypes.func,
};

/**
 * A sortable wrapper around your TaskCard using dnd-kit’s useSortable.
 * We attach data with the task’s columnId so the Page onDragEnd can compute source/destination.
 */
function SortableTask({
  taskId,
  columnId,
  onOpen,
}: {
  taskId: string;
  columnId: string;
  onOpen?: (taskId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: taskId,
    data: { type: 'task', columnId, taskId },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{ outline: 'none', py: 1.5, cursor: 'grab' }}
      {...attributes}
      {...listeners}
    >
      <TaskCard
        key={taskId}
        dragging={isDragging}
        onOpen={() => onOpen?.(taskId)}
        taskId={taskId}
      />
    </Box>
  );
}
