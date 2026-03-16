-- Summary stats per quiz
create or replace view quiz_stats as
select
  q.id as quiz_id,
  q.title,
  count(a.id) as total_attempts,
  count(a.submitted_at) as submitted_attempts,
  round(avg(a.score)::numeric, 2) as avg_score,
  max(a.score) as max_score,
  min(a.score) as min_score
from quizzes q
left join attempts a on a.quiz_id = q.id
group by q.id, q.title;

-- Score distribution (materialized for dashboard performance)
create materialized view if not exists quiz_score_distribution as
select
  q.id as quiz_id,
  count(*) filter (where a.score < 50) as low,
  count(*) filter (where a.score >= 50 and a.score < 75) as medium,
  count(*) filter (where a.score >= 75 and a.score < 90) as high,
  count(*) filter (where a.score >= 90) as excellent
from quizzes q
join attempts a on a.quiz_id = q.id
where a.submitted_at is not null
group by q.id;

create index if not exists quiz_score_distribution_quiz_idx
  on quiz_score_distribution (quiz_id);

-- Completion status summary
create or replace view quiz_completion_summary as
select
  q.id as quiz_id,
  count(a.id) filter (where a.status = 'submitted') as total_completed,
  count(a.id) filter (where a.status = 'in_progress') as total_in_progress,
  count(a.id) filter (where a.status = 'pending') as total_not_started
from quizzes q
left join attempts a on a.quiz_id = q.id
group by q.id;

-- Student results (mix of authenticated and visitor attempts)
create or replace view quiz_student_results as
select
  a.quiz_id,
  a.id as attempt_id,
  coalesce(u.id::text, a.quiz_link_token) as student_id,
  coalesce(u.name, a.visitor_name) as name,
  u.email as email,
  a.score,
  a.total_correct,
  a.time_taken,
  a.submitted_at,
  a.status
from attempts a
left join users u on u.id = a.student_id;

-- One-stop analytics view matching the frontend shape
create or replace view quiz_analytics as
select
  q.id as quiz_id,
  q.title,
  q.total_questions,
  cs.total_completed,
  cs.total_in_progress,
  cs.total_not_started,
  case
    when (cs.total_completed + cs.total_in_progress + cs.total_not_started) > 0
      then round((cs.total_completed::numeric / (cs.total_completed + cs.total_in_progress + cs.total_not_started)) * 100, 2)
    else 0
  end as completion_rate,
  qs.avg_score,
  qs.max_score as highest_score,
  qs.min_score as lowest_score,
  qsd.low,
  qsd.medium,
  qsd.high,
  qsd.excellent
from quizzes q
left join quiz_completion_summary cs on cs.quiz_id = q.id
left join quiz_stats qs on qs.quiz_id = q.id
left join quiz_score_distribution qsd on qsd.quiz_id = q.id;
