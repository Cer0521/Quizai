require('dotenv').config();
const { dbAll, dbGet } = require('./src/db');

async function testQueries() {
  try {
    console.log('Testing database queries...\n');

    // Test 1: Dashboard stats
    console.log('1. Testing dashboard stats query...');
    const [totalQuizzes, publishedQuizzes] = await Promise.all([
      dbGet('SELECT COUNT(*) as c FROM quizzes WHERE user_id = 1'),
      dbGet('SELECT COUNT(*) as c FROM quizzes WHERE user_id = 1 AND is_published = 1'),
    ]);
    console.log('✓ Dashboard stats OK:', { totalQuizzes: totalQuizzes?.c, publishedQuizzes: publishedQuizzes?.c });

    // Test 2: Quiz list with completion counts
    console.log('\n2. Testing quiz list query with completion counts...');
    const quizzes = await dbAll(
      `SELECT q.id, q.title, q.description, q.source_type, q.total_questions,
              q.is_published, q.time_limit, q.share_token, q.show_score, q.created_at,
              (SELECT COUNT(*) FROM quiz_assignments WHERE quiz_id = q.id) AS assigned_count,
              (SELECT COUNT(DISTINCT a.student_id) FROM attempts a WHERE a.quiz_id = q.id AND a.status = 'submitted') AS completed_count,
              (SELECT COUNT(DISTINCT ga.id) FROM guest_attempts ga WHERE ga.quiz_id = q.id AND ga.status = 'submitted') AS guest_completed_count
       FROM quizzes q WHERE q.user_id = 1 ORDER BY q.created_at DESC LIMIT 1`
    );
    console.log('✓ Quiz list OK, found', quizzes.length, 'quiz(es)');
    if (quizzes.length > 0) {
      console.log('  Sample:', {
        id: quizzes[0].id,
        title: quizzes[0].title,
        assigned_count: quizzes[0].assigned_count,
        completed_count: quizzes[0].completed_count,
        guest_completed_count: quizzes[0].guest_completed_count,
      });
    }

    // Test 3: Analytics query
    console.log('\n3. Testing analytics query...');
    const quiz = await dbGet('SELECT * FROM quizzes LIMIT 1');
    if (quiz) {
      const submittedAttempts = await dbAll(
        `SELECT a.*, u.name, u.email FROM attempts a
         JOIN users u ON a.student_id = u.id
         WHERE a.quiz_id = $1 AND a.status = 'submitted'
         ORDER BY a.submitted_at DESC`,
        [quiz.id]
      );
      const guestAttempts = await dbAll(
        `SELECT ga.*, ga.student_display_name as name, 'guest' as email
         FROM guest_attempts ga
         WHERE ga.quiz_id = $1 AND ga.status = 'submitted'
         ORDER BY ga.submitted_at DESC`,
        [quiz.id]
      );
      console.log('✓ Analytics OK:', {
        quiz_id: quiz.id,
        submitted_attempts: submittedAttempts.length,
        guest_attempts: guestAttempts.length,
      });
    }

    console.log('\n✅ All queries passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Query test failed:');
    console.error(error);
    process.exit(1);
  }
}

testQueries();
