// import type { FC } from 'react';
// import PropTypes from 'prop-types';
// import { useTheme } from '@mui/material/styles';

// type Name = 'startup' | 'standard' | 'business';

// interface PlanIconProps {
//   name: Name;
// }

// export const AccountPlanIcon: FC<PlanIconProps> = ({ name }) => {
//   const theme = useTheme();

//   // colors approximating your image
//   const houseStroke = theme.palette.primary.main || '#F39C12'; // orange
//   const nestStroke = '#8B3A24'; // brown
//   const windowFill = '#6B2D1A'; // darker brown
//   const leafFill = '#9CD36D'; // green
//   const badgeFill = theme.palette.success?.main || '#2ECC71';

//   // Base house (from your provided image style)
//   const BaseHouse = (
//     <>
//       {/* Nest (three branches) */}
//       <path d="M18 68 C36 76, 64 76, 82 68" fill="none" stroke={nestStroke} strokeWidth="4.5" strokeLinecap="round" />
//       <path d="M14 74 C36 84, 64 84, 86 74" fill="none" stroke={nestStroke} strokeWidth="4.5" strokeLinecap="round" />
//       <path d="M26 78 C44 82, 56 82, 74 78" fill="none" stroke={nestStroke} strokeWidth="4.5" strokeLinecap="round" />

//       {/* Roof/walls */}
//       <polyline points="24,44 50,28 76,44" fill="none" stroke={houseStroke} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
//       <polyline points="32,50 50,38 68,50" fill="none" stroke={houseStroke} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
//       <line x1="32" y1="50" x2="32" y2="64" stroke={houseStroke} strokeWidth="5" strokeLinecap="round" />
//       <line x1="68" y1="50" x2="68" y2="64" stroke={houseStroke} strokeWidth="5" strokeLinecap="round" />

//       {/* Window */}
//       <path d="M46 50 a4 4 0 0 1 8 0 v10 h-8 z" fill={windowFill} />
//       <line x1="50" y1="50" x2="50" y2="60" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
//       <line x1="46" y1="55" x2="54" y2="55" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />

//       {/* Leaf */}
//       <ellipse cx="34" cy="38" rx="3.8" ry="2.6" fill={leafFill} transform="rotate(-18 34 38)" />
//       <ellipse cx="30.7" cy="39.7" rx="3.1" ry="2.2" fill={leafFill} transform="rotate(12 30.7 39.7)" />
//     </>
//   );

//   // Badge generator
//   const Badge = (x: number, y: number) => (
//     <g transform={`translate(${x},${y})`}>
//       <circle cx="0" cy="0" r="5.8" fill={badgeFill} opacity="0.85" />
//       <polygon
//         points="0,-3.6 1.2,-1.2 3.8,-0.8 1.9,1 0,2.8 -1.9,1 -3.8,-0.8 -1.2,-1.2"
//         fill="#fff"
//       />
//     </g>
//   );

//   // Badge positions for each tier
//   const badges = {
//     startup: [Badge(72, 28)],
//     standard: [Badge(68, 26), Badge(76, 30)],
//     business: [Badge(64, 25), Badge(72, 28), Badge(80, 31)]
//   };

//   return (
//     <svg
//       width={40}
//       height={40}
//       viewBox="0 0 100 100"
//       xmlns="http://www.w3.org/2000/svg"
//       role="img"
//       aria-label={`${name} plan`}
//       key={name}
//     >
//       {BaseHouse}
//       {badges[name]}
//     </svg>
//   );
// };

// AccountPlanIcon.propTypes = {
//   name: PropTypes.oneOf<Name>(['startup', 'standard', 'business']).isRequired,
// };
