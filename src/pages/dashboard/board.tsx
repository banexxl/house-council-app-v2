import { useCallback, useEffect, useState } from 'react';
import type { NextPage } from 'next';
import type { DropResult } from 'react-beautiful-dnd';
import { DragDropContext } from 'react-beautiful-dnd';
import toast from 'react-hot-toast';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Seo } from 'src/components/seo';
import { usePageView } from 'src/hooks/use-page-view';
import { Layout as DashboardLayout } from 'src/layouts/dashboard';
import { TaskModal } from 'src/sections/dashboard/board/task-modal';
import { ColumnCard } from 'src/sections/dashboard/board/column-card';
import { ColumnAdd } from 'src/sections/dashboard/board/column-add';
import { useDispatch, useSelector } from 'src/store';
import { thunks } from 'src/thunks/board';
import { Autocomplete, Button, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from '@mui/material';
import { Building } from '@/types/building';
import { boardServices } from '@/utils/board-services';

const useColumnsIds = (): string[] => {

          const { columns } = useSelector((state) => state.board);

          return columns.allIds;
};

const useBoard = (): void => {
          const dispatch = useDispatch();

          const handleBoardGet = useCallback((): void => {
                    dispatch(thunks.getBoard());
          }, [dispatch]);

          useEffect(
                    () => {
                              handleBoardGet();
                    },
                    // eslint-disable-next-line react-hooks/exhaustive-deps
                    []
          );
};

const Page: NextPage = (props: any) => {
          const dispatch = useDispatch();
          const columnsIds = useColumnsIds();
          const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
          const [selectedBuilding, setSelectedBuilding] = useState()
          console.log('props sa boards page-aaaaaa', props);

          usePageView();
          useBoard();
          const [age, setAge] = useState<string | number>('');
          const [open, setOpen] = useState(false);

          const handleChange = (event: SelectChangeEvent<typeof age>) => {
                    setAge(event.target.value);
          };

          const handleClose = () => {
                    setOpen(false);
          };

          const handleOpen = () => {
                    setOpen(true);
          };

          const handleDragEnd = useCallback(
                    async ({ source, destination, draggableId }: DropResult): Promise<void> => {
                              try {
                                        // Dropped outside the column
                                        if (!destination) {
                                                  return;
                                        }

                                        // Task has not been moved
                                        if (source.droppableId === destination.droppableId && source.index === destination.index) {
                                                  return;
                                        }

                                        if (source.droppableId === destination.droppableId) {
                                                  // Moved to the same column on different position
                                                  await dispatch(
                                                            thunks.moveTask({
                                                                      taskId: draggableId,
                                                                      position: destination.index,
                                                            })
                                                  );
                                        } else {
                                                  // Moved to another column
                                                  await dispatch(
                                                            thunks.moveTask({
                                                                      taskId: draggableId,
                                                                      position: destination.index,
                                                                      columnId: destination.droppableId,
                                                            })
                                                  );
                                        }
                              } catch (err) {
                                        console.error(err);
                                        toast.error('Something went wrong!');
                              }
                    },
                    [dispatch]
          );

          const handleColumnAdd = useCallback(
                    async (name?: string) => {
                              try {
                                        await dispatch(
                                                  thunks.createColumn({
                                                            name: name || 'Untitled Column',
                                                  })
                                        );
                                        toast.success('Column created');
                              } catch (err) {
                                        console.error(err);
                                        toast.error('Something went wrong!');
                              }
                    },
                    [dispatch]
          );

          const handleColumnClear = useCallback(
                    async (columnId: string): Promise<void> => {
                              try {
                                        await dispatch(
                                                  thunks.clearColumn({
                                                            columnId,
                                                  })
                                        );
                                        toast.success('Column cleared');
                              } catch (err) {
                                        console.error(err);
                                        toast.error('Something went wrong!');
                              }
                    },
                    [dispatch]
          );

          const handleColumnDelete = useCallback(
                    async (columnId: string): Promise<void> => {
                              try {
                                        await dispatch(
                                                  thunks.deleteColumn({
                                                            columnId,
                                                  })
                                        );
                                        toast.success('Column deleted');
                              } catch (err) {
                                        console.error(err);
                                        toast.error('Something went wrong!');
                              }
                    },
                    [dispatch]
          );

          const handleColumnRename = useCallback(
                    async (columnId: string, name: string): Promise<void> => {
                              try {
                                        await dispatch(
                                                  thunks.updateColumn({
                                                            columnId,
                                                            update: { name },
                                                  })
                                        );
                              } catch (err) {
                                        console.error(err);
                                        toast.error('Something went wrong!');
                              }
                    },
                    [dispatch]
          );

          const handleTaskAdd = useCallback(
                    async (columnId: string, name?: string): Promise<void> => {
                              try {
                                        await dispatch(
                                                  thunks.createTask({
                                                            columnId,
                                                            name: name || 'Untitled Task',
                                                  })
                                        );
                              } catch (err) {
                                        console.error(err);
                                        toast.error('Something went wrong!');
                              }
                    },
                    [dispatch]
          );

          const handleTaskOpen = useCallback((taskId: string): void => {
                    setCurrentTaskId(taskId);
          }, []);

          const handleTaskClose = useCallback((): void => {
                    setCurrentTaskId(null);
          }, []);

          return (
                    <>
                              <Seo title="Dashboard: Board" />
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
                                        <Box sx={{ px: 3, display: 'flex', flexDirection: 'column' }}>

                                                  <Typography variant="h4"
                                                            color={'primary'}>
                                                            Board
                                                  </Typography>

                                                  <Autocomplete
                                                            id="country-select-demo"
                                                            sx={{ width: 300 }}
                                                            options={props.userBoards}
                                                            autoHighlight
                                                            getOptionLabel={(option: any) => option.boardLabel}
                                                            renderInput={(params: any) => (
                                                                      <TextField
                                                                                {...params}
                                                                                label="Choose a building"
                                                                                inputProps={{
                                                                                          ...params.inputProps,
                                                                                          autoComplete: 'building', // disable autocomplete and autofill
                                                                                }}
                                                                      />
                                                            )}
                                                            onSelect={(e: any) => console.log(e)}
                                                  />


                                        </Box>

                                        {/* <DragDropContext onDragEnd={handleDragEnd}>
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
                                                            <Stack
                                                                      alignItems="flex-start"
                                                                      direction="row"
                                                                      spacing={3}
                                                            >
                                                                      {columnsIds.map((columnId: string) => (
                                                                                <ColumnCard
                                                                                          key={columnId}
                                                                                          columnId={columnId}
                                                                                          onClear={() => handleColumnClear(columnId)}
                                                                                          onDelete={() => handleColumnDelete(columnId)}
                                                                                          onRename={(name) => handleColumnRename(columnId, name)}
                                                                                          onTaskAdd={(name) => handleTaskAdd(columnId, name)}
                                                                                          onTaskOpen={handleTaskOpen}
                                                                                />
                                                                      ))}
                                                                      <ColumnAdd onAdd={handleColumnAdd} />
                                                            </Stack>
                                                  </Box>
                                        </DragDropContext> */}
                                        {
                                                  selectedBuilding ?
                                                            <DragDropContext onDragEnd={handleDragEnd}>
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
                                                                                <Stack
                                                                                          alignItems="flex-start"
                                                                                          direction="row"
                                                                                          spacing={3}
                                                                                >
                                                                                          <Typography>Please select building</Typography>
                                                                                          {columnsIds.map((columnId: string) => (
                                                                                                    <ColumnCard
                                                                                                              key={columnId}
                                                                                                              columnId={columnId}
                                                                                                              onClear={() => handleColumnClear(columnId)}
                                                                                                              onDelete={() => handleColumnDelete(columnId)}
                                                                                                              onRename={(name) => handleColumnRename(columnId, name)}
                                                                                                              onTaskAdd={(name) => handleTaskAdd(columnId, name)}
                                                                                                              onTaskOpen={handleTaskOpen}
                                                                                                    />
                                                                                          ))}
                                                                                          <ColumnAdd onAdd={handleColumnAdd} />
                                                                                </Stack>
                                                                      </Box>
                                                            </DragDropContext>
                                                            :
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
                                                                      <Typography
                                                                                color='primary'
                                                                      >
                                                                                Please select building to display board!
                                                                      </Typography>
                                                            </Box>
                                        }
                              </Box>
                              <TaskModal
                                        onClose={handleTaskClose}
                                        open={!!currentTaskId}
                                        taskId={currentTaskId || undefined}
                              />
                    </>
          );
};

export const getServerSideProps = async (context: any) => {

          const allUserBoards = await boardServices().getAllBoards()

          redirect: {
                    destination: "/404"
          }

          return {
                    props: {
                              userBoards: JSON.parse(JSON.stringify(allUserBoards)),
                    },
          }

}


Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
