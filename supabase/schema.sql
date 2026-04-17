-- ScrambleScorer Database Schema
-- Run this in your Supabase SQL editor

create table scrambles (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  name text not null,
  num_holes integer not null,
  date date not null default current_date,
  created_at timestamp with time zone default now()
);

-- If you already ran the schema, add the column with:
-- alter table scrambles add column date date not null default current_date;

create table holes (
  id uuid default gen_random_uuid() primary key,
  scramble_id uuid references scrambles(id) on delete cascade not null,
  hole_number integer not null,
  par integer not null,
  unique(scramble_id, hole_number)
);

create table teams (
  id uuid default gen_random_uuid() primary key,
  scramble_id uuid references scrambles(id) on delete cascade not null,
  name text not null,
  pin text not null
);

create table scores (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  hole_number integer not null,
  strokes integer not null,
  unique(team_id, hole_number)
);

-- Enable Row Level Security
alter table scrambles enable row level security;
alter table holes enable row level security;
alter table teams enable row level security;
alter table scores enable row level security;

-- Allow anonymous access (no user accounts needed)
create policy "public read scrambles" on scrambles for select using (true);
create policy "public insert scrambles" on scrambles for insert with check (true);

create policy "public read holes" on holes for select using (true);
create policy "public insert holes" on holes for insert with check (true);

create policy "public read teams" on teams for select using (true);
create policy "public insert teams" on teams for insert with check (true);

create policy "public read scores" on scores for select using (true);
create policy "public insert scores" on scores for insert with check (true);
create policy "public update scores" on scores for update using (true);

-- Enable realtime for live leaderboard updates
alter publication supabase_realtime add table scores;

create table messages (
  id uuid default gen_random_uuid() primary key,
  scramble_id uuid references scrambles(id) on delete cascade not null,
  team_id uuid references teams(id) on delete cascade not null,
  team_name text not null,
  text text not null,
  created_at timestamp with time zone default now()
);

alter table messages enable row level security;
create policy "public read messages" on messages for select using (true);
create policy "public insert messages" on messages for insert with check (true);
alter publication supabase_realtime add table messages;
