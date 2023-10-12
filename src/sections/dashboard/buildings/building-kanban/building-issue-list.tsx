import { Grid } from '@mui/material'
import React from 'react'
import { Board } from './building-kanban'

// const useStyles = makeStyles((theme) => ({
//           boardContent: {
//                     overflowY: 'auto',
//                     height: '100%'
//           }
// }))

export const BoardsList = ({ boards }: any) => {
          // const classes = useStyles();
          return (
                    <Grid
                    // className={classes.boardContent}
                    >
                              {boards.map((board: any) => (
                                        <Grid key={board.id}
                                                  item
                                                  xs={12}
                                        >
                                                  <Board board={board} />
                                        </Grid>
                              )
                              )}
                    </Grid>
          )
}