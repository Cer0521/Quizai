const { dbGet, dbRun } = require('../db');
const { gradeEssay } = require('./gemini');

/**
 * Grade all answers for a quiz attempt.
 * Works with both the regular `answers` table and `guest_answers`.
 *
 * @param {number} quizId
 * @param {Array}  questions  - rows from questions table (with .id, .question_type, .correct_answer)
 * @param {Array}  answers    - rows from answers/guest_answers (with .question_id, .answer_text, .selected_option_id, .id)
 * @param {string} answerTable - 'answers' or 'guest_answers'
 * @param {string} answerFkCol - 'attempt_id' or 'guest_attempt_id' (not used for updates, just info)
 * @returns {{ totalCorrect: number, essayPending: Promise[] }}
 */
async function gradeAnswers(questions, answers, answerTable) {
  let totalCorrect = 0;
  const essayPromises = [];

  for (const q of questions) {
    const ans = answers.find(a => a.question_id === q.id);
    if (!ans) continue;

    if (q.question_type === 'essay') {
      // Grade asynchronously via AI
      essayPromises.push(
        gradeEssay(q.question_text, q.correct_answer, ans.answer_text || '')
          .then(async ({ score, feedback, isCorrect }) => {
            if (isCorrect) totalCorrect++;
            await dbRun(
              `UPDATE ${answerTable} SET is_correct=?, ai_feedback=? WHERE id=?`,
              [isCorrect ? 1 : 0, feedback, ans.id]
            );
          })
          .catch(async () => {
            // If AI grading fails, mark as not graded (no change to is_correct = 0)
            await dbRun(
              `UPDATE ${answerTable} SET ai_feedback=? WHERE id=?`,
              ['AI grading unavailable.', ans.id]
            );
          })
      );
      continue;
    }

    let isCorrect = false;
    if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
      if (ans.selected_option_id) {
        const opt = await dbGet('SELECT option_label, option_text FROM options WHERE id = ?', [ans.selected_option_id]);
        if (opt) {
          // Check if correct_answer matches the option label (A, B, C, D) or the option text
          const labelMatch = opt.option_label.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
          const textMatch = opt.option_text.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
          isCorrect = labelMatch || textMatch;
        }
      }
      if (!isCorrect && ans.answer_text) {
        isCorrect = ans.answer_text.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
      }
    } else {
      // Enumeration — case-insensitive text match
      isCorrect = !!(ans.answer_text && ans.answer_text.trim().toLowerCase() === q.correct_answer.trim().toLowerCase());
    }

    if (isCorrect) totalCorrect++;
    await dbRun(`UPDATE ${answerTable} SET is_correct=? WHERE id=?`, [isCorrect ? 1 : 0, ans.id]);
  }

  // Wait for all essay grading to finish and tally their totals
  if (essayPromises.length > 0) {
    await Promise.all(essayPromises);
    // Re-tally correct count including essay results
    const nonEssayCorrect = totalCorrect;
    // Count the essay answers that were marked correct
    const essayQuestionIds = questions.filter(q => q.question_type === 'essay').map(q => q.id);
    // We already incremented totalCorrect in each promise closure — but that's async.
    // So we need to re-read the essay answers to get the final correct count.
    // Reset and count all correct answers fresh from DB:
    return { refetchNeeded: true };
  }

  return { totalCorrect };
}

/**
 * Simpler, flat grading for non-essay questions only.
 * Used when we want to avoid async complications.
 */
async function gradeAllAnswers(questions, answers, answerTable) {
  let totalCorrect = 0;
  const essayQuestions = questions.filter(q => q.question_type === 'essay');
  const nonEssayQuestions = questions.filter(q => q.question_type !== 'essay');

  // Grade non-essay synchronously
  for (const q of nonEssayQuestions) {
    const ans = answers.find(a => a.question_id === q.id);
    if (!ans) continue;

    let isCorrect = false;
    if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
      if (ans.selected_option_id) {
        const opt = await dbGet('SELECT option_label, option_text FROM options WHERE id = ?', [ans.selected_option_id]);
        if (opt) {
          // Check if correct_answer matches the option label (A, B, C, D) or the option text
          const labelMatch = opt.option_label.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
          const textMatch = opt.option_text.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
          isCorrect = labelMatch || textMatch;
        }
      }
      if (!isCorrect && ans.answer_text) {
        isCorrect = ans.answer_text.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
      }
    } else {
      isCorrect = !!(ans.answer_text && ans.answer_text.trim().toLowerCase() === q.correct_answer.trim().toLowerCase());
    }

    if (isCorrect) totalCorrect++;
    await dbRun(`UPDATE ${answerTable} SET is_correct=? WHERE id=?`, [isCorrect ? 1 : 0, ans.id]);
  }

  // Grade essays in parallel
  if (essayQuestions.length > 0) {
    await Promise.all(essayQuestions.map(async (q) => {
      const ans = answers.find(a => a.question_id === q.id);
      if (!ans) return;
      try {
        const { isCorrect, feedback } = await gradeEssay(q.question_text, q.correct_answer, ans.answer_text || '');
        if (isCorrect) totalCorrect++;
        await dbRun(`UPDATE ${answerTable} SET is_correct=?, ai_feedback=? WHERE id=?`, [isCorrect ? 1 : 0, feedback, ans.id]);
      } catch {
        await dbRun(`UPDATE ${answerTable} SET ai_feedback=? WHERE id=?`, ['AI grading unavailable.', ans.id]);
      }
    }));
  }

  return totalCorrect;
}

module.exports = { gradeAllAnswers };
