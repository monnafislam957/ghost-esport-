# GHOST ESPORT — Android ফোন থেকে অনলাইনে প্রকাশ

এই প্যাকেজটি React + Vite ওয়েব অ্যাপের সোর্স কোড। এটি নিজে থেকে লাইভ ওয়েবসাইট বা Android APK নয়। লাইভ লিংক তৈরি করতে মালিকের GitHub ও Vercel অ্যাকাউন্টে প্রকাশ করতে হবে। বাস্তব লগইন/ডেটাবেস চালাতে Supabase প্রজেক্টও প্রয়োজন।

## প্রকাশ করার আগে

1. GitHub-এ সাইন ইন করে `ghost-esport` নামে একটি **Private** repository তৈরি করুন।
2. এই ZIP extract করে `ghost-esport-full` ফোল্ডারের ভেতরের সব ফাইল repository-তে upload করুন। `package.json` repository-এর root-এ থাকতে হবে। `.env.example` থাকবে, কিন্তু `.env.local` বা secret key আপলোড করবেন না।
3. Vercel-এ সাইন ইন করে Add New → Project → GitHub repository Import করুন। Framework `Vite`, Build Command `npm run build`, Output Directory `dist` রাখুন। `vercel.json` এগুলো আগেই সেট করে দিয়েছে।
4. বাস্তব অ্যাকাউন্ট/ডেটাবেসের জন্য Supabase-এ একটি project তৈরি করুন। SQL Editor-এ `supabase/schema.sql` চালান। Authentication-এর Email provider ও redirect URL কনফিগার করুন।
5. Vercel Project → Settings → Environment Variables-এ যোগ করুন:
   - `VITE_SUPABASE_URL` = Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = Supabase publishable/anon key
6. Vercel-এ Redeploy করুন। সফল হলে Vercel একটি `https://...vercel.app` লিংক দেখাবে।

## গুরুত্বপূর্ণ নিরাপত্তা

- `service_role` key, database password, bKash/Nagad secret কখনো browser code বা GitHub-এ দেবেন না।
- এই প্যাকেজে bKash/Nagad real payment integration সক্রিয় নয়; payment functions ইচ্ছাকৃতভাবে 501 ফেরত দেয়।
- Supabase সেটআপ না থাকলে UI setup/demo mode-এ খুলতে পারে; এটি live backend চালু হয়েছে এমন নয়।
- Admin account-এর role শুধুমাত্র trusted owner-এর মাধ্যমে database-এ দিতে হবে।

## Build

Node.js 20+ এবং npm প্রয়োজন:

```bash
npm install
npm run build
```
