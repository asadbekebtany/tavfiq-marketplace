import { serverEnv } from "@/lib/env.server";
import { toSmsPhone } from "@/lib/phone";

type SendSmsResult = { ok: true } | { ok: false; error: string };

type EskizLoginResponse = {
  data?: { token?: string };
  message?: string;
};

export async function sendSmsOtp(
  phone: string,
  code: string,
): Promise<SendSmsResult> {
  if (!serverEnv.sms.isConfigured) {
    return { ok: false, error: "SMS integratsiyasi sozlanmagan" };
  }

  const apiUrl = serverEnv.sms.apiUrl;
  const email = serverEnv.sms.email;
  const password = serverEnv.sms.password;
  const senderName = serverEnv.sms.senderName;

  if (!apiUrl || !email || !password) {
    return { ok: false, error: "SMS sozlamalari to'liq emas" };
  }

  const mobilePhone = toSmsPhone(phone);
  const ttlMinutes = serverEnv.auth.otpTtlMinutes;
  const message = `${senderName} tasdiqlash kodi: ${code}. Kod ${ttlMinutes} daqiqa amal qiladi.`;

  try {
    const loginResponse = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!loginResponse.ok) {
      return { ok: false, error: "SMS provayderiga ulanib bo'lmadi" };
    }

    const loginData = (await loginResponse.json()) as EskizLoginResponse;
    const token = loginData.data?.token;

    if (!token) {
      return { ok: false, error: "SMS provayder tokeni olinmadi" };
    }

    const sendResponse = await fetch(`${apiUrl}/message/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mobile_phone: mobilePhone,
        message,
        from: senderName,
      }),
    });

    if (!sendResponse.ok) {
      return { ok: false, error: "SMS yuborishda xatolik yuz berdi" };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "SMS yuborish vaqtida tarmoq xatosi" };
  }
}
