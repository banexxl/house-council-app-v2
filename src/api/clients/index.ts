import type { Client, ClientEmail, ClientInvoice, ClientLog } from 'src/types/client';
import { applyPagination } from 'src/utils/apply-pagination';
import { applySort } from 'src/utils/apply-sort';
import { deepCopy } from 'src/utils/deep-copy';

import { client, clients, emails, invoices, logs } from './data';

type GetClientsRequest = {
  filters?: {
    query?: string;
    has_accepted_marketing?: boolean;
    is_potential?: boolean;
    is_returning?: boolean;
  };
  page?: number;
  rowsPerPage?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
};

type GetClientsResponse = Promise<{
  data: Client[];
  count: number;
}>;

type GetClientRequest = object;

type GetClientResponse = Promise<Client>;

type GetClientEmailsRequest = object;

type GetClientEmailsResponse = Promise<ClientEmail[]>;

type GetClientInvoicesRequest = object;

type GetClientInvoicesResponse = Promise<ClientInvoice[]>;

type GetClientLogsRequest = object;

type GetClientLogsResponse = Promise<ClientLog[]>;

class ClientsApi {
  getClients(request: GetClientsRequest = {}): GetClientsResponse {
    const { filters, page, rowsPerPage, sortBy, sortDir } = request;

    let data = deepCopy(clients) as Client[];
    let count = data.length;

    if (typeof filters !== 'undefined') {
      data = data.filter((client) => {
        if (typeof filters.query !== 'undefined' && filters.query !== '') {
          let queryMatched = false;
          const properties: ('email' | 'name')[] = ['email', 'name'];

          properties.forEach((property) => {
            if (client[property]!.toLowerCase().includes(filters.query!.toLowerCase())) {
              queryMatched = true;
            }
          });

          if (!queryMatched) {
            return false;
          }
        }

        if (typeof filters.has_accepted_marketing !== 'undefined') {
          if (client.has_accepted_marketing !== filters.has_accepted_marketing) {
            return false;
          }
        }

        if (typeof filters.is_potential !== 'undefined') {
          if (client.is_potential !== filters.is_potential) {
            return false;
          }
        }

        if (typeof filters.is_returning !== 'undefined') {
          if (client.is_returning !== filters.is_returning) {
            return false;
          }
        }

        return true;
      });
      count = data.length;
    }

    if (typeof sortBy !== 'undefined' && typeof sortDir !== 'undefined') {
      data = applySort(data, sortBy, sortDir);
    }

    if (typeof page !== 'undefined' && typeof rowsPerPage !== 'undefined') {
      data = applyPagination(data, page, rowsPerPage);
    }

    return Promise.resolve({
      data,
      count,
    });
  }

  getClient(request?: GetClientRequest): GetClientResponse {
    return Promise.resolve(deepCopy(client));
  }

  getEmails(request?: GetClientEmailsRequest): GetClientEmailsResponse {
    return Promise.resolve(deepCopy(emails));
  }

  getInvoices(request?: GetClientInvoicesRequest): GetClientInvoicesResponse {
    return Promise.resolve(deepCopy(invoices));
  }

  getLogs(request?: GetClientLogsRequest): GetClientLogsResponse {
    return Promise.resolve(deepCopy(logs));
  }
}

export const clientsApi = new ClientsApi();
