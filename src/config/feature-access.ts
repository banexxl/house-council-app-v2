export const FEATURE_ACCESS_MAP: Record<string, string[]> = {
     // canonical -> accepted subscription slugs
     locations: ['locations', 'geo-location-management'],
     buildings: ['buildings', 'geo-location-management'],
     apartments: ['apartments', 'geo-location-management'],
     tenants: ['tenants', 'resident-directory'],
     announcements: ['announcements', 'announcements-notifications'],
     calendar: ['calendar', 'event-calendar'],
     polls: ['polls', 'voting-polls'],
     'file-manager': ['file-manager', 'document-storage'],
     'service-requests': ['service-requests', 'issue-reporting', 'emergency-contacts-safety-alerts'],
     social: ['social', 'discussion-forums'],
};

export const isFeatureAllowed = (featureKey: string, allowedSlugs: Set<string>): boolean => {
     const aliases = FEATURE_ACCESS_MAP[featureKey] || [featureKey];
     return aliases.some((slug) => allowedSlugs.has(slug.toLowerCase()));
};
