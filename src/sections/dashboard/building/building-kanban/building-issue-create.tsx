import { IconButton, InputAdornment, TextField } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close';
import React from 'react'

// const useStyles = makeStyles((theme) => ({
//           inputAddCard: {
//                     marginBottom: theme.spacing(1)
//           }
// }))

export const InputAdd = ({ handleClose }: any) => {
          // const classes = useStyles()

          return (
                    <TextField
                              label='Card title'
                              variant='outlined'
                              fullWidth
                              // className={classes.inputAddCard}
                              InputProps={{
                                        endAdornment: (
                                                  <InputAdornment position="end">
                                                            <IconButton onClick={() => handleClose(false)}>
                                                                      <CloseIcon />
                                                            </IconButton>
                                                  </InputAdornment>
                                        ),
                              }}
                    />
          )
}