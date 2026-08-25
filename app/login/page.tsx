import { LoginClient } from "@/components/auth/login-client";

export const metadata = { title: "Kirish" };

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <LoginClient />
    </div>
  );
}
