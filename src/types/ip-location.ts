// Type definitions for the IP geolocation API response
// Generated based on sample payload provided by user.

export interface IpLocationCurrency {
     code: string;
     name: string;
     symbol: string;
}

export interface IpLocationConnection {
     asn: number;
     isp: string;
}

export interface IpLocationLocationMeta {
     calling_codes?: string[];
     capital?: string;
     flag?: string; // URL
     native_name?: string;
     top_level_domains?: string[];
}

export interface IpLocationResponse {
     city?: string;
     connection?: IpLocationConnection;
     continent_code?: string;
     continent_name?: string;
     country_code?: string;
     country_name?: string;
     currencies?: IpLocationCurrency[];
     ip?: string;
     is_eu?: boolean;
     latitude?: number;
     location?: IpLocationLocationMeta;
     longitude?: number;
     region_name?: string;
     timezones?: string[];
     type?: string; // ipv4 | ipv6
     // Allow additional unknown properties
     [key: string]: any;
}

export function formatIpLocation(data: IpLocationResponse | null | undefined): string {
     if (!data) return 'Unknown';
     const city = data.city?.trim();
     const country = data.country_name?.trim();
     if (city && country) return `${city}, ${country}`;
     if (country) return country;
     return 'Unknown';
}
