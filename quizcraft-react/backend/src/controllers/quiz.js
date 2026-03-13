const fs = require('fs');
const { supabaseAdmin } = require('../supabase');
const { generateFromDocument } = require('../services/gemini');

// ── Teacher: list own quizzes ──────────────────────────
async function index(req, res) {
  try {
    const { data: quizzes, error } = await supabaseAdmin
      .from('quizzes')
      .select(`
        id, title, description, subject, difficulty,
        is_published, time_limit, share_code, created_at,
        questions:questions(count)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get attempt counts for each quiz
    const quizzesWithCounts = await Promise.all(quizzes.map(async (quiz) => {
      const { count } = await supabaseAdmin
        .from('quiz_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', quiz.id);

      return {
        ...quiz,
        total_questions: quiz.questions?.[0]?.count || 0,
        attempt_count: count || 0
      };
    }));

    return res.json({ quizzes: quizzesWithCounts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: get single quiz with questions ────────────
async function show(req, res) {
  try {
    const { data: quiz, error } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !quiz) return res.status(404).json({ message: 'Not found.' });
    if (quiz.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });

    // Get questions with options
    const { data: questions } = await supabaseAdmin
      .from('questions')
      .select(`
        *,
        options (*)
      `)
      .eq('quiz_id', quiz.id)
      .order('order_index');

    quiz.questions = questions || [];
    return res.json({ quiz });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: create quiz via AI upload ─────────────────
async function store(req, res) {
  try {
    const { title, description, total_questions, sections, time_limit } = req.body;
    const file = req.file;
    if (!title || !total_questions || !sections || !file)
      return res.status(422).json({ errors: { general: ['All fields including document are required.'] } });

    const parsedSections = typeof sections === 'string' ? JSON.parse(sections) : sections;
    const totalAssigned = parsedSections.reduce((sum, s) => sum + parseInt(s.count), 0);
    const totalQ = parseInt(total_questions);
    if (totalAssigned !== totalQ)
      return res.status(422).json({ errors: { sections: [`Sections total (${totalAssigned}) must equal Total Questions (${totalQ}).`] } });

    // Check subscription limits
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (subscription?.tier === 'free') {
      const periodStart = new Date(subscription.period_start);
      const now = new Date();
      
      // Reset counter if period has expired
      if (now > new Date(subscription.period_end)) {
        await supabaseAdmin
          .from('subscriptions')
          .update({
            quiz_count_this_period: 0,
            period_start: now.toISOString(),
            period_end: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('user_id', req.user.id);
      } else if (subscription.quiz_count_this_period >= 5) {
        return res.status(403).json({ 
          message: 'Free tier limit reached. Upgrade to Premium for unlimited quizzes.',
          code: 'SUBSCRIPTION_LIMIT'
        });
      }
    }

    const mimeType = file.mimetype;
    const base64Data = fs.readFileSync(file.path).toString('base64');

    // Create quiz
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .insert({
        user_id: req.user.id,
        title,
        description: description || null,
        time_limit: time_limit || null,
        difficulty: 'medium'
      })
      .select()
      .single();

    if (quizError) throw quizError;

    let prompt = `You are an expert educator. Create a comprehensive assessment based ONLY on the provided document. The test must have exactly ${totalQ} questions. Follow this exact blueprint:\n\n`;
    parsedSections.forEach((section, i) => {
      prompt += `Section ${i + 1}: ${section.count} Questions, Format: ${section.type}.\n`;
    });
    prompt += `\nReturn the output STRICTLY as a JSON object with a 'sections' array. Each section must have a 'title', 'type', and an array of 'questions'. Each question must have the 'question_text', an array of 'options' (if multiple choice), and the 'correct_answer'.`;

    const aiResponse = await generateFromDocument(prompt, mimeType, base64Data);

    // Persist questions + options from AI response
    if (aiResponse?.sections) {
      let orderIdx = 0;
      for (const section of aiResponse.sections) {
        const qType = section.type === 'True or False' ? 'true_false'
          : section.type === 'Enumeration' ? 'enumeration'
          : section.type === 'Essay' ? 'essay'
          : 'multiple_choice';
          
        for (const q of (section.questions || [])) {
          const { data: question, error: qError } = await supabaseAdmin
            .from('questions')
            .insert({
              quiz_id: quiz.id,
              question_text: q.question_text || q.question,
              type: qType,
              correct_answer: q.correct_answer || q.answer || '',
              points: 1,
              order_index: orderIdx++
            })
            .select()
            .single();

          if (qError) throw qError;

          if (q.options && Array.isArray(q.options)) {
            const optionsToInsert = q.options.map((opt, i) => ({
              question_id: question.id,
              option_text: opt,
              is_correct: opt === q.correct_answer || (q.correct_answer && q.correct_answer.includes(opt)),
              order_index: i
            }));

            await supabaseAdmin.from('options').insert(optionsToInsert);
          }
        }
      }
    }

    // Increment quiz count for free tier
    if (subscription?.tier === 'free') {
      await supabaseAdmin
        .from('subscriptions')
        .update({ quiz_count_this_period: (subscription.quiz_count_this_period || 0) + 1 })
        .eq('user_id', req.user.id);
    }

    // Clean up temp file
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return res.status(201).json({ quiz, message: 'Assessment generated successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'Server error.' });
  }
}

// ── Teacher: manually create quiz ─────────────────────
async function storeManual(req, res) {
  try {
    const { title, description, time_limit, difficulty, subject } = req.body;
    if (!title) return res.status(422).json({ errors: { title: ['Title is required.'] } });

    // Check subscription limits
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (subscription?.tier === 'free') {
      const now = new Date();
      if (now > new Date(subscription.period_end)) {
        await supabaseAdmin
          .from('subscriptions')
          .update({
            quiz_count_this_period: 0,
            period_start: now.toISOString(),
            period_end: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('user_id', req.user.id);
      } else if (subscription.quiz_count_this_period >= 5) {
        return res.status(403).json({ 
          message: 'Free tier limit reached. Upgrade to Premium for unlimited quizzes.',
          code: 'SUBSCRIPTION_LIMIT'
        });
      }
    }

    const { data: quiz, error } = await supabaseAdmin
      .from('quizzes')
      .insert({
        user_id: req.user.id,
        title,
        description: description || null,
        time_limit: time_limit || null,
        difficulty: difficulty || 'medium',
        subject: subject || null
      })
      .select()
      .single();

    if (error) throw error;

    // Increment quiz count for free tier
    if (subscription?.tier === 'free') {
      await supabaseAdmin
        .from('subscriptions')
        .update({ quiz_count_this_period: (subscription.quiz_count_this_period || 0) + 1 })
        .eq('user_id', req.user.id);
    }

    return res.status(201).json({ quiz });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: update quiz meta + questions ─────────────
async function update(req, res) {
  try {
    const { data: quiz, error: fetchError } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !quiz) return res.status(404).json({ message: 'Not found.' });
    if (quiz.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });

    const { title, description, time_limit, is_published, difficulty, subject, passing_score } = req.body;
    if (!title) return res.status(422).json({ errors: { title: ['Title is required.'] } });

    const { data: updated, error } = await supabaseAdmin
      .from('quizzes')
      .update({
        title,
        description: description ?? quiz.description,
        time_limit: time_limit ?? quiz.time_limit,
        is_published: is_published ?? quiz.is_published,
        difficulty: difficulty ?? quiz.difficulty,
        subject: subject ?? quiz.subject,
        passing_score: passing_score ?? quiz.passing_score
      })
      .eq('id', quiz.id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ quiz: updated, message: 'Assessment updated successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: publish toggle ────────────────────────────
async function publish(req, res) {
  try {
    const { data: quiz, error: fetchError } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !quiz) return res.status(404).json({ message: 'Not found.' });
    if (quiz.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });

    const newVal = !quiz.is_published;
    
    await supabaseAdmin
      .from('quizzes')
      .update({ is_published: newVal })
      .eq('id', quiz.id);

    return res.json({ is_published: newVal, share_code: quiz.share_code });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: delete quiz ───────────────────────────────
async function destroy(req, res) {
  try {
    const { data: quiz, error: fetchError } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !quiz) return res.status(404).json({ message: 'Not found.' });
    if (quiz.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });

    await supabaseAdmin.from('quizzes').delete().eq('id', quiz.id);

    return res.json({ message: 'Assessment deleted successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: add question ──────────────────────────────
async function addQuestion(req, res) {
  try {
    const { data: quiz } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!quiz || quiz.user_id !== req.user.id) 
      return res.status(403).json({ message: 'Forbidden.' });

    const { question_text, type, correct_answer, options, points, explanation } = req.body;
    if (!question_text || !correct_answer)
      return res.status(422).json({ errors: { general: ['Question text and correct answer are required.'] } });

    // Get max order index
    const { data: maxOrder } = await supabaseAdmin
      .from('questions')
      .select('order_index')
      .eq('quiz_id', quiz.id)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const orderIndex = (maxOrder?.order_index ?? -1) + 1;

    const { data: question, error } = await supabaseAdmin
      .from('questions')
      .insert({
        quiz_id: quiz.id,
        question_text,
        type: type || 'multiple_choice',
        correct_answer,
        points: points || 1,
        explanation: explanation || null,
        order_index: orderIndex
      })
      .select()
      .single();

    if (error) throw error;

    if (options && Array.isArray(options)) {
      const optionsToInsert = options.map((opt, i) => ({
        question_id: question.id,
        option_text: typeof opt === 'string' ? opt : opt.text,
        is_correct: typeof opt === 'string' ? opt === correct_answer : opt.is_correct,
        order_index: i
      }));

      await supabaseAdmin.from('options').insert(optionsToInsert);
    }

    // Fetch question with options
    const { data: questionWithOptions } = await supabaseAdmin
      .from('questions')
      .select(`*, options (*)`)
      .eq('id', question.id)
      .single();

    return res.status(201).json({ question: questionWithOptions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: update question ───────────────────────────
async function updateQuestion(req, res) {
  try {
    const { data: question } = await supabaseAdmin
      .from('questions')
      .select(`*, quiz:quizzes(user_id)`)
      .eq('id', req.params.qid)
      .single();

    if (!question || question.quiz?.user_id !== req.user.id) 
      return res.status(403).json({ message: 'Forbidden.' });

    const { question_text, type, correct_answer, options, points, explanation } = req.body;

    await supabaseAdmin
      .from('questions')
      .update({
        question_text,
        type,
        correct_answer,
        points: points || question.points,
        explanation: explanation ?? question.explanation
      })
      .eq('id', question.id);

    if (options && Array.isArray(options)) {
      // Delete existing options
      await supabaseAdmin.from('options').delete().eq('question_id', question.id);

      // Insert new options
      const optionsToInsert = options.map((opt, i) => ({
        question_id: question.id,
        option_text: typeof opt === 'string' ? opt : opt.text,
        is_correct: typeof opt === 'string' ? opt === correct_answer : opt.is_correct,
        order_index: i
      }));

      await supabaseAdmin.from('options').insert(optionsToInsert);
    }

    // Fetch updated question with options
    const { data: updated } = await supabaseAdmin
      .from('questions')
      .select(`*, options (*)`)
      .eq('id', question.id)
      .single();

    return res.json({ question: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: delete question ───────────────────────────
async function deleteQuestion(req, res) {
  try {
    const { data: question } = await supabaseAdmin
      .from('questions')
      .select(`*, quiz:quizzes(user_id)`)
      .eq('id', req.params.qid)
      .single();

    if (!question || question.quiz?.user_id !== req.user.id) 
      return res.status(403).json({ message: 'Forbidden.' });

    await supabaseAdmin.from('questions').delete().eq('id', question.id);

    return res.json({ message: 'Question deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: analytics ────────────────────────────────
async function analytics(req, res) {
  try {
    const { data: quiz } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (!quiz) return res.status(404).json({ message: 'Not found.' });

    // Get all attempts for this quiz
    const { data: attempts } = await supabaseAdmin
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quiz.id)
      .eq('is_submitted', true)
      .order('completed_at', { ascending: false });

    const submittedAttempts = attempts || [];
    const totalAttempts = submittedAttempts.length;

    const scores = submittedAttempts.map(a => a.score || 0);
    const avgScore = scores.length ? (scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(2) : 0;
    const highestScore = scores.length ? Math.max(...scores) : 0;
    const lowestScore = scores.length ? Math.min(...scores) : 0;

    const distribution = {
      low:       { range: '0-49%',   count: scores.filter(s => s < 50).length },
      medium:    { range: '50-74%',  count: scores.filter(s => s >= 50 && s < 75).length },
      high:      { range: '75-89%',  count: scores.filter(s => s >= 75 && s < 90).length },
      excellent: { range: '90-100%', count: scores.filter(s => s >= 90).length },
    };

    // Get question count
    const { count: questionCount } = await supabaseAdmin
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('quiz_id', quiz.id);

    return res.json({
      quiz: { id: quiz.id, title: quiz.title, total_questions: questionCount || 0 },
      summary: {
        total_attempts: totalAttempts,
        average_score: parseFloat(avgScore),
        highest_score: highestScore,
        lowest_score: lowestScore,
      },
      score_distribution: distribution,
      students: submittedAttempts.map(a => ({
        student_name: a.student_name,
        student_email: a.student_email,
        score: a.score,
        earned_points: a.earned_points,
        total_points: a.total_points,
        time_spent: a.time_spent,
        completed_at: a.completed_at,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Public: get quiz by share code ─────────────────────
async function getByShareCode(req, res) {
  try {
    const { data: quiz, error } = await supabaseAdmin
      .from('quizzes')
      .select(`
        id, title, description, subject, difficulty, time_limit, 
        share_code, passing_score, shuffle_questions, allow_retakes,
        user:profiles!quizzes_user_id_fkey(full_name)
      `)
      .eq('share_code', req.params.code)
      .eq('is_published', true)
      .single();

    if (error || !quiz) {
      return res.status(404).json({ message: 'Quiz not found or not published.' });
    }

    // Get question count
    const { count } = await supabaseAdmin
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('quiz_id', quiz.id);

    return res.json({ 
      quiz: {
        ...quiz,
        total_questions: count || 0,
        teacher_name: quiz.user?.full_name || 'Teacher'
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { 
  index, show, store, storeManual, update, publish, destroy, 
  addQuestion, updateQuestion, deleteQuestion, analytics,
  getByShareCode
};
