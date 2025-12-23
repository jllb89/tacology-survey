-- Enable RLS for sensitive tables and add restrictive policies

-- Customers
alter table if exists public.customers enable row level security;
alter table if exists public.customers force row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'customers' and policyname = 'Allow service role full access'
  ) then
    create policy "Allow service role full access"
      on public.customers
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'customers' and policyname = 'Allow admins read customers'
  ) then
    create policy "Allow admins read customers"
      on public.customers
      for select
      using (
        auth.role() = 'authenticated'
        and exists (
          select 1 from public.admin_profiles ap
          where ap.id = auth.uid()
        )
      );
  end if;
end$$;

-- Survey responses
alter table if exists public.survey_responses enable row level security;
alter table if exists public.survey_responses force row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'survey_responses' and policyname = 'Allow service role full access'
  ) then
    create policy "Allow service role full access"
      on public.survey_responses
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'survey_responses' and policyname = 'Allow admins read responses'
  ) then
    create policy "Allow admins read responses"
      on public.survey_responses
      for select
      using (
        auth.role() = 'authenticated'
        and exists (
          select 1 from public.admin_profiles ap
          where ap.id = auth.uid()
        )
      );
  end if;
end$$;

-- Response embeddings
alter table if exists public.response_embeddings enable row level security;
alter table if exists public.response_embeddings force row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'response_embeddings' and policyname = 'Allow service role full access'
  ) then
    create policy "Allow service role full access"
      on public.response_embeddings
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'response_embeddings' and policyname = 'Allow admins read embeddings'
  ) then
    create policy "Allow admins read embeddings"
      on public.response_embeddings
      for select
      using (
        auth.role() = 'authenticated'
        and exists (
          select 1 from public.admin_profiles ap
          where ap.id = auth.uid()
        )
      );
  end if;
end$$;
