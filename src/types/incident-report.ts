export type IncidentStatus =
     | 'open'
     | 'in_progress'
     | 'on_hold'
     | 'resolved'
     | 'closed'
     | 'cancelled';

export type IncidentPriority = 'low' | 'medium' | 'high' | 'urgent';

export type IncidentCategory =
     | 'plumbing'
     | 'electrical'
     | 'noise'
     | 'cleaning'
     | 'common_area'
     | 'heating'
     | 'cooling'
     | 'structural'
     | 'interior'
     | 'outdoorsafety'
     | 'security'
     | 'pests'
     | 'administrative'
     | 'parking'
     | 'it'
     | 'waste';

export interface IncidentReport {
     id: string;
     client_id: string;
     building_id: string;
     apartment_id?: string | null;

     created_by_profile_id: string;
     created_by_tenant_id?: string | null;
     assigned_to_profile_id?: string | null;

     title: string;
     description: string;
     category: IncidentCategory;
     priority: IncidentPriority;
     status: IncidentStatus;
     is_emergency: boolean;

     resolved_at?: string | null;
     closed_at?: string | null;

     created_at: string;
     updated_at: string;
}

export interface IncidentReportImage {
     id: string;
     created_at: string;
     updated_at: string;
     storage_bucket: string;
     apartment_id?: string | null;
     building_id: string;
     incident_id: string;
     storage_path: string;
     uploaded_by_profile_id: string;
}

export interface IncidentReportComment {
     id: string;
     incident_id: string;
     author_profile_id: string;
     message: string;
     created_at: string;
}

export const INCIDENT_STATUS_TOKENS: Record<IncidentStatus, string> = {
     open: 'incident.status.open',
     in_progress: 'incident.status.in_progress',
     on_hold: 'incident.status.on_hold',
     resolved: 'incident.status.resolved',
     closed: 'incident.status.closed',
     cancelled: 'incident.status.cancelled',
};

export const INCIDENT_PRIORITY_TOKENS: Record<IncidentPriority, string> = {
     low: 'incident.priority.low',
     medium: 'incident.priority.medium',
     high: 'incident.priority.high',
     urgent: 'incident.priority.urgent',
};

export const INCIDENT_CATEGORY_TOKENS: Record<IncidentCategory, string> = {
     plumbing: 'incident.category.plumbing',
     electrical: 'incident.category.electrical',
     noise: 'incident.category.noise',
     cleaning: 'incident.category.cleaning',
     common_area: 'incident.category.common_area',
     heating: 'incident.category.heating',
     cooling: 'incident.category.cooling',
     structural: 'incident.category.structural',
     interior: 'incident.category.interior',
     outdoorsafety: 'incident.category.outdoorsafety',
     security: 'incident.category.security',
     pests: 'incident.category.pests',
     administrative: 'incident.category.administrative',
     parking: 'incident.category.parking',
     it: 'incident.category.it',
     waste: 'incident.category.waste',
};

