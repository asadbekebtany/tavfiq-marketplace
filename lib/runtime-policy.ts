import { z } from "zod";

export const appEnvSchema = z.enum(["development", "staging", "production"]);
export type AppEnv = z.infer<typeof appEnvSchema>;

export type RuntimePolicy = {
  appEnv: AppEnv;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
  /** JSON / orders-store fallback when PostgreSQL mavjud emas */
  allowJsonFallback: boolean;
  /** OTP_DEMO_CODES orqali SMSsiz kirish */
  allowOtpDemo: boolean;
  /** DATABASE_URL majburiy (runtime tekshiruv) */
  requireDatabase: boolean;
  /** UI da muhit banneri (staging) */
  showEnvBanner: boolean;
  /** LOCK_ADMIN_API=true ruxsat */
  allowAdminApiLock: boolean;
};

type BuildPolicyInput = {
  appEnv: AppEnv;
  allowStagingOtpDemo: boolean;
};

export function buildRuntimePolicy(input: BuildPolicyInput): RuntimePolicy {
  const { appEnv, allowStagingOtpDemo } = input;

  return {
    appEnv,
    isDevelopment: appEnv === "development",
    isStaging: appEnv === "staging",
    isProduction: appEnv === "production",
    allowJsonFallback: appEnv === "development",
    allowOtpDemo:
      appEnv === "development" || (appEnv === "staging" && allowStagingOtpDemo),
    requireDatabase: appEnv !== "development",
    showEnvBanner: appEnv === "staging",
    allowAdminApiLock: appEnv !== "production",
  };
}

const PLACEHOLDER_SECRET = /your-secret|change-me|minimum-32|example/i;

export type DeploymentValidationInput = {
  policy: RuntimePolicy;
  isBuildPhase: boolean;
  databaseUrl?: string;
  nextauthSecret: string;
  lockAdminApi: boolean;
  otpDemoCodes: string[];
  smsConfigured: boolean;
  allowStagingOtpDemo: boolean;
  publicAppEnv?: string;
};

export function validateDeploymentPolicy(input: DeploymentValidationInput): void {
  const errors: string[] = [];
  const {
    policy,
    isBuildPhase,
    databaseUrl,
    nextauthSecret,
    lockAdminApi,
    otpDemoCodes,
    smsConfigured,
    allowStagingOtpDemo,
    publicAppEnv,
  } = input;

  if (publicAppEnv && publicAppEnv !== policy.appEnv) {
    errors.push(
      `NEXT_PUBLIC_APP_ENV (${publicAppEnv}) APP_ENV (${policy.appEnv}) bilan mos kelmaydi`,
    );
  }

  if (policy.requireDatabase && !databaseUrl && !isBuildPhase) {
    errors.push("DATABASE_URL staging/production muhitida majburiy");
  }

  if (policy.isProduction) {
    if (lockAdminApi) {
      errors.push("LOCK_ADMIN_API productionda false bo'lishi kerak");
    }
    if (otpDemoCodes.length > 0 && !smsConfigured) {
      errors.push(
        "OTP_DEMO_CODES productionda ruxsat etilmaydi — SMS_* integratsiyasini sozlang",
      );
    }
    if (PLACEHOLDER_SECRET.test(nextauthSecret)) {
      errors.push(
        "NEXTAUTH_SECRET production uchun haqiqiy tasodifiy kalit bo'lishi kerak (openssl rand -base64 32)",
      );
    }
  }

  if (
    policy.isStaging &&
    otpDemoCodes.length > 0 &&
    !smsConfigured &&
    !allowStagingOtpDemo
  ) {
    errors.push(
      "Stagingda OTP demo uchun ALLOW_STAGING_OTP_DEMO=true qo'ying yoki SMS_* ni to'ldiring",
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `Deployment policy xatolari (${policy.appEnv}):\n` +
        errors.map((message) => `  - ${message}`).join("\n"),
    );
  }
}
