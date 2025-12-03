# Supabase Database Setup

To make this application work, you need to set up your Supabase project. 
Go to the SQL Editor in your Supabase dashboard and run the following script:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Orders Table
create table orders (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  rank text not null, -- 'SS', 'S', 'A', 'B', 'C'
  max_slots int default 1,
  taken_slots int default 0,
  reward_points int default 0,
  status text default 'open', -- 'open', 'completed'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Create Order Takers Table (Students who claimed a task)
create table order_takers (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references orders(id) on delete cascade,
  student_name text not null,
  student_group text not null,
  comment text,
  status text default 'pending', -- 'pending', 'approved', 'rejected'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Create Rewards Shop Table
create table rewards (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  price int not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Create Students Ledger (To track points)
create table students (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  student_group text not null,
  total_points int default 0,
  unique(name, student_group)
);

-- 5. Row Level Security (RLS) Policies
-- For simplicity in this demo, we will enable public read/write for students on specific tables, 
-- but in a real app, you should lock this down further.

alter table orders enable row level security;
alter table order_takers enable row level security;
alter table rewards enable row level security;
alter table students enable row level security;

-- Policies for 'orders'
create policy "Public read orders" on orders for select using (true);
create policy "Admin insert orders" on orders for insert with check (auth.role() = 'authenticated');
create policy "Admin update orders" on orders for update using (auth.role() = 'authenticated');
create policy "Admin delete orders" on orders for delete using (auth.role() = 'authenticated');

-- Policies for 'order_takers'
create policy "Public insert takers" on order_takers for insert with check (true);
create policy "Public read takers" on order_takers for select using (true);
create policy "Admin update takers" on order_takers for update using (auth.role() = 'authenticated');

-- Policies for 'rewards'
create policy "Public read rewards" on rewards for select using (true);
create policy "Admin manage rewards" on rewards for all using (auth.role() = 'authenticated');

-- Policies for 'students'
create policy "Public read students" on students for select using (true);
create policy "Admin manage students" on students for all using (auth.role() = 'authenticated');
-- Allow system to update student points via logic (or admin)
```

## Environment Variables
Create a `.env` file in the root with:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```
