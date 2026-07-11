# HK Registry

Client tracker + attendance sheet for HK Business Consultancy. Installable as a home-screen app on phones (PWA).

## 1. Database setup (Supabase)

If you already ran the `registry` table SQL before, you only need to add the two new tables below.

Go to Supabase → SQL Editor → run:

```sql
-- Client data (only needed if you haven't already created this)
create table if not exists registry (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);
alter table registry enable row level security;
create policy "allow all" on registry for all using (true) with check (true);

-- Employee logins
create table employees (
  username text primary key,
  password text not null,
  full_name text not null,
  role text default 'staff'
);
alter table employees enable row level security;
create policy "allow all" on employees for all using (true) with check (true);

-- Attendance
create table attendance (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  employee_name text not null,
  date date not null,
  check_in timestamptz,
  check_out timestamptz
);
alter table attendance enable row level security;
create policy "allow all" on attendance for all using (true) with check (true);
```

Then add your team as rows in `employees` (Table Editor → employees → Insert row), e.g.:

| username | password | full_name | role |
|---|---|---|---|
| heena | choose-a-password | Heena Fathima | admin |
| staff1 | choose-a-password | Staff Name | staff |

> Note: passwords are stored as plain text in this simple setup — fine for a small internal team tool, but don't reuse a sensitive personal password here.

## 2. Local setup

```
npm install
cp .env.example .env
```

Fill `.env` with your Supabase Project URL and anon public key (Project Settings → API).

```
npm run dev
```

## 3. Deploy (Vercel)

1. Push this folder to GitHub.
2. On vercel.com → Add New → Project → import the repo.
3. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy.
5. Project → Settings → Domains → add your own domain, then add the DNS record Vercel shows you at your domain registrar.

## 4. Install on phones

Once live on your domain, open it in the phone's browser → menu → **Add to Home Screen**. It opens full-screen with its own icon, no browser bar.
