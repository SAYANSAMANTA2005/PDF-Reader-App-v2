# Supabase Backend Setup Guide

To enable the backend features in your PDF Reader App, follow these steps:

## 1. Create a Supabase Project
1. Go to [database.new](https://database.new) and create a free project.
2. Once created, go to **Project Settings > API** to get your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

## 2. Setup Environment Variables
Add these to your `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 3. Run Database Schema
Go to the **SQL Editor** in Supabase and run this script:

```sql
-- 1. Create Users Table
create table public.users (
  id uuid references auth.users not null primary key,
  email text,
  plan text default 'free' check (plan in ('free', 'pro', 'elite')),
  last_login timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- 2. Create PDFs Table
create table public.pdfs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  file_name text not null,
  storage_path text not null,
  public_url text,
  size bigint,
  created_at timestamp with time zone default now()
);

-- 3. Enable RLS (Row Level Security)
alter table public.users enable row level security;
alter table public.pdfs enable row level security;

-- 4. Create RLS Policies
-- Users can only see/edit their own profile
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.users
  for insert with check (auth.uid() = id);

-- Users can only see/edit their own PDFs
create policy "Users can view own pdfs" on public.pdfs
  for select using (auth.uid() = user_id);

create policy "Users can insert own pdfs" on public.pdfs
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own pdfs" on public.pdfs
  for delete using (auth.uid() = user_id);
```

## 4. Setup Storage
1. Go to **Storage** in Supabase.
2. Create a new bucket named **"pdfs"**.
3. Set it to **Public** (or private if you want to handle signed URLs).
4. Go to **Policies** for the "pdfs" bucket and add:
   - **SELECT**: Allow for authenticated users if `(role() = 'authenticated'::text)`.
   - **INSERT**: Allow for authenticated users if `(role() = 'authenticated'::text)`.
   - **DELETE**: Allow for authenticated users if `(role() = 'authenticated'::text)`.

## 5. Enable Anonymous Auth
1. Go to **Authentication > Providers**.
2. Enable **Anonymous Sign-ins**.

---
Your backend is now ready! Your app will automatically sign users in anonymously and sync their PDFs to the cloud.
