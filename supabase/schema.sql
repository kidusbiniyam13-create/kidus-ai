-- Run this in Supabase Dashboard > SQL Editor.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Users can manage their own conversations"
on public.conversations for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their own messages"
on public.messages for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
