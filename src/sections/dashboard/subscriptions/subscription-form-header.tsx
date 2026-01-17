// 'use client'

// import ArrowBackIcon from '@mui/icons-material/ArrowBack';
// import Link from '@mui/material/Link'
// import SvgIcon from '@mui/material/SvgIcon'
// import Typography from '@mui/material/Typography'
// import { RouterLink } from 'src/components/router-link'
// import { paths } from 'src/paths'
// import { useTranslation } from 'react-i18next'
// import { Box } from '@mui/system'
// import { SubscriptionPlan } from 'src/types/subscription-plan';

// type ClientFormHeaderProps = {
//      subscriptionPlan?: SubscriptionPlan
// }

// export const SubscriptionFormHeader = (props: ClientFormHeaderProps) => {

//      const { t } = useTranslation()

//      return (
//           <Box >
//                <Link
//                     color="text.primary"
//                     component={RouterLink}
//                     href={paths.dashboard.subscriptions.index}
//                     sx={{
//                          alignItems: 'center',
//                          display: 'inline-flex',
//                     }}
//                     underline="hover"
//                >
//                     <SvgIcon sx={{ mr: 1 }}>
//                          <ArrowBackIcon />
//                     </SvgIcon>
//                     <Typography variant="subtitle2">{t('subscriptionPlans.subscriptionPlanList')}</Typography>
//                </Link>
//                <Typography variant="h4" sx={{ mb: 2 }}>
//                     {
//                          props.subscriptionPlan
//                               ? t('subscriptionPlans.subscriptionPlanEdit') + ': ' + props.subscriptionPlan.name
//                               : t('subscriptionPlans.subscriptionPlanCreate')
//                     }
//                </Typography>
//           </Box>
//      )
// }

