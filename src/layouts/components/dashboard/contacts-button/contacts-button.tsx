import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { subHours, subMinutes } from 'date-fns';
import Users03Icon from '@untitled-ui/icons-react/build/esm/Users03';
import IconButton from '@mui/material/IconButton';
import SvgIcon from '@mui/material/SvgIcon';
import Tooltip from '@mui/material/Tooltip';

import { usePopover } from 'src/hooks/use-popover';
import { useAuth } from 'src/contexts/auth/auth-provider';
import { getAllTenantsFromClientsBuildings, getTenantsFromSameBuilding } from 'src/app/actions/tenant/tenant-actions';
import { Tenant } from 'src/types/tenant';

import { ContactsPopover } from './contacts-popover';

const now = new Date();

interface Contact {
  id: string;
  avatar: string;
  isActive: boolean;
  lastActivity?: number;
  name: string;
}

const useContacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = useAuth();

  useEffect(() => {
    const fetchContacts = async () => {
      if (!auth.tenant && !auth.client) {
        setContacts([]);
        setLoading(false);
        return;
      }

      try {
        let tenantsResult;

        if (auth.tenant) {
          // If user is a tenant, get other tenants from the same building
          tenantsResult = await getTenantsFromSameBuilding(auth.tenant.id);
        } else if (auth.client) {
          // If user is a client, get all tenants from their buildings
          tenantsResult = await getAllTenantsFromClientsBuildings(auth.client.id);
        }

        if (tenantsResult?.success && tenantsResult.data) {
          const transformedContacts: Contact[] = tenantsResult.data.map((tenant: Tenant) => ({
            id: tenant.id,
            avatar: `/assets/avatars/avatar-${tenant.first_name.toLowerCase()}-${tenant.last_name.toLowerCase()}.png`,
            isActive: Math.random() > 0.5, // Random for now - could be based on last activity
            lastActivity: Math.random() > 0.3 ? now.getTime() : subHours(now, Math.floor(Math.random() * 24)).getTime(),
            name: `${tenant.first_name} ${tenant.last_name}`,
          }));
          setContacts(transformedContacts);
        }
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
        setContacts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [auth.tenant, auth.client]);

  return { contacts, loading };
};

export const ContactsButton: FC = () => {

  const popover = usePopover<HTMLButtonElement>();
  const { contacts, loading } = useContacts();

  return (
    <>
      <Tooltip title="Contacts">
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
      />
    </>
  );
};
