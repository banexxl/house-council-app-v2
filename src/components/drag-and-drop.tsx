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
import { Box, Button, TextField } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useTranslation } from 'react-i18next';

export type SortableItem = { id?: string; label: string; isDirty?: boolean };
export type SortableOptionsListProps<T extends SortableItem = SortableItem> = {
     options: T[];
     disabled?: boolean;
     onDelete: (idx: number) => void;
     onSave?: (idx: number) => void;
     onLabelChange: (idx: number, value: string) => void;
     onReorder: (newOptions: T[]) => void;
};

export function SortableOptionsList<T extends SortableItem>({ options, disabled, onDelete, onSave, onLabelChange, onReorder }: SortableOptionsListProps<T>) {
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
                              isDirty={(opt as any).isDirty}
                              disabled={disabled}
                              canDelete={Boolean((opt as any).id)}
                              onDelete={() => onDelete(idx)}
                              onSave={onSave ? () => onSave(idx) : undefined}
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
     isDirty?: boolean;
     disabled?: boolean;
     canDelete?: boolean;
     onDelete: () => void;
     onSave?: () => void;
     onLabelChange: (value: string) => void;
};

function SortableOptionItem({ id, label, isDirty, disabled, canDelete, onDelete, onSave, onLabelChange }: SortableOptionItemProps) {
     const {
          attributes,
          listeners,
          setNodeRef,
          transform,
          transition,
          isDragging,
     } = useSortable({ id });
     const { t } = useTranslation();
     const trimmedLabel = label.trim();

     return (
          <Box
               ref={setNodeRef}
               {...attributes}
               sx={{
                    transform: CSS.Transform.toString(transform),
                    transition,
                    opacity: isDragging ? 0.5 : 1,
                    backgroundColor: isDragging ? '#f5f5f5' : 'transparent',
                    borderRadius: 1,
                    py: 0.5,
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'stretch', sm: 'center' },
                    gap: 1,
               }}
          >
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                    <Box component="span" {...listeners} sx={{ cursor: 'grab', color: '#888', userSelect: 'none', display: 'flex', alignItems: 'center' }}>
                         <DragIndicatorIcon fontSize="small" />
                    </Box>
                    <TextField
                         disabled={disabled}
                         size="small"
                         label="Option label"
                         value={label}
                         onChange={(e) => onLabelChange(e.target.value)}
                         sx={{ flex: 1 }}
                    />
               </Box>

               <Box
                    sx={{
                         display: 'flex',
                         gap: 1,
                         width: { xs: '100%', sm: 'auto' },
                         pl: { xs: 3.5, sm: 0 },
                         justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                    }}
               >
                    <Button
                         type="button"
                         disabled={disabled}
                         color="error"
                         variant="outlined"
                         onClick={onDelete}
                         sx={{ flex: { xs: 1, sm: 'none' } }}
                    >
                         {t('common.btnDelete')}
                    </Button>
                    <Button
                         type="button"
                         disabled={disabled || !trimmedLabel || !isDirty}
                         color="primary"
                         variant="contained"
                         onClick={onSave}
                         sx={{ flex: { xs: 1, sm: 'none' } }}
                    >
                         {t('common.btnSave')}
                    </Button>
               </Box>
          </Box>
     );
}
