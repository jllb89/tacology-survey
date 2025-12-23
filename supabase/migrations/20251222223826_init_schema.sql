-- Enable extensions
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- Enumerations
do $$
begin
  if not exists (select 1 from pg_type where typname = 'location_enum') then
    create type location_enum as enum ('brickell', 'wynwood');
  end if;

  if not exists (select 1 from pg_type where typname = 'question_type_enum') then
    create type question_type_enum as enum ('single_choice', 'scale_0_10', 'free_text');
  end if;
end$$;

-- Admin users (Supabase Auth users will exist in auth.users; this is app-level)
create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz not null default now()
);

-- Customers (identified by email; you can later merge with auth if you want)
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_email_idx on public.customers(email);

-- Survey questions (keep history; use is_active instead of deleting)
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,              -- e.g. "food_quality", "overall_experience"
  group_key text not null,                -- e.g. "core_v2", "legacy_v1"
  question_type question_type_enum not null,
  prompt text not null,
  options jsonb,                          -- for single choice or scales
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists questions_active_idx on public.questions(is_active);
create index if not exists questions_group_idx on public.questions(group_key);

-- Survey responses (one submission = one row)
create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  customer_email text not null,           -- denormalize for fast lookup
  customer_name text,
  location location_enum not null,
  created_at timestamptz not null default now(),
  completed boolean not null default true,

  -- coupon logic
  coupon_sent_at timestamptz,
  coupon_expires_at timestamptz
);

create index if not exists survey_responses_created_at_idx on public.survey_responses(created_at desc);
create index if not exists survey_responses_location_idx on public.survey_responses(location);
create index if not exists survey_responses_email_idx on public.survey_responses(customer_email);

-- Answers (normalized per question)
create table if not exists public.survey_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.survey_responses(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  value_text text,                        -- free text or selected option label
  value_number numeric,                   -- e.g. 0-10 NPS
  created_at timestamptz not null default now()
);

create index if not exists survey_answers_response_idx on public.survey_answers(response_id);
create index if not exists survey_answers_question_idx on public.survey_answers(question_id);

-- Embeddings for AI / pattern analysis (store per-response or per-answer; here per-response summary)
create table if not exists public.response_embeddings (
  response_id uuid primary key references public.survey_responses(id) on delete cascade,
  model text not null,                    -- e.g. "text-embedding-3-small"
  content text not null,                  -- what was embedded (summary/comments)
  embedding vector(1536) not null,        -- adjust dimension to the model you choose
  created_at timestamptz not null default now()
);

-- Vector index (choose one; ivfflat requires analyze + good lists)
create index if not exists response_embeddings_ivfflat_idx
on public.response_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Basic updated_at trigger for customers
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();
