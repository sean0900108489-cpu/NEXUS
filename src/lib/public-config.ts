export const PUBLIC_CONFIG_ROUTE = "/api/v1/public-config";

export type NexusPublicConfig = {
  supabase: {
    anonKey: string | null;
    configured: boolean;
    url: string | null;
  };
};
