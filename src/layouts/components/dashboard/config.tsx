import type { ReactNode } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SvgIcon } from "@mui/material";

// === ICONS ===
import HomeSmileIcon from "src/icons/untitled-ui/duocolor/home-smile";
import Users03Icon from "src/icons/untitled-ui/duocolor/users-03";
import ApartmentIcon from "@mui/icons-material/Apartment";
import AnnouncementIcon from "@mui/icons-material/Announcement";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import CalendarIcon from "src/icons/untitled-ui/duocolor/calendar";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import ReceiptCheckIcon from "src/icons/untitled-ui/duocolor/receipt-check";
import ChatIcon from "@mui/icons-material/Chat";

import { tokens } from "src/locales/tokens";
import { paths } from "src/paths";

export type Role = "admin" | "client" | "clientMember" | "tenant";

export const useSections = (role: Role | null) => {
  const { t } = useTranslation();

  return useMemo(() => {
    if (!role) return [];                   // loading → no sections yet
    return filterByRole(NAV_SECTIONS(t), role);
  }, [t, role]);
};


export interface NavItem {
  title: string;
  path?: string;           // clickable when present
  icon?: ReactNode;
  label?: ReactNode;
  items?: NavItem[];       // children -> shows expander when length > 0
  roles: Role[];           // who sees this node
}

export interface NavSection {
  subheader?: string;
  items: NavItem[];
  roles: Role[];
}

