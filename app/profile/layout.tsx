import { ProfileSidebar } from "@/components/profile/profile-sidebar";
import { getUserBonusBalance } from "@/lib/bonus";
import { checkDatabaseConnection } from "@/lib/db";
import { getPageSessionUser } from "@/lib/page-auth";
import prisma from "@/lib/prisma";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const user = await getPageSessionUser();
  let name = user?.name ?? null;
  let phone = user?.phone ?? null;
  let bonusBalance = 0;

  if (user) {
    bonusBalance = await getUserBonusBalance(user.id);
    if (await checkDatabaseConnection()) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { name: true, phone: true, bonusBalance: true },
        });
        if (dbUser?.name) name = dbUser.name;
        if (dbUser?.phone) phone = dbUser.phone;
        if (typeof dbUser?.bonusBalance === "number") bonusBalance = dbUser.bonusBalance;
      } catch {
        // session qiymatlari
      }
    }
  }

  return (
    <div className="max-w-[1280px] mx-auto px-3 py-4 sm:px-4 sm:py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <aside className="w-full shrink-0 lg:w-64">
          <ProfileSidebar name={name} phone={phone} bonusBalance={bonusBalance} />
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
