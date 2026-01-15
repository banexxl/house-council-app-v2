// import type { FC } from 'react';
// import PropTypes from 'prop-types';
// import ArrowLeftIcon from '@untitled-ui/icons-react/build/esm/ArrowLeft';
// import Box from '@mui/material/Box';
// import Button from '@mui/material/Button';
// import Dialog from '@mui/material/Dialog';
// import SvgIcon from '@mui/material/SvgIcon';
// import Typography from '@mui/material/Typography';

// import type { PolarOrder } from 'src/types/polar-order-types';

// interface InvoicePdfDialogProps {
//   invoice?: PolarOrder;
//   onClose?: () => void;
//   open?: boolean;
// }

// export const InvoicePdfDialog: FC<InvoicePdfDialogProps> = (props) => {
//   const { invoice, onClose, open = false, ...other } = props;

//   if (!invoice) {
//     return null;
//   }

//   return (
//     <Dialog
//       fullScreen
//       open={open}
//       {...other}
//     >
//       <Box
//         sx={{
//           display: 'flex',
//           flexDirection: 'column',
//           height: '100%',
//         }}
//       >
//         <Box
//           sx={{
//             backgroundColor: 'background.paper',
//             p: 2,
//           }}
//         >
//           <Button
//             color="inherit"
//             startIcon={
//               <SvgIcon>
//                 <ArrowLeftIcon />
//               </SvgIcon>
//             }
//             onClick={onClose}
//           >
//             Close
//           </Button>
//         </Box>
//         <Box sx={{ flexGrow: 1 }}>
//           <Box
//             sx={{
//               height: '100%',
//             }}
//           >
//             <iframe
//               src={`/api/polar/invoices/${invoice.id}`}
//               style={{ border: 'none', width: '100%', height: '100%' }}
//             />
//           </Box>
//         </Box>
//       </Box>
//     </Dialog>
//   );
// };

// InvoicePdfDialog.propTypes = {
//   // @ts-ignore
//   invoice: PropTypes.object,
//   onClose: PropTypes.func,
//   open: PropTypes.bool,
// };
