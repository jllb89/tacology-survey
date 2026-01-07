-- Make customer and survey response email optional
alter table if exists public.customers
  alter column email drop not null;

alter table if exists public.survey_responses
  alter column customer_email drop not null;

-- Keep existing unique index on customers.email; Postgres allows multiple NULLs.
