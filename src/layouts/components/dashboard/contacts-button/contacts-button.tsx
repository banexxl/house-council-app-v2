import type { FC } from 'react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Users03Icon from '@untitled-ui/icons-react/build/esm/Users03';
import IconButton from '@mui/material/IconButton';
import SvgIcon from '@mui/material/SvgIcon';
import Tooltip from '@mui/material/Tooltip';

import { usePopover } from 'src/hooks/use-popover';
import { useAuth } from 'src/contexts/auth/auth-provider';
import { getAllTenantsFromClientsBuildingsWithAuthData, getTenantsFromSameBuildingWithAuthData } from 'src/app/actions/tenant/tenant-actions';
import { Tenant } from 'src/types/tenant';
import { useTranslation } from 'react-i18next';
import { useBuildingPresence, PresenceUser } from 'src/realtime/user-presence';
import { ContactsPopover } from './contacts-popover';

// Helper function to calculate last activity from last_sign_in_at
const calculateLastActivity = (lastSignInAt: string | null | undefined): number | undefined => {
  if (!lastSignInAt) return undefined;
  return new Date(lastSignInAt).getTime();
};

interface Contact {
  id: string;
  avatar: string;
  isActive: boolean;
  lastActivity?: number;
  name: string;
  userId?: string; // Add user ID for presence tracking
}

const useContacts = () => {
  const [baseContacts, setBaseContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const auth = useAuth();

  // Extract building ID and user info for presence
  const currentUserId = auth.userData?.id || null;
  const currentUserInfo: Partial<PresenceUser> = {
    username: auth.tenant?.email || auth.client?.email,
    first_name: auth.tenant?.first_name || auth.client?.name?.split(' ')[0],
    last_name: auth.tenant?.last_name || '',
    apartment_number: auth.tenant?.apartment ? String((auth.tenant.apartment as any)?.apartment_number || '') : undefined,
  };

  // Use building presence hook
  const { presenceUsers, isConnected, onlineUserIds } = useBuildingPresence(
    buildingId,
    currentUserId,
    currentUserInfo
  );

  // Extract building ID from tenant/client data
  const extractBuildingId = useCallback((tenants: Tenant[]): string | null => {
    if (tenants.length === 0) return null;

    // Get building ID from first tenant's apartment
    const firstTenant = tenants[0];
    if (firstTenant.apartment && typeof firstTenant.apartment === 'object') {
      const apartment = firstTenant.apartment as any;
      if (apartment.building_id) {
        return apartment.building_id;
      }
      if (apartment.building?.id) {
        return apartment.building.id;
      }
    }

    return null;
  }, []);

  useEffect(() => {
    const fetchContacts = async () => {
      if (!auth.tenant && !auth.client) {
        setBaseContacts([]);
        setBuildingId(null);
        setLoading(false);
        return;
      }

      try {
        let tenantsResult;

        if (auth.tenant) {
          // If user is a tenant, get other tenants from the same building
          tenantsResult = await getTenantsFromSameBuildingWithAuthData(auth.tenant.id);
        } else if (auth.client) {
          // If user is a client, get all tenants from their buildings
          tenantsResult = await getAllTenantsFromClientsBuildingsWithAuthData(auth.client.id);
        }

        if (tenantsResult?.success && tenantsResult.data) {
          // Extract building ID for presence subscription
          const extractedBuildingId = extractBuildingId(tenantsResult.data);
          setBuildingId(extractedBuildingId);

          const transformedContacts: Contact[] = tenantsResult.data.map((tenant: Tenant & { last_sign_in_at?: string }) => ({
            id: tenant.id,
            userId: tenant.user_id, // Add user ID for presence tracking
            avatar: tenant.avatar_url!,
            isActive: false, // Will be updated by presence system
            lastActivity: calculateLastActivity(tenant.last_sign_in_at),
            name: `${tenant.first_name} ${tenant.last_name}`,
          }));
          setBaseContacts(transformedContacts);
        }
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
        setBaseContacts([]);
        setBuildingId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [auth.tenant, auth.client, extractBuildingId]);

  // Compute contacts with updated presence status using useMemo
  const contacts = useMemo(() => {
    return baseContacts.map(contact => ({
      ...contact,
      isActive: contact.userId ? onlineUserIds.includes(contact.userId) : false
    }));
  }, [baseContacts, onlineUserIds]);

  return { contacts, loading, buildingId, isConnected, onlineCount: onlineUserIds.length };
};

export const ContactsButton: FC = () => {
  const { t } = useTranslation();
  const popover = usePopover<HTMLButtonElement>();
  const { contacts, loading, buildingId, isConnected, onlineCount } = useContacts();

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
        buildingId={buildingId}
        isPresenceConnected={isConnected}
      />
    </>
  );
};
