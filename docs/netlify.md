# Netlify App ga joylash

Bu loyiha **Next.js + Prisma + PostgreSQL**. Netlify **Drop/ZIP** (fayl tashlash) ishlamaydi — faqat **Git import**.

## 1. GitHub ga yuklash

```bash
git add .
git commit -m "Netlify va mobil UI"
git push -u origin main
```

`.env` ni **commit qilmang**.

## 2. Netlify App

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. GitHub/GitLab reponi tanlang
3. Build sozlamalari `netlify.toml` dan olinadi:
   - Build command: `npx prisma generate && npm run build`
   - Publish: `.next`
   - Plugin: `@netlify/plugin-nextjs`
4. Node: **20**

## 3. Environment variables

Site → **Environment variables** → Production:

| Kalit | Qiymat |
|---|---|
| `APP_ENV` | `production` |
| `NEXT_PUBLIC_APP_ENV` | `production` |
| `DATABASE_URL` | PostgreSQL (Neon/Supabase), `sslmode=require` |
| `NEXTAUTH_SECRET` | kamida 32 belgi |
| `NEXTAUTH_URL` | `https://SITENAME.netlify.app` (yoki custom domain) |
| `NEXT_PUBLIC_APP_URL` | `NEXTAUTH_URL` bilan bir xil |
| `LOCK_ADMIN_API` | `false` |

Keyin **Deploy** qayta ishga tushiring.

PostgreSQL: Neon yoki Supabase yarating, keyin:

```bash
npx prisma migrate deploy
npm run db:seed:prod
```

(`DATABASE_URL` ni local `.env` da vaqtinchalik qo‘yib ishlatish mumkin.)

## 4. Linkni yuborish

Deploy tugagach URL: `https://<site-name>.netlify.app`

`NEXTAUTH_URL` ni shu URL ga teng qiling, aks holda login ishlamasligi mumkin.
