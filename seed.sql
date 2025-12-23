-- Seed script for Tacology admin demo data
-- Generates questions (upsert), 5k customers, ~12k responses with answers, heuristic sentiment
-- Locations: brickell / wynwood; questions fixed per spec

begin;

-- Upsert questions
with upsert as (
  insert into public.questions (code, group_key, question_type, prompt, options, is_active, sort_order)
  values
    ('food_quality', 'core_v2', 'single_choice', 'How would you rate the quality of the food you ordered in terms of flavor, presentation, and portion size?', jsonb_build_object('scale', '1-5 Likert', 'labels', jsonb_build_array('Very Poor','Poor','Okay','Good','Excellent')), true, 1),
    ('service_quality', 'core_v2', 'single_choice', 'How would you rate our staff in terms of friendliness, attentiveness, and professionalism?', jsonb_build_object('scale', '1-5 Likert', 'labels', jsonb_build_array('Very Poor','Poor','Okay','Good','Excellent')), true, 2),
    ('vibe_quality', 'core_v2', 'single_choice', 'How would you rate the atmosphere at Tacology in terms of music, lighting, and overall vibe?', jsonb_build_object('scale', '1-5 Likert', 'labels', jsonb_build_array('Very Poor','Poor','Okay','Good','Excellent')), true, 3),
    ('overall_experience', 'core_v2', 'single_choice', 'Overall, how satisfied were you with your experience at Tacology?', jsonb_build_object('scale', '1-5 Likert', 'labels', jsonb_build_array('Very Dissatisfied','Dissatisfied','Neutral','Satisfied','Very Satisfied')), true, 4),
    ('nps_recommend', 'core_v2', 'scale_0_10', 'On a scale from 0 to 10, how likely are you to recommend Tacology to a friend or family member?', jsonb_build_object('scale', '0-10 integer'), true, 5),
    ('improvement_text', 'core_v2', 'free_text', 'What is one thing we could improve to make your next visit a 10/10?', jsonb_build_object('required', true, 'minLength', 10, 'maxLength', 500), true, 6)
  on conflict (code) do update
    set prompt = excluded.prompt,
        question_type = excluded.question_type,
        options = excluded.options,
        group_key = excluded.group_key,
        is_active = true,
        sort_order = excluded.sort_order
  returning code, id
)
select * from upsert;

-- Name pools and per-row random selection using array indexing (avoids repeated names)
with first_names as (
  select array[
    'Alex','Taylor','Jordan','Morgan','Riley','Casey','Jamie','Quinn','Dakota','Avery',
    'Sam','Cameron','Drew','Evan','Hayden','Kendall','Logan','Parker','Reese','Rowan',
    'Skyler','Sage','Sydney','Tristan','Bailey','Charlie','Devon','Elliot','Harper','Jules'
  ]::text[] as names
), last_names as (
  select array[
    'Lopez','Garcia','Smith','Johnson','Brown','Martinez','Davis','Miller','Wilson','Anderson',
    'Thomas','Harris','Clark','Lewis','Walker','Young','Hall','Allen','King','Wright',
    'Torres','Nguyen','Hill','Scott','Green','Adams','Baker','Gonzalez','Nelson','Carter'
  ]::text[] as names
), seeds as (
  select
    gs as n,
    fn.names[1 + floor(random() * array_length(fn.names, 1))::int] as first,
    ln.names[1 + floor(random() * array_length(ln.names, 1))::int] as last
  from generate_series(1, 5000) gs
  cross join first_names fn
  cross join last_names ln
)
insert into public.customers (id, name, email, phone)
select gen_random_uuid(), concat(first, ' ', last) as full_name,
       concat(lower(first), '.', lower(last), '.', lpad((n % 10000)::text, 4, '0'), '@example.com') as email,
       concat('+1-786-', lpad((1000 + n)::text, 4, '0')) as phone
from seeds
on conflict (email) do nothing;

-- Prepare question map
create temporary table if not exists tmp_question_map as
select code, id
from public.questions
where code in ('food_quality','service_quality','vibe_quality','overall_experience','nps_recommend','improvement_text');

