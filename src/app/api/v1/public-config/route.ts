import { apiHandler } from "@/lib/backend/api/api-handler";
import type { NexusPublicConfig } from "@/lib/public-config";

export const runtime = "nodejs";

export const GET = apiHandler<undefined, NexusPublicConfig>({
  handler: () => {
    const supabaseUrl = readPublicEnv("NEXT_PUBLIC_SUPABASE_URL");
    const supabaseAnonKey = readPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

    return {
      supabase: {
        anonKey: supabaseAnonKey,
        configured: Boolean(supabaseUrl && supabaseAnonKey),
        url: supabaseUrl,
      },
    };
  },
  methods: ["GET"],
  route: "/api/v1/public-config",
});

function readPublicEnv(name: string) {
  const value = process.env[name]?.trim();

  return value ? value : null;
}
