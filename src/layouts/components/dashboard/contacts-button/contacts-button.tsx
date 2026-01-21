import type { FC } from 'react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Users03Icon from '@untitled-ui/icons-react/build/esm/Users03';
import IconButton from '@mui/material/IconButton';
import SvgIcon from '@mui/material/SvgIcon';
import Tooltip from '@mui/material/Tooltip';

import { usePopover } from 'src/hooks/use-popover';
import { Tenant } from 'src/types/tenant';
import { useTranslation } from 'react-i18next';
import { useBuildingPresence, PresenceUser } from 'src/realtime/user-presence';
import { getCustomerBuildingsForSocialProfile } from 'src/app/actions/customer/customer-actions';
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';
import { TABLES } from 'src/libs/supabase/tables';
import { ContactsPopover } from './contacts-popover';

// Helper function to calculate last activity from last_sign_in_at
const calculateLastActivity = (timestamp: string | null | undefined): number | undefined => {
  if (!timestamp) return undefined;
  return new Date(timestamp).getTime();
};

interface Contact {
  id: string;
  avatar: string;
  isActive: boolean;
  lastActivity?: number;
  name: string;
  userId?: string; // Add user ID for presence tracking
}

type ViewerData = {
  customer: { id: string; email?: string | null; name?: string | null } | null;
  tenant: (Tenant & { apartment?: any }) | null;
  admin: { id: string; email?: string | null; first_name?: string | null; last_name?: string | null } | null;
  userData: { id: string; email?: string | null } | null;
  error?: string;
};

