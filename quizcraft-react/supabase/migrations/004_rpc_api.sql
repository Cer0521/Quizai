-- RPC: teacher dashboard stats
create or replace function get_teacher_dashboard_stats(p_user_id uuid)
returns jsonb
language sql
security definer
as $$
  select jsonb_build_object(
    'total_quizzes', (select count(*) from quizzes where user_id = p_user_id),
    'total_students', (
      select count(distinct coalesce(a.student_id::text, a.quiz_link_token))
      from attempts a
      join quizzes q on q.id = a.quiz_id
      where q.user_id = p_user_id
    ),
    'total_assignments', (
      select count(*)
      from quiz_assignments qa
      join quizzes q on q.id = qa.quiz_id
      where q.user_id = p_user_id
    ),
    'average_score', coalesce((
      select round(avg(a.score)::numeric, 1)
      from attempts a
      join quizzes q on q.id = a.quiz_id
      where q.user_id = p_user_id and a.status = 'submitted'
    ), 0)
  );
$$;

-- RPC: teacher quiz list
create or replace function get_teacher_quizzes(p_user_id uuid)
returns table (
  id uuid,
  title text,
  description text,
  source_type text,
  total_questions integer,
  is_published boolean,
  time_limit integer,
  created_at timestamptz,
  assigned_count integer
)
language sql
security definer
as $$
  select
    q.id,
    q.title,
    q.description,
    q.source_type,
    q.total_questions,
    q.is_published,
    q.time_limit,
    q.created_at,
    (select count(*) from quiz_assignments qa where qa.quiz_id = q.id) as assigned_count
  from quizzes q
  where q.user_id = p_user_id
  order by q.created_at desc;
$$;

-- RPC: teacher quiz detail
create or replace function get_teacher_quiz_detail(p_quiz_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_quiz jsonb;
  v_questions jsonb;
begin
  select to_jsonb(q) into v_quiz
  from quizzes q
  where q.id = p_quiz_id and q.user_id = p_user_id;

  if v_quiz is null then
    raise exception 'quiz not found';
  end if;

  select jsonb_agg(qrow) into v_questions
  from (
    select
      qs.*,
      (select jsonb_agg(o order by o.order_index)
       from options o where o.question_id = qs.id) as options
    from questions qs
    where qs.quiz_id = p_quiz_id
    order by qs.order_index
  ) qrow;

  return jsonb_build_object(
    'id', (v_quiz->>'id')::uuid,
    'title', v_quiz->>'title',
    'description', v_quiz->>'description',
    'source_type', v_quiz->>'source_type',
    'file_path', v_quiz->>'file_path',
    'time_limit', (v_quiz->>'time_limit')::int,
    'total_questions', (v_quiz->>'total_questions')::int,
    'is_published', (v_quiz->>'is_published')::boolean,
    'sections_config', v_quiz->'sections_config',
    'ai_response', v_quiz->'ai_response',
    'allow_score', (v_quiz->>'allow_score')::boolean,
    'created_at', v_quiz->>'created_at',
    'updated_at', v_quiz->>'updated_at',
    'questions', coalesce(v_questions, '[]'::jsonb)
  );
end;
$$;

-- RPC: analytics payload matching frontend
create or replace function get_quiz_analytics(p_quiz_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_quiz record;
  v_stats record;
  v_dist record;
  v_students jsonb;
  v_assigned int;
begin
  select id, title, total_questions into v_quiz
  from quizzes
  where id = p_quiz_id and user_id = p_user_id;

  if v_quiz is null then
    raise exception 'quiz not found';
  end if;

  select * into v_stats from quiz_analytics where quiz_id = p_quiz_id;
  select * into v_dist from quiz_score_distribution where quiz_id = p_quiz_id;
  select count(*) into v_assigned from quiz_assignments where quiz_id = p_quiz_id;

  select jsonb_agg(row_to_json(s)) into v_students
  from (
    select
      student_id,
      name,
      email,
      score,
      total_correct,
      time_taken,
      submitted_at,
      status
    from quiz_student_results
    where quiz_id = p_quiz_id and status = 'submitted'
    order by submitted_at desc
  ) s;

  return jsonb_build_object(
    'quiz', jsonb_build_object(
      'id', v_quiz.id,
      'title', v_quiz.title,
      'total_questions', v_quiz.total_questions
    ),
    'summary', jsonb_build_object(
      'total_assigned', coalesce(v_assigned, 0),
      'total_completed', coalesce(v_stats.total_completed, 0),
      'total_in_progress', coalesce(v_stats.total_in_progress, 0),
      'total_not_started', coalesce(v_stats.total_not_started, 0),
      'completion_rate', coalesce(v_stats.completion_rate, 0),
      'average_score', coalesce(v_stats.avg_score, 0),
      'highest_score', coalesce(v_stats.highest_score, 0),
      'lowest_score', coalesce(v_stats.lowest_score, 0)
    ),
    'score_distribution', jsonb_build_object(
      'low', jsonb_build_object('count', coalesce(v_dist.low, 0)),
      'medium', jsonb_build_object('count', coalesce(v_dist.medium, 0)),
      'high', jsonb_build_object('count', coalesce(v_dist.high, 0)),
      'excellent', jsonb_build_object('count', coalesce(v_dist.excellent, 0))
    ),
    'students', coalesce(v_students, '[]'::jsonb)
  );
end;
$$;

-- RPC: quiz payload for visitor access by token
create or replace function get_quiz_by_token(p_token text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_quiz_id uuid;
  v_quiz jsonb;
  v_questions jsonb;
begin
  select ql.quiz_id into v_quiz_id
  from quiz_links ql
  join quizzes q on q.id = ql.quiz_id
  where ql.token = p_token
    and ql.is_active = true
    and q.is_published = true
    and (ql.expires_at is null or ql.expires_at > now());

  if v_quiz_id is null then
    raise exception 'invalid quiz link';
  end if;

  select to_jsonb(q) into v_quiz
  from quizzes q
  where q.id = v_quiz_id;

  select jsonb_agg(qrow) into v_questions
  from (
    select
      qs.*,
      (select jsonb_agg(o order by o.order_index)
       from options o where o.question_id = qs.id) as options
    from questions qs
    where qs.quiz_id = v_quiz_id
    order by qs.order_index
  ) qrow;

  return jsonb_build_object(
    'quiz', jsonb_build_object(
      'id', (v_quiz->>'id')::uuid,
      'title', v_quiz->>'title',
      'description', v_quiz->>'description',
      'time_limit', (v_quiz->>'time_limit')::int,
      'total_questions', (v_quiz->>'total_questions')::int,
      'allow_score', (v_quiz->>'allow_score')::boolean
    ),
    'questions', coalesce(v_questions, '[]'::jsonb)
  );
end;
$$;
