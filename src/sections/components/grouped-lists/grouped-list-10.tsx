import type { FC } from 'react';
import { formatDistanceToNowStrict, subHours, subMinutes } from 'date-fns';
import Download01Icon from '@untitled-ui/icons-react/build/esm/Download01';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';

const now = new Date();

interface Activity {
          _id: string;
          createdDateTime: number;
          description: string;
          subject: string;
          type: string;
}

const activities: Activity[] = [
          {
                    _id: '5e8dd0828d628e6f40abdfe8',
                    createdDateTime: subMinutes(now, 23).getTime(),
                    description: 'has uploaded a new file',
                    subject: 'Project author',
                    type: 'upload_file',
          },
          {
                    _id: '5e8dd0893a6725f2bb603617',
                    createdDateTime: subHours(now, 2).getTime(),
                    description: 'joined team as a Front-End Developer',
                    subject: 'Adrian Stefan',
                    type: 'join_team',
          },
          {
                    _id: '5e8dd08f44603e3300b75cf1',
                    createdDateTime: subHours(now, 9).getTime(),
                    description: 'joined team as a Full Stack Developer',
                    subject: 'Alexandru Robert',
                    type: 'join_team',
          },
];

export const GroupedList10: FC = () => (
          <Box
                    sx={{
                              backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'neutral.800' : 'neutral.100'),
                              p: 3,
                    }}
          >
                    <Stack spacing={3}>
                              {activities.map((activity) => {
                                        const ago = formatDistanceToNowStrict(activity.createdDateTime);

                                        return (
                                                  <Card
                                                            key={activity._id}
                                                            sx={{
                                                                      alignItems: 'center',
                                                                      display: 'flex',
                                                                      p: 2,
                                                            }}
                                                  >
                                                            <Avatar
                                                                      sx={{
                                                                                backgroundColor: 'primary.main',
                                                                                color: 'common.white',
                                                                      }}
                                                            >
                                                                      <SvgIcon>
                                                                                <Download01Icon />
                                                                      </SvgIcon>
                                                            </Avatar>
                                                            <Typography
                                                                      sx={{ ml: 2 }}
                                                                      variant="body2"
                                                            >
                                                                      <Link
                                                                                color="text.primary"
                                                                                variant="subtitle2"
                                                                      >
                                                                                {activity.subject}
                                                                      </Link>{' '}
                                                                      {activity.description}
                                                            </Typography>
                                                            <Typography
                                                                      sx={{ ml: 'auto' }}
                                                                      variant="caption"
                                                            >
                                                                      {ago} ago
                                                            </Typography>
                                                  </Card>
                                        );
                              })}
                    </Stack>
          </Box>
);