// === FULL CONFIG (with children to keep expanders) ===
const NAV_SECTIONS = (t: (key: string) => string): NavSection[] => [
  // ADMIN
  {
    subheader: t(tokens.nav.adminDashboard),
    roles: ["admin"],
    items: [
      {
        title: t(tokens.nav.clients),
        roles: ["admin"],
        icon: (
          <SvgIcon fontSize="small">
            <Users03Icon />
          </SvgIcon>
        ),
        items: [
          {
            title: t(tokens.nav.list),
            path: paths.dashboard.clients.index,
            roles: ["admin"],
            icon: (
              <SvgIcon fontSize="small">
                <Users03Icon />
              </SvgIcon>
            ),
          },
          {
            title: t(tokens.nav.create),
            path: paths.dashboard.clients.new,
            roles: ["admin"],
            icon: (
              <SvgIcon fontSize="small">
                <Users03Icon />
              </SvgIcon>
            ),
          },
          {
            title: t(tokens.nav.billingInformation),
            roles: ["admin"],
            icon: (
              <SvgIcon fontSize="small">
                <Users03Icon />
              </SvgIcon>
            ),
            items: [
              { title: t(tokens.nav.list), path: paths.dashboard.clients.billingInformation.index, roles: ["admin"] },
              { title: t(tokens.nav.create), path: paths.dashboard.clients.billingInformation.new, roles: ["admin"] },
            ],
          },
        ],
      },
      {
        title: t(tokens.nav.subscriptions),
        roles: ["admin"],
        icon: (
          <SvgIcon fontSize="small">
            <ReceiptCheckIcon />
          </SvgIcon>
        ),
        items: [
          { title: t(tokens.nav.list), path: paths.dashboard.subscriptions.index, roles: ["admin"] },
          { title: t(tokens.nav.create), path: paths.dashboard.subscriptions.new, roles: ["admin"] },
        ],
      },
    ],
  },

  // CLIENT / CLIENT MEMBER
  {
    subheader: t(tokens.nav.clientDashboard),
    roles: ["admin", "client", "clientMember"],
    items: [
      {
        title: t(tokens.nav.overview),
        path: paths.dashboard.index,
        roles: ["admin", "client", "clientMember"],
        icon: (
          <SvgIcon fontSize="small">
            <HomeSmileIcon />
          </SvgIcon>
        ),
      },
      {
        title: t(tokens.nav.account),
        path: paths.dashboard.account,
        roles: ["admin", "client"], // hidden for clientMember
        icon: (
          <SvgIcon fontSize="small">
            <ManageAccountsIcon />
          </SvgIcon>
        ),
      },
      {
        title: t(tokens.nav.locations),
        roles: ["admin", "client", "clientMember"],
        icon: (
          <SvgIcon fontSize="small">
            <LocationOnIcon />
          </SvgIcon>
        ),
        items: [
          { title: t(tokens.nav.list), path: paths.dashboard.locations.index, roles: ["admin", "client", "clientMember"] },
          { title: t(tokens.nav.locationAdd), path: paths.dashboard.locations.new, roles: ["admin", "client", "clientMember"] },
        ],
      },
      {
        title: t(tokens.nav.buildings),
        roles: ["admin", "client", "clientMember"],
        icon: (
          <SvgIcon fontSize="small">
            <ApartmentIcon />
          </SvgIcon>
        ),
        items: [
          { title: t(tokens.nav.list), path: paths.dashboard.buildings.index, roles: ["admin", "client", "clientMember"] },
          { title: t(tokens.nav.buildingAdd), path: paths.dashboard.buildings.new, roles: ["admin", "client", "clientMember"] },
        ],
      },
      {
        title: t(tokens.nav.apartments),
        roles: ["admin", "client", "clientMember"],
        icon: (
          <SvgIcon fontSize="small">
            <MeetingRoomIcon />
          </SvgIcon>
        ),
        items: [
          { title: t(tokens.nav.list), path: paths.dashboard.apartments.index, roles: ["admin", "client", "clientMember"] },
          { title: t(tokens.nav.apartmentAdd), path: paths.dashboard.apartments.new, roles: ["admin", "client", "clientMember"] },
        ],
      },
      {
        title: t(tokens.nav.tenants),
        roles: ["admin", "client", "clientMember"],
        icon: (
          <SvgIcon fontSize="small">
            <Users03Icon />
          </SvgIcon>
        ),
        items: [
          { title: t(tokens.nav.list), path: paths.dashboard.tenants.index, roles: ["admin", "client", "clientMember"] },
          { title: t(tokens.nav.tenantAdd), path: paths.dashboard.tenants.new, roles: ["admin", "client", "clientMember"] },
        ],
      },
      {
        title: t(tokens.nav.announcements),
        roles: ["admin", "client", "clientMember"],
        path: paths.dashboard.announcements.index,
        icon: (
          <SvgIcon fontSize="small">
            <AnnouncementIcon />
          </SvgIcon>
        ),
      },
      {
        title: t(tokens.nav.calendar),
        path: paths.dashboard.calendar,
        roles: ["admin", "client", "clientMember"],
        icon: (
          <SvgIcon fontSize="small">
            <CalendarIcon />
          </SvgIcon>
        ),
      },
      {
        title: t(tokens.nav.polls),
        roles: ["admin", "client", "clientMember"],
        icon: (
          <SvgIcon fontSize="small">
            <HowToVoteIcon />
          </SvgIcon>
        ),
        items: [
          {
            title: t(tokens.nav.list),
            path: paths.dashboard.polls.index,
            roles: ["admin", "client", "clientMember"],
          },
          {
            title: t(tokens.nav.create),
            path: paths.dashboard.polls.create,
            roles: ["admin", "client", "clientMember"],
          },
        ],
      },
      {
        title: t(tokens.nav.chat),
        path: paths.dashboard.chat,
        roles: ["client", "clientMember", "admin"],
        icon: (
          <SvgIcon fontSize="small">
            <ChatIcon />
          </SvgIcon>
        ),
      }
      // {
      //   title: t(tokens.nav.analytics),
      //   path: paths.dashboard.analytics,
      //   roles: ["admin", "client"],
      //   icon: (
      //     <SvgIcon fontSize="small">
      //       <BarChartSquare02Icon />
      //     </SvgIcon>
      //   ),
      // },
      // {
      //   title: t(tokens.nav.crypto),
      //   path: paths.dashboard.crypto,
      //   roles: ["admin", "client"],
      //   icon: (
      //     <SvgIcon fontSize="small">
      //       <CurrencyBitcoinCircleIcon />
      //     </SvgIcon>
      //   ),
      //   label: <Chip color="primary" label="New" size="small" />,
      // },
    ],
  },

  // TENANT
  {
    subheader: t(tokens.nav.tenants), // or a dedicated tenantDashboard token if you have it
    roles: ["tenant"],
    items: [
      {
        title: t(tokens.nav.socialMedia),
        // path: paths.dashboard.social.profile,
        roles: ["tenant", "client", "clientMember"],
        items: [
          { title: t(tokens.nav.profile), path: paths.dashboard.social.profile, roles: ["tenant"] },
          { title: t(tokens.nav.feed), path: paths.dashboard.social.feed, roles: ["tenant"] },
        ],
        icon: (
          <SvgIcon fontSize="small">
            <Users03Icon />
          </SvgIcon>
        ),
      },
      {
        title: t(tokens.announcements.managementTitle),
        path: paths.dashboard.announcements.tenant,
        roles: ["tenant"],
        icon: (
          <SvgIcon fontSize="small">
            <AnnouncementIcon />
          </SvgIcon>
        ),
      },
      {
        title: t(tokens.nav.calendar),
        path: paths.dashboard.calendar,
        roles: ["tenant"],
        icon: (
          <SvgIcon fontSize="small">
            <CalendarIcon />
          </SvgIcon>
        ),
      },
      {
        title: t(tokens.nav.polls),
        path: paths.dashboard.polls.voting,
        roles: ["tenant"],
        icon: (
          <SvgIcon fontSize="small">
            <HowToVoteIcon />
          </SvgIcon>
        ),
      },
      {
        title: t(tokens.nav.chat),
        path: paths.dashboard.chat,
        roles: ["tenant"],
        icon: (
          <SvgIcon fontSize="small">
            <ChatIcon />
          </SvgIcon>
        ),
      }
    ],
  },
];

// === RECURSIVE FILTER (keeps parent if it or any child is visible) ===
const filterItemsByRole = (items: NavItem[], role: Role): NavItem[] =>
  items
    .map((item) => {
      const children = item.items ? filterItemsByRole(item.items, role) : undefined;
      const selfVisible = item.roles.includes(role);
      const anyChild = !!(children && children.length);

      if (!selfVisible && !anyChild) return null;

      // If parent not visible but has visible children, keep it as a container (not clickable)
      if (!selfVisible && anyChild) {
        const { path, ...rest } = item;
        return { ...rest, items: children };
      }

      return { ...item, items: children };
    })
    .filter(Boolean) as NavItem[];

const filterByRole = (sections: NavSection[], role: Role): NavSection[] =>
  sections
    .map((section) => {
      if (!section.roles.includes(role)) return null;
      const items = filterItemsByRole(section.items, role);
      if (!items.length) return null;
      return { ...section, items };
    })
    .filter(Boolean) as NavSection[];