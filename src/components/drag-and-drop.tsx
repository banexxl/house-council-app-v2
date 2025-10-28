'use client';
// Drag-and-drop poll options list using @dnd-kit
import {
     DndContext,
     closestCenter,
     PointerSensor,
     useSensor,
     useSensors,
} from '@dnd-kit/core';
import {
     arrayMove,
     SortableContext,
     useSortable,
     verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, TextField } from '@mui/material';

export type SortableItem = { id?: string; label: string };
export type SortableOptionsListProps<T extends SortableItem = SortableItem> = {
     options: T[];
     disabled?: boolean;
     onDelete: (idx: number) => void;
     onLabelChange: (idx: number, value: string) => void;
     onReorder: (newOptions: T[]) => void;
};

export function SortableOptionsList<T extends SortableItem>({ options, disabled, onDelete, onLabelChange, onReorder }: SortableOptionsListProps<T>) {
     const sensors = useSensors(
          useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
     );
     const ids = options.map((opt, idx) => opt.id ?? `option-${idx}`);

     return (
          <DndContext
               sensors={sensors}
               collisionDetection={closestCenter}
               onDragEnd={({ active, over }) => {
                    if (disabled) return;
                    if (over && active.id !== over.id) {
                         const oldIndex = ids.indexOf(active.id as string);
                         const newIndex = ids.indexOf(over.id as string);
                         const newOptions = arrayMove(options, oldIndex, newIndex) as T[];
                         onReorder(newOptions);
                    }
               }}
          >
               <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    {options.map((opt, idx) => (
                         <SortableOptionItem
                              key={ids[idx]}
                              id={ids[idx]}
                              idx={idx}
                              label={opt.label}
                              disabled={disabled}
                              onDelete={() => onDelete(idx)}
                              onLabelChange={(value) => onLabelChange(idx, value)}
                         />
                    ))}
               </SortableContext>
          </DndContext>
     );
}

type SortableOptionItemProps = {
     id: string;
     idx: number;
     label: string;
     disabled?: boolean;
     onDelete: () => void;
     onLabelChange: (value: string) => void;
};

function SortableOptionItem({ id, label, disabled, onDelete, onLabelChange }: SortableOptionItemProps) {
     const {
          attributes,
          listeners,
          setNodeRef,
          transform,
          transition,
          isDragging,
     } = useSortable({ id });
     const style = {
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.5 : 1,
          background: isDragging ? '#f5f5f5' : undefined,
          borderRadius: 4,
          padding: '4px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
     };
     return (
          <div ref={setNodeRef} style={style} {...attributes}>
               <span {...listeners} style={{ cursor: 'grab', marginRight: 8, color: '#888' }}>≡</span>
               <TextField
                    disabled={disabled}
                    size="small"
                    label="Option label"
                    value={label}
                    onChange={(e) => onLabelChange(e.target.value)}
                    sx={{ flex: 1 }}
               />
               <Button
                    type="button"
                    disabled={disabled}
                    color="error"
                    variant="outlined"
                    onClick={onDelete}
               >
                    Delete
               </Button>
          </div>
     );
}
