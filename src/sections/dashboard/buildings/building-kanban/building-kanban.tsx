import React from 'react'
import clsx from 'clsx'
import { Avatar, AvatarGroup, Box, Card, CardContent, Chip, Grid, Typography, makeStyles } from '@mui/material';

// const useStyles = makeStyles((theme: any) => ({
//           boardCard: {
//                     width: '380px',
//                     display: 'flex',
//                     maxHeight: '100%',
//                     overflowX: 'hidden',
//                     overflowY: 'hidden',
//                     marginLeft: '8px',
//                     marginRight: '8px',
//                     flexDirection: 'column',
//                     [theme.breakpoints.down('sm')]: {
//                               width: '300px',
//                     }
//           },
//           boardHeader: {
//                     padding: theme.spacing(2),
//                     alignItems: 'center',
//                     justifyContent: 'space-between'
//           },
//           boardHeaderButton: {
//                     marginRight: '-12px'
//           },
//           boardButton: {
//                     padding: theme.spacing(2),
//                     justifyContent: 'center'
//           },
//           divider: {
//                     marginTop: theme.spacing(2)
//           },

//           cardRoot: {
//                     margin: theme.spacing(2),
//                     marginBottom: 20,
//                     borderLeft: '5px solid red',
//           },
//           details: {
//                     width: '100%',
//                     display: 'flex',
//                     flexDirection: 'column',
//           },
//           content: {
//                     flex: '1 0 auto',
//                     paddingBottom: theme.spacing(2)
//           },
//           // cover: {
//           //   width: 151,
//           // },
//           bottomBox: {
//                     display: 'flex',
//                     justifyContent: 'space-between',
//                     alignItems: 'center',
//                     marginTop: theme.spacing(1)
//           }
// }));

export const Board = ({ board }: any) => {
          //const classes = useStyles()
          return (
                    <Card
                              // className={clsx(classes.cardRoot, {
                              //           waitingBoard: board.status === "Waiting",
                              //           successBoard: board.status === "Approved"
                              // })}
                              variant="outlined"
                              style={{ borderLeft: `5px solid primary.main` }}
                    >
                              <div
                              // className={classes.details}
                              >
                                        <CardContent
                                        // className={classes.content}
                                        >
                                                  <Typography component="h5"
                                                            variant="h6">
                                                            {/* {board.title} */}
                                                  </Typography>
                                                  <Grid item
                                                            xs={12}>
                                                            <Box component="small"
                                                                      m={1}>
                                                                      <Typography variant='body2'>
                                                                                {/* {board.start} */}
                                                                      </Typography>
                                                            </Box>
                                                            {/* <Box component="small" m={1}>
              <Typography variant='body2'>{board.status}</Typography>
            </Box> */}
                                                  </Grid>
                                                  <Grid item
                                                            xs={12}
                                                  // className={classes.bottomBox}
                                                  >
                                                            {/* {
                                                                      board.category.title && <Chip
                                                                                size="small"
                                                                                label={board.category.title}
                                                                                style={{ backgroundColor: board.category.color, color: '#fff' }}
                                                                      />
                                                            } */}
                                                            <AvatarGroup max={4}
                                                            // className={classes.members}
                                                            >
                                                                      {/* {board.members.map((item: any) => {
                                                                                return (
                                                                                          <Avatar key={item.id}
                                                                                                    alt={item.name}
                                                                                                    src={`/${item.avatar}.jpg`} />
                                                                                )
                                                                      })} */}
                                                            </AvatarGroup>
                                                  </Grid>
                                        </CardContent>
                              </div>
                    </Card>
          )
}