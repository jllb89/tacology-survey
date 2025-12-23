-- Backfill synthetic embeddings for responses missing an embedding
-- Uses a small random vector; replace with real model calls in production.

insert into public.response_embeddings (response_id, model, content, embedding)
select
  sr.id as response_id,
  'text-embedding-3-small-synthetic' as model,
  coalesce(sa.value_text, '') as content,
  (select array( select ((random() - 0.5) * 0.2)::float4 from generate_series(1,1536) ) )::vector(1536) as embedding
from public.survey_responses sr
left join public.response_embeddings re on re.response_id = sr.id
left join public.survey_answers sa
  on sa.response_id = sr.id
  and sa.question_id = (
    select q.id from public.questions q where q.code = 'improvement_text' limit 1
  )
where re.response_id is null;