const useContacts = () => {
  const [baseContacts, setBaseContacts] = useState<Contact[]>([]);
  const [buildingIds, setBuildingIds] = useState<string[]>([]);
  const [viewer, setViewer] = useState<ViewerData | null>(null);

  // Extract building ID and user info for presence
  const currentUserId = viewer?.userData?.id || null;
  const currentUserInfo: Partial<PresenceUser> = {
    username: viewer?.tenant?.email || viewer?.customer?.email!,
    first_name: viewer?.tenant?.first_name || viewer?.customer?.name?.split(' ')[0],
    last_name: viewer?.tenant?.last_name || '',
    apartment_number: viewer?.tenant?.apartment ? String((viewer.tenant.apartment as any)?.apartment_number || '') : undefined,
  };

  // Use building presence hook
  const { isConnected, onlineUserIds } = useBuildingPresence(
    buildingIds,
    currentUserId,
    currentUserInfo
  );

  // Extract building ID from tenant/customer data
  const extractBuildingIds = useCallback((tenants: Tenant[]): string[] => {
    const ids = new Set<string>();

    tenants.forEach((tenant) => {
      const apartment = tenant.apartment as any;
      if (apartment?.building_id) {
        ids.add(apartment.building_id);
      }
      if (apartment?.building?.id) {
        ids.add(apartment.building.id);
      }
    });

    return Array.from(ids);
  }, []);

  const fetchTenantsForClient = useCallback(async (clientId: string): Promise<Tenant[]> => {
    if (!clientId) return [];

    const { data: buildings, error: buildingsError } = await supabaseBrowserClient
      .from(TABLES.BUILDINGS)
      .select('id')
      .eq('customerId', clientId);

    if (buildingsError) {
      console.error('Failed to fetch buildings for client', buildingsError);
      return [];
    }

    const buildingIds = (buildings ?? []).map((b: any) => b.id).filter(Boolean);
    if (buildingIds.length === 0) return [];

    const { data: apartments, error: apartmentsError } = await supabaseBrowserClient
      .from(TABLES.APARTMENTS)
      .select('id')
      .in('building_id', buildingIds);

    if (apartmentsError) {
      console.error('Failed to fetch apartments for client buildings', apartmentsError);
      return [];
    }

    const apartmentIds = (apartments ?? []).map((a: any) => a.id).filter(Boolean);
    if (apartmentIds.length === 0) return [];

    const { data: tenants, error: tenantsError } = await supabaseBrowserClient
      .from(TABLES.TENANTS)
      .select(`
        *,
        apartment:tblApartments (
          id,
          apartment_number,
          building_id,
          building:tblBuildings (
            id,
            building_location:tblBuildingLocations!tblBuildings_building_location_fkey (
              street_address,
              city
            )
          )
        )
      `)
      .in('apartment_id', apartmentIds);

    if (tenantsError) {
      console.error('Failed to fetch tenants for client', tenantsError);
      return [];
    }

    return (tenants ?? []) as Tenant[];
  }, []);

  const fetchTenantsFromSameBuilding = useCallback(async (buildingIdForTenant: string, excludeTenantId?: string): Promise<Tenant[]> => {
    if (!buildingIdForTenant) return [];

    const { data: apartments, error: apartmentsError } = await supabaseBrowserClient
      .from(TABLES.APARTMENTS)
      .select('id')
      .eq('building_id', buildingIdForTenant);

    if (apartmentsError) {
      console.error('Failed to fetch apartments in building', apartmentsError);
      return [];
    }

    const apartmentIds = (apartments ?? []).map((a: any) => a.id).filter(Boolean);
    if (apartmentIds.length === 0) return [];

    const { data: tenants, error: tenantsError } = await supabaseBrowserClient
      .from(TABLES.TENANTS)
      .select(`
        *,
        apartment:tblApartments (
          id,
          apartment_number,
          building_id,
          building:tblBuildings (
            id,
            building_location:tblBuildingLocations!tblBuildings_building_location_fkey (
              street_address,
              city
            )
          )
        )
      `)
      .in('apartment_id', apartmentIds)
      .neq('id', excludeTenantId || '');

    if (tenantsError) {
      console.error('Failed to fetch tenants from same building', tenantsError);
      return [];
    }

    return (tenants ?? []) as Tenant[];
  }, []);

  useEffect(() => {
    let active = true;
    let authSub: ReturnType<typeof supabaseBrowserClient.auth.onAuthStateChange>['data']['subscription'] | null = null;

    const loadViewer = async () => {
      try {
        const res = await fetch('/api/viewer', { cache: 'no-store' });
        const data: ViewerData = await res.json();
        if (active) {
          setViewer(data);
        }
      } catch (error) {
        if (active) setViewer(null);
        console.error('[Contacts] Failed to load viewer', error);
      }
    };

    loadViewer();

    const authChange = supabaseBrowserClient.auth.onAuthStateChange(() => {
      loadViewer();
    });
    authSub = authChange?.data?.subscription ?? null;

    return () => {
      active = false;
      authSub?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchContacts = async () => {
      if (!viewer) {
        if (!isMounted) return;
        setBaseContacts([]);
        setBuildingIds([]);
        return;
      }

      try {
        let tenantList: Tenant[] = [];
        let resolvedBuildingIds: string[] = [];

        const tenantBuildingId =
          (viewer.tenant?.apartment as any)?.building_id ||
          (viewer.tenant?.apartment as any)?.building?.id ||
          null;

        if (viewer.tenant?.id && tenantBuildingId) {
          tenantList = await fetchTenantsFromSameBuilding(tenantBuildingId, viewer.tenant.id);
          resolvedBuildingIds = tenantBuildingId ? [tenantBuildingId] : [];
        } else if (viewer.customer?.id) {
          const { success, data, error } = await getCustomerBuildingsForSocialProfile(viewer.customer.id);
          if (!success) {
            console.error('Failed to fetch customer buildings', error);
          }

          const customerBuildingIds = (data ?? [])
            .map((building) => building.id)
            .filter((id): id is string => Boolean(id));
          resolvedBuildingIds = customerBuildingIds;
          tenantList = await fetchTenantsForClient(viewer.customer.id);
        }

        if (!isMounted) return;

        if (tenantList.length > 0) {
          const extractedBuildingIds = resolvedBuildingIds.length
            ? resolvedBuildingIds
            : extractBuildingIds(tenantList);
          setBuildingIds(extractedBuildingIds);

          const transformedContacts: Contact[] = tenantList.map((tenant: Tenant & { last_sign_in_at?: string }) => ({
            id: tenant.id,
            userId: tenant.user_id,
            avatar: tenant.avatar_url || '',
            isActive: false,
            lastActivity: tenant.last_activity
              ? calculateLastActivity(tenant.last_activity as any)
              : calculateLastActivity((tenant as any).last_sign_in_at),
            name: `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim(),
          }));
          setBaseContacts(transformedContacts);
        } else {
          setBaseContacts([]);
          setBuildingIds([]);
        }
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
        if (!isMounted) return;
        setBaseContacts([]);
        setBuildingIds([]);
      }
    };

    fetchContacts();

    return () => {
      isMounted = false;
    };
  }, [
    viewer?.tenant?.id,
    viewer?.tenant?.apartment,
    viewer?.customer?.id,
    extractBuildingIds,
    fetchTenantsForClient,
    fetchTenantsFromSameBuilding,
  ]);

  // Compute contacts with updated presence status using useMemo
  const contacts = useMemo(() => {
    return baseContacts.map(contact => ({
      ...contact,
      isActive: contact.userId ? onlineUserIds.includes(contact.userId) : false
    }));
  }, [baseContacts, onlineUserIds]);

  return { contacts, buildingIds, isConnected, onlineCount: onlineUserIds.length };
};

export const ContactsButton: FC = () => {
  const { t } = useTranslation();
  const popover = usePopover<HTMLButtonElement>();
  const { contacts, buildingIds, isConnected, onlineCount } = useContacts();

  return (
    <>
      <Tooltip title={`${t('contacts.tooltip')} (${onlineCount} online)`}>
        <IconButton
          onClick={popover.handleOpen}
          ref={popover.anchorRef}
        >
          <SvgIcon>
            <Users03Icon />
          </SvgIcon>
        </IconButton>
      </Tooltip>
      <ContactsPopover
        anchorEl={popover.anchorRef.current}
        contacts={contacts}
        onClose={popover.handleClose}
        open={popover.open}
        buildingIds={buildingIds}
        isPresenceConnected={isConnected}
      />
    </>
  );
};
