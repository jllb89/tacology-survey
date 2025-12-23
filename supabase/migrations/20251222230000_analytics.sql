-- Add sentiment and NPS bucket tracking
alter table public.survey_responses
  add column if not exists sentiment_score numeric,
  add column if not exists nps_bucket text check (nps_bucket in ('promoter','passive','detractor'));

-- Vector similarity helper for embeddings search
create or replace function public.match_response_embeddings(
  query_embedding vector,
  match_count int default 10,
  match_threshold double precision default 0.3
)
returns table (
  response_id uuid,
  content text,
  similarity double precision
) language sql stable as $$
  select
    re.response_id,
    re.content,
    1 - (re.embedding <#> query_embedding) as similarity
  from public.response_embeddings re
  where re.embedding <#> query_embedding < match_threshold
  order by re.embedding <#> query_embedding asc
  limit match_count;
$$;

-- Daily rollup for responses (counts + optional sentiment/NPS breakdown)
create or replace view public.survey_metrics_daily as
select
  date_trunc('day', sr.created_at) as day,
  sr.location,
  count(*) as responses,
  count(*) filter (where sr.completed) as completed_responses,
  count(*) filter (where sr.nps_bucket = 'promoter') as nps_promoters,
  count(*) filter (where sr.nps_bucket = 'passive') as nps_passives,
  count(*) filter (where sr.nps_bucket = 'detractor') as nps_detractors,
  avg(sr.sentiment_score) as avg_sentiment,
  count(*) filter (where sr.sentiment_score < -0.2) as negative_count,
  count(*) filter (where sr.sentiment_score between -0.2 and 0.2) as neutral_count,
  count(*) filter (where sr.sentiment_score > 0.2) as positive_count
from public.survey_responses sr
group by 1, 2
order by 1 desc, 2;
