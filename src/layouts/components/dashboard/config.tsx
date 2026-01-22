import type { ReactNode } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SvgIcon } from "@mui/material";
import { isFeatureAllowed } from "src/config/feature-access";
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
import StorageIcon from '@mui/icons-material/Storage';
import ConstructionIcon from '@mui/icons-material/Construction';
import SettingsIcon from '@mui/icons-material/Settings';
import ConnectWithoutContactIcon from '@mui/icons-material/ConnectWithoutContact';
import { tokens } from "src/locales/tokens";
import { paths } from "src/paths";

export type Role = "admin" | "client" | "tenant";

export const useSections = (role: Role | null, featureSlugs?: string[] | null) => {
  const { t } = useTranslation();
  const featuresSet = featureSlugs ? new Set(featureSlugs.map((s) => s.toLowerCase())) : null;

  return useMemo(() => {
    if (!role) return [];                   // loading → no sections yet
    return filterByRole(NAV_SECTIONS(t), role, featuresSet);
  }, [t, role, featuresSet]);
};

export interface NavItem {
  title: string;
  path?: string;           // clickable when present
  icon?: ReactNode;
  label?: ReactNode;
  items?: NavItem[];       // children -> shows expander when length > 0
  roles: Role[];           // who sees this node
  featureKey?: string;     // optional subscription feature slug required to see this item
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
      {
        title: t(tokens.nav.features),
        path: paths.dashboard.features.index,
        roles: ["admin"],
        icon: (
          <SvgIcon fontSize="small">
            <SettingsIcon />
          </SvgIcon>
        ),
      },
      {
        title: t(tokens.nav.invoiceList),
        roles: ["admin"],
        icon: (
          <SvgIcon fontSize="small">
            <ReceiptCheckIcon />
          </SvgIcon>
        ),
        items: [
          { title: t(tokens.nav.list), path: paths.dashboard.invoices.index, roles: ["admin"] },
          { title: t(tokens.nav.create), path: paths.dashboard.invoices.details, roles: ["admin"] },
        ],
      }
    ],
  },

  // CLIENT / CLIENT MEMBER / TENANT
  {
    subheader: t(tokens.nav.clientDashboard),
    roles: ["admin", "client", "tenant"],
    items: [
      {
        title: t(tokens.nav.overview),
        path: paths.dashboard.index,
        roles: ["admin", "client", "tenant"],
        icon: (
          <SvgIcon fontSize="small">
            <HomeSmileIcon />
          </SvgIcon>
        ),
      },
      // {
      //   title: t(tokens.nav.account),
      //   path: paths.dashboard.account,
      //   roles: ["admin", "client"], // hidden for clientMember
      //   icon: (
      //     <SvgIcon fontSize="small">
      //       <ManageAccountsIcon />
      //     </SvgIcon>
      //   ),
      // },
      {
        title: t(tokens.nav.locations),
        featureKey: 'locations',
        roles: ["admin", "client"],
        icon: (
          <SvgIcon fontSize="small">
            <LocationOnIcon />
          </SvgIcon>
        ),
        items: [
          { title: t(tokens.nav.list), path: paths.dashboard.locations.index, roles: ["admin", "client"], featureKey: 'geo-location-management' },
          { title: t(tokens.nav.locationAdd), path: paths.dashboard.locations.new, roles: ["admin", "client"], featureKey: 'geo-location-management' },
        ],
      },
      {
        title: t(tokens.nav.buildings),
        featureKey: 'buildings',
        roles: ["admin", "client"],
        icon: (
          <SvgIcon fontSize="small">
            <ApartmentIcon />
          </SvgIcon>
        ),
        items: [
          { title: t(tokens.nav.list), path: paths.dashboard.buildings.index, roles: ["admin", "client"], featureKey: 'geo-location-management' },
          { title: t(tokens.nav.buildingAdd), path: paths.dashboard.buildings.new, roles: ["admin", "client"], featureKey: 'geo-location-management' },
        ],
      },
      {
        title: t(tokens.nav.apartments),
        featureKey: 'apartments',
        roles: ["admin", "client"],
        icon: (
          <SvgIcon fontSize="small">
            <MeetingRoomIcon />
          </SvgIcon>
        ),
        items: [
          { title: t(tokens.nav.list), path: paths.dashboard.apartments.index, roles: ["admin", "client"], featureKey: 'geo-location-management' },
          { title: t(tokens.nav.apartmentAdd), path: paths.dashboard.apartments.new, roles: ["admin", "client"], featureKey: 'geo-location-management' },
        ],
      },
      {
        title: t(tokens.nav.tenants),
        featureKey: 'tenants',
        roles: ["admin", "client"],
        icon: (
          <SvgIcon fontSize="small">
            <Users03Icon />
          </SvgIcon>
        ),
        items: [
          { title: t(tokens.nav.list), path: paths.dashboard.tenants.index, roles: ["admin", "client"], featureKey: 'geo-location-management' },
          { title: t(tokens.nav.tenantAdd), path: paths.dashboard.tenants.new, roles: ["admin", "client"], featureKey: 'geo-location-management' },
        ],
      },
      {
        title: t(tokens.nav.socialMedia),
        featureKey: 'social',
        roles: ["client", "admin", "tenant"],
        icon: (
          <SvgIcon fontSize="small">
            <ConnectWithoutContactIcon />
          </SvgIcon>
        ),
        items: [
          { title: t(tokens.nav.feed), path: paths.dashboard.social.feed, roles: ["client", "admin", "tenant"], featureKey: 'social' },
          { title: t(tokens.nav.profile), path: paths.dashboard.social.profile, roles: ["admin", "tenant"], featureKey: 'social' },
        ]
      },
      {
        title: t(tokens.nav.announcements),
        featureKey: 'announcements',
        roles: ["admin", "client"],
        path: paths.dashboard.announcements.index,
        icon: (
          <SvgIcon fontSize="small">
            <AnnouncementIcon />
          </SvgIcon>
        ),
      },
      {
        title: t(tokens.nav.announcements),
        featureKey: 'announcements',
        roles: ["tenant"],
        path: paths.dashboard.announcements.tenant,
        icon: (
          <SvgIcon fontSize="small">
            <AnnouncementIcon />
          </SvgIcon>
        ),
      },
      {
        title: t(tokens.nav.calendar),
        featureKey: 'calendar',
        path: paths.dashboard.calendar,
        roles: ["admin", "client", "tenant"],
        icon: (
          <SvgIcon fontSize="small">
            <CalendarIcon />
          </SvgIcon>
        ),
      },
      {
        title: t(tokens.nav.polls),
        featureKey: 'polls',
        roles: ["admin", "client"],
        icon: (
          <SvgIcon fontSize="small">
            <HowToVoteIcon />
          </SvgIcon>
        ),
        items: [
          {
            title: t(tokens.nav.list),
            path: paths.dashboard.polls.index,
            roles: ["admin", "client"],
            featureKey: 'polls',
          },
          {
            title: t(tokens.nav.create),
            path: paths.dashboard.polls.create,
            roles: ["admin", "client"],
            featureKey: 'polls',
          },
        ],
      },
      {
        title: t(tokens.nav.polls),
        featureKey: 'polls',
        path: paths.dashboard.polls.voting,
        roles: ["tenant"],
        icon: (
          <SvgIcon fontSize="small">
            <HowToVoteIcon />
          </SvgIcon>
        ),
      },
      {
        title: t(tokens.nav.fileManager),
        featureKey: 'file-manager',
        path: paths.dashboard.fileManager,
        roles: ["client", "admin"],
        icon: (
          <SvgIcon fontSize="small">
            <StorageIcon />
          </SvgIcon>
        )
      },
      {
        title: t(tokens.nav.serviceRequests),
        featureKey: 'service-requests',
        roles: ["client", "admin", "tenant"],
        icon: (
          <SvgIcon fontSize="small">
            <ConstructionIcon />
          </SvgIcon>
        ),
        items: [
          { title: t(tokens.nav.list), path: paths.dashboard.serviceRequests.index, roles: ["client", "admin", "tenant"], featureKey: 'service-requests' },
          { title: t(tokens.nav.create), path: paths.dashboard.serviceRequests.create, roles: ["client", "admin", "tenant"], featureKey: 'service-requests' },
        ]
      },
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

const filterItemsByFeature = (items: NavItem[], role: Role, features?: Set<string> | null): NavItem[] =>
  items
    .map((item) => {
      const children = item.items ? filterItemsByFeature(item.items, role, features) : undefined;
      const featureAllowed = role === 'admin' || !features || !item.featureKey || isFeatureAllowed(item.featureKey, features);
      const anyChild = !!(children && children.length);
      if (!featureAllowed && !anyChild) return null;

      if (!featureAllowed && anyChild) {
        const { path, ...rest } = item;
        return { ...rest, items: children };
      }

      return { ...item, items: children };
    })
    .filter(Boolean) as NavItem[];

const filterByRole = (sections: NavSection[], role: Role, features?: Set<string> | null): NavSection[] =>
  sections
    .map((section) => {
      if (!section.roles.includes(role)) return null;
      const itemsByRole = filterItemsByRole(section.items, role);
      const items = filterItemsByFeature(itemsByRole, role, features);
      if (!items.length) return null;
      return { ...section, items };
    })
    .filter(Boolean) as NavSection[];
