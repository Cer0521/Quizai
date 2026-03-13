const { supabaseAdmin } = require('../supabase');
const { gradeEssay } = require('../services/grading');

// ── Guest: start quiz attempt by share code ────────────
async function startGuestAttempt(req, res) {
  try {
    const { share_code, student_name, student_email, student_photo_url } = req.body;

    if (!share_code || !student_name) {
      return res.status(422).json({ errors: { general: ['Share code and name are required.'] } });
    }

    // Find the quiz by share code
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('share_code', share_code)
      .eq('is_published', true)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({ message: 'Quiz not found or not published.' });
    }

    // Check if retakes are allowed
    if (!quiz.allow_retakes) {
      const { data: existingAttempt } = await supabaseAdmin
        .from('quiz_attempts')
        .select('id')
        .eq('quiz_id', quiz.id)
        .eq('student_email', student_email)
        .eq('is_submitted', true)
        .single();

      if (existingAttempt) {
        return res.status(403).json({ 
          message: 'You have already completed this quiz and retakes are not allowed.',
          code: 'NO_RETAKES'
        });
      }
    }

    // Create new attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('quiz_attempts')
      .insert({
        quiz_id: quiz.id,
        student_name,
        student_email: student_email || null,
        student_photo_url: student_photo_url || null,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    // Get questions with options (hide correct answers)
    const { data: questions } = await supabaseAdmin
      .from('questions')
      .select(`
        id, question_text, type, points, order_index,
        options (id, option_text, order_index)
      `)
      .eq('quiz_id', quiz.id)
      .order('order_index');

    // Shuffle questions if enabled
    let orderedQuestions = questions || [];
    if (quiz.shuffle_questions) {
      orderedQuestions = [...orderedQuestions].sort(() => Math.random() - 0.5);
    }

    return res.status(201).json({
      attempt: {
        id: attempt.id,
        started_at: attempt.started_at
      },
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        time_limit: quiz.time_limit,
        total_questions: orderedQuestions.length,
        passing_score: quiz.passing_score
      },
      questions: orderedQuestions
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Guest: save answers (auto-save) ────────────────────
async function saveGuestAnswers(req, res) {
  try {
    const attemptId = req.params.id;

    const { data: attempt } = await supabaseAdmin
      .from('quiz_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('is_submitted', false)
      .single();

    if (!attempt) {
      return res.status(404).json({ message: 'Active attempt not found.' });
    }

    const { answers } = req.body; // [{ question_id, answer_text, selected_option_id }]
    if (!Array.isArray(answers)) {
      return res.status(422).json({ message: 'answers must be an array.' });
    }

    for (const ans of answers) {
      // Check if answer exists
      const { data: existing } = await supabaseAdmin
        .from('answers')
        .select('id')
        .eq('attempt_id', attempt.id)
        .eq('question_id', ans.question_id)
        .single();

      if (existing) {
        await supabaseAdmin
          .from('answers')
          .update({
            answer_text: ans.answer_text || null,
            selected_option_id: ans.selected_option_id || null
          })
          .eq('id', existing.id);
      } else {
        await supabaseAdmin
          .from('answers')
          .insert({
            attempt_id: attempt.id,
            question_id: ans.question_id,
            answer_text: ans.answer_text || null,
            selected_option_id: ans.selected_option_id || null
          });
      }
    }

    return res.json({ message: 'Answers saved.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Guest: submit attempt + score ──────────────────────
async function submitGuestAttempt(req, res) {
  try {
    const attemptId = req.params.id;

    const { data: attempt } = await supabaseAdmin
      .from('quiz_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('is_submitted', false)
      .single();

    if (!attempt) {
      return res.status(404).json({ message: 'Active attempt not found.' });
    }

    // Get quiz info
    const { data: quiz } = await supabaseAdmin
      .from('quizzes')
      .select('*, user:profiles!quizzes_user_id_fkey(id)')
      .eq('id', attempt.quiz_id)
      .single();

    // Get subscription to check for AI grading
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('tier')
      .eq('user_id', quiz.user.id)
      .single();

    const hasAIGrading = subscription?.tier === 'premium' || subscription?.tier === 'enterprise';

    // Get questions
    const { data: questions } = await supabaseAdmin
      .from('questions')
      .select(`*, options (*)`)
      .eq('quiz_id', attempt.quiz_id);

    // Get answers
    const { data: answers } = await supabaseAdmin
      .from('answers')
      .select('*')
      .eq('attempt_id', attempt.id);

    let totalPoints = 0;
    let earnedPoints = 0;

    // Grade each question
    for (const q of questions) {
      totalPoints += q.points || 1;
      const ans = answers.find(a => a.question_id === q.id);
      
      if (!ans) continue;

      let isCorrect = false;
      let pointsEarned = 0;
      let aiFeedback = null;
      let aiScore = null;

      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        if (ans.selected_option_id) {
          const selectedOption = q.options.find(o => o.id === ans.selected_option_id);
          isCorrect = selectedOption?.is_correct || false;
        } else if (ans.answer_text) {
          isCorrect = ans.answer_text.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
        }
        pointsEarned = isCorrect ? (q.points || 1) : 0;
      } else if (q.type === 'enumeration') {
        isCorrect = ans.answer_text && 
          ans.answer_text.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
        pointsEarned = isCorrect ? (q.points || 1) : 0;
      } else if (q.type === 'essay') {
        // AI grading for essay questions (if available)
        if (hasAIGrading && ans.answer_text) {
          try {
            const gradeResult = await gradeEssay(q.question_text, q.correct_answer, ans.answer_text, q.points || 1);
            aiScore = gradeResult.score;
            aiFeedback = gradeResult.feedback;
            pointsEarned = gradeResult.score;
            isCorrect = gradeResult.score >= (q.points || 1) * 0.6; // 60% threshold
          } catch (err) {
            console.error('AI grading error:', err);
            // Manual grading needed
            aiFeedback = 'This essay requires manual grading.';
          }
        } else {
          aiFeedback = hasAIGrading ? 'No answer provided.' : 'Essay requires manual grading (Premium feature).';
        }
      }

      earnedPoints += pointsEarned;

      // Update answer with grading info
      await supabaseAdmin
        .from('answers')
        .update({
          is_correct: isCorrect,
          points_earned: pointsEarned,
          ai_feedback: aiFeedback,
          ai_score: aiScore,
          graded_at: new Date().toISOString()
        })
        .eq('id', ans.id);
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const startedAt = new Date(attempt.started_at).getTime();
    const timeSpent = Math.floor((Date.now() - startedAt) / 1000);

    // Update attempt
    await supabaseAdmin
      .from('quiz_attempts')
      .update({
        score,
        total_points: totalPoints,
        earned_points: earnedPoints,
        time_spent: timeSpent,
        completed_at: new Date().toISOString(),
        is_submitted: true
      })
      .eq('id', attempt.id);

    return res.json({
      message: 'Quiz submitted!',
      score,
      earned_points: earnedPoints,
      total_points: totalPoints,
      passing_score: quiz.passing_score,
      passed: score >= (quiz.passing_score || 60)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Guest: get attempt result ──────────────────────────
async function getGuestResult(req, res) {
  try {
    const { data: attempt } = await supabaseAdmin
      .from('quiz_attempts')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_submitted', true)
      .single();

    if (!attempt) {
      return res.status(404).json({ message: 'Result not found.' });
    }

    const { data: quiz } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', attempt.quiz_id)
      .single();

    // Get questions with answers
    const { data: questions } = await supabaseAdmin
      .from('questions')
      .select(`
        *,
        options (*),
        answers:answers!inner(*)
      `)
      .eq('quiz_id', attempt.quiz_id)
      .eq('answers.attempt_id', attempt.id)
      .order('order_index');

    // Format response
    const formattedQuestions = questions?.map(q => ({
      ...q,
      student_answer: q.answers?.[0] || null,
      answers: undefined, // Remove the nested answers array
      correct_answer: quiz.show_correct_answers ? q.correct_answer : undefined
    })) || [];

    return res.json({
      attempt,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        passing_score: quiz.passing_score,
        show_correct_answers: quiz.show_correct_answers
      },
      questions: formattedQuestions
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Authenticated: start or resume attempt ─────────────
async function startOrResume(req, res) {
  try {
    const quizId = req.params.quizId;

    const { data: quiz } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    // Check for existing in-progress attempt
    let { data: attempt } = await supabaseAdmin
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('user_id', req.user.id)
      .eq('is_submitted', false)
      .single();

    if (!attempt) {
      // Create new attempt
      const { data: newAttempt, error } = await supabaseAdmin
        .from('quiz_attempts')
        .insert({
          quiz_id: quizId,
          user_id: req.user.id,
          student_name: req.user.name,
          student_email: req.user.email
        })
        .select()
        .single();

      if (error) throw error;
      attempt = newAttempt;
    }

    // Get questions
    const { data: questions } = await supabaseAdmin
      .from('questions')
      .select(`
        id, question_text, type, points, order_index,
        options (id, option_text, order_index)
      `)
      .eq('quiz_id', quizId)
      .order('order_index');

    // Get saved answers
    const { data: savedAnswers } = await supabaseAdmin
      .from('answers')
      .select('*')
      .eq('attempt_id', attempt.id);

    return res.json({
      attempt,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        time_limit: quiz.time_limit,
        total_questions: questions?.length || 0
      },
      questions: questions || [],
      savedAnswers: savedAnswers || []
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Authenticated: save answers ────────────────────────
async function saveAnswers(req, res) {
  try {
    const { data: attempt } = await supabaseAdmin
      .from('quiz_attempts')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .eq('is_submitted', false)
      .single();

    if (!attempt) {
      return res.status(404).json({ message: 'Active attempt not found.' });
    }

    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(422).json({ message: 'answers must be an array.' });
    }

    for (const ans of answers) {
      const { data: existing } = await supabaseAdmin
        .from('answers')
        .select('id')
        .eq('attempt_id', attempt.id)
        .eq('question_id', ans.question_id)
        .single();

      if (existing) {
        await supabaseAdmin
          .from('answers')
          .update({
            answer_text: ans.answer_text || null,
            selected_option_id: ans.selected_option_id || null
          })
          .eq('id', existing.id);
      } else {
        await supabaseAdmin
          .from('answers')
          .insert({
            attempt_id: attempt.id,
            question_id: ans.question_id,
            answer_text: ans.answer_text || null,
            selected_option_id: ans.selected_option_id || null
          });
      }
    }

    return res.json({ message: 'Answers saved.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Authenticated: submit attempt ──────────────────────
async function submit(req, res) {
  try {
    const { data: attempt } = await supabaseAdmin
      .from('quiz_attempts')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .eq('is_submitted', false)
      .single();

    if (!attempt) {
      return res.status(404).json({ message: 'Active attempt not found.' });
    }

    // Use same grading logic as guest
    req.params.id = attempt.id;
    
    // Override to use guest submit logic
    const { data: quiz } = await supabaseAdmin
      .from('quizzes')
      .select('*, user:profiles!quizzes_user_id_fkey(id)')
      .eq('id', attempt.quiz_id)
      .single();

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('tier')
      .eq('user_id', quiz.user.id)
      .single();

    const hasAIGrading = subscription?.tier === 'premium' || subscription?.tier === 'enterprise';

    const { data: questions } = await supabaseAdmin
      .from('questions')
      .select(`*, options (*)`)
      .eq('quiz_id', attempt.quiz_id);

    const { data: answers } = await supabaseAdmin
      .from('answers')
      .select('*')
      .eq('attempt_id', attempt.id);

    let totalPoints = 0;
    let earnedPoints = 0;

    for (const q of questions) {
      totalPoints += q.points || 1;
      const ans = answers.find(a => a.question_id === q.id);
      
      if (!ans) continue;

      let isCorrect = false;
      let pointsEarned = 0;
      let aiFeedback = null;
      let aiScore = null;

      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        if (ans.selected_option_id) {
          const selectedOption = q.options.find(o => o.id === ans.selected_option_id);
          isCorrect = selectedOption?.is_correct || false;
        } else if (ans.answer_text) {
          isCorrect = ans.answer_text.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
        }
        pointsEarned = isCorrect ? (q.points || 1) : 0;
      } else if (q.type === 'enumeration') {
        isCorrect = ans.answer_text && 
          ans.answer_text.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
        pointsEarned = isCorrect ? (q.points || 1) : 0;
      } else if (q.type === 'essay' && hasAIGrading && ans.answer_text) {
        try {
          const gradeResult = await gradeEssay(q.question_text, q.correct_answer, ans.answer_text, q.points || 1);
          aiScore = gradeResult.score;
          aiFeedback = gradeResult.feedback;
          pointsEarned = gradeResult.score;
          isCorrect = gradeResult.score >= (q.points || 1) * 0.6;
        } catch (err) {
          console.error('AI grading error:', err);
          aiFeedback = 'This essay requires manual grading.';
        }
      }

      earnedPoints += pointsEarned;

      await supabaseAdmin
        .from('answers')
        .update({
          is_correct: isCorrect,
          points_earned: pointsEarned,
          ai_feedback: aiFeedback,
          ai_score: aiScore,
          graded_at: new Date().toISOString()
        })
        .eq('id', ans.id);
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const startedAt = new Date(attempt.started_at).getTime();
    const timeSpent = Math.floor((Date.now() - startedAt) / 1000);

    await supabaseAdmin
      .from('quiz_attempts')
      .update({
        score,
        total_points: totalPoints,
        earned_points: earnedPoints,
        time_spent: timeSpent,
        completed_at: new Date().toISOString(),
        is_submitted: true
      })
      .eq('id', attempt.id);

    return res.json({
      message: 'Quiz submitted!',
      score,
      earned_points: earnedPoints,
      total_points: totalPoints,
      passing_score: quiz.passing_score,
      passed: score >= (quiz.passing_score || 60)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Authenticated: get result ──────────────────────────
async function getResult(req, res) {
  try {
    const { data: attempt } = await supabaseAdmin
      .from('quiz_attempts')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_submitted', true)
      .single();

    if (!attempt) {
      return res.status(404).json({ message: 'Result not found.' });
    }

    // Check access: student who took it OR quiz owner
    const { data: quiz } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', attempt.quiz_id)
      .single();

    if (attempt.user_id !== req.user.id && quiz?.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    const { data: questions } = await supabaseAdmin
      .from('questions')
      .select(`*, options (*)`)
      .eq('quiz_id', attempt.quiz_id)
      .order('order_index');

    // Get answers for this attempt
    const { data: answers } = await supabaseAdmin
      .from('answers')
      .select('*')
      .eq('attempt_id', attempt.id);

    const formattedQuestions = questions?.map(q => ({
      ...q,
      student_answer: answers?.find(a => a.question_id === q.id) || null,
      correct_answer: quiz.show_correct_answers ? q.correct_answer : undefined
    })) || [];

    return res.json({
      attempt,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        passing_score: quiz.passing_score,
        show_correct_answers: quiz.show_correct_answers
      },
      questions: formattedQuestions
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Authenticated: attempt history ─────────────────────
async function history(req, res) {
  try {
    const { data: attempts } = await supabaseAdmin
      .from('quiz_attempts')
      .select(`
        *,
        quiz:quizzes(id, title)
      `)
      .eq('user_id', req.user.id)
      .eq('is_submitted', true)
      .order('completed_at', { ascending: false });

    return res.json({ 
      attempts: attempts?.map(a => ({
        ...a,
        quiz_title: a.quiz?.title,
        quiz_id: a.quiz?.id
      })) || [] 
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { 
  startGuestAttempt, 
  saveGuestAnswers, 
  submitGuestAttempt,
  getGuestResult,
  startOrResume, 
  saveAnswers, 
  submit, 
  getResult, 
  history 
};
