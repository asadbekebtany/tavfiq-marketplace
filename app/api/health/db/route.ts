import { NextResponse } from "next/server";
import { getDatabaseConnectionInfo, getDatabaseStatus } from "@/lib/db";
import { serverEnv } from "@/lib/env.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getDatabaseStatus();
  const info = getDatabaseConnectionInfo();

  return NextResponse.json({
    ok: status.connected,
    configured: status.configured,
    message: status.message,
    appEnv: serverEnv.appEnv,
    ...(serverEnv.isDevelopment && info
      ? {
          database: {
            host: info.host,
            port: info.port,
            name: info.database,
            schema: info.schema,
          },
        }
      : {}),
  });
}