-- Generate ~12k responses across last 90 days and materialize for reuse
create temporary table tmp_seed as
with cust_pool as (
  select id, coalesce(name, 'Guest ' || substr(email,1,6)) as name, email,
         row_number() over () as rn,
         count(*) over () as total
  from public.customers
),
seed as (
  select
    gen_random_uuid() as response_id,
    c.id as customer_id,
    c.name as customer_name,
    c.email as customer_email,
    (case when random() < 0.5 then 'brickell' else 'wynwood' end)::location_enum as location,
    now() - (random() * interval '90 days') as created_at,
    -- Scores 1-5 with mild skew high, some low
    (case when random() < 0.08 then 1 when random() < 0.16 then 2 when random() < 0.36 then 3 when random() < 0.66 then 4 else 5 end)::int as q1,
    (case when random() < 0.08 then 1 when random() < 0.16 then 2 when random() < 0.36 then 3 when random() < 0.66 then 4 else 5 end)::int as q2,
    (case when random() < 0.08 then 1 when random() < 0.16 then 2 when random() < 0.36 then 3 when random() < 0.66 then 4 else 5 end)::int as q3,
    (case when random() < 0.08 then 1 when random() < 0.16 then 2 when random() < 0.36 then 3 when random() < 0.66 then 4 else 5 end)::int as q4,
    (case when random() < 0.05 then floor(random()*5)::int -- 0-4 detractors
          when random() < 0.15 then 5 + floor(random()*2)::int -- 5-6 high-risk
          when random() < 0.35 then 7 + floor(random()*2)::int -- 7-8 monitor
          else 9 + floor(random()*2)::int end)::int as q5
  from generate_series(1, 12000) g
  join cust_pool c
    on c.rn = 1 + ((g - 1) % c.total)
),
seed_text as (
  select
    s.*,
    case
      when least(s.q1,s.q2,s.q3,s.q4) <= 2 or s.q5 <= 4 then (
        array[
          'Food was cold and service felt rushed.',
          'Staff seemed overwhelmed; order came out wrong.',
          'Music was too loud and seating cramped.',
          'Long wait, bland tacos, not coming back soon.',
          'Server was inattentive and food arrived cold.'
        ])[ceil(random()*5)]
      when least(s.q1,s.q2,s.q3,s.q4) = 3 or s.q5 between 5 and 7 then (
        array[
          'Good overall, but pacing could be faster.',
          'Tacos were fine; music a bit loud.',
          'Service was okay; drinks took a while.',
          'Portions could be slightly larger.',
          'Would like quicker checkout next time.'
        ])[ceil(random()*5)]
      else (
        array[
          'Great flavors and friendly staff!',
          'Loved the vibe and fast service.',
          'Everything was excellent, keep it up.',
          'Tasty food and smooth experience.',
          'Fantastic meal; will recommend friends.'
        ])[ceil(random()*5)]
    end as q6_text,
    -- heuristic sentiment: base on scores plus text keywords, clamped -1..1
    greatest(-1, least(1,
      ((s.q1 + s.q2 + s.q3 + s.q4)::numeric / 4 - 3) * 0.35 + (s.q5 - 7) * 0.08
      + case when (least(s.q1,s.q2,s.q3,s.q4) <= 2 or s.q5 <= 4) then -0.2 when (greatest(s.q1,s.q2,s.q3,s.q4) >= 4 and s.q5 >= 9) then 0.1 else 0 end
    )) as sentiment_score
  from seed s
)
select * from seed_text;

insert into public.survey_responses (id, customer_id, customer_email, customer_name, location, created_at, completed, nps_bucket, sentiment_score)
select
  response_id,
  customer_id,
  customer_email,
  customer_name,
  location,
  created_at,
  true,
  case
    when q5 between 0 and 6 then 'detractor'
    when q5 between 7 and 8 then 'passive'
    else 'promoter'
  end,
  sentiment_score
from tmp_seed;

-- Insert answers for each response
insert into public.survey_answers (response_id, question_id, value_text, value_number)
select
  s.response_id,
  q.id,
  case when q.code = 'improvement_text' then s.q6_text else null end as value_text,
  case q.code
    when 'food_quality' then s.q1
    when 'service_quality' then s.q2
    when 'vibe_quality' then s.q3
    when 'overall_experience' then s.q4
    when 'nps_recommend' then s.q5
    else null
  end as value_number
from tmp_seed s
cross join tmp_question_map q;

commit;
