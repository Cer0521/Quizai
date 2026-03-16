import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import './GuestQuizResult.css';

export default function GuestQuizResult() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, isLoading] = useState(true);
  const [expandedAnswer, setExpandedAnswer] = useState(null);

  useEffect(() => {
    fetchResult();
  }, [attemptId]);

  const fetchResult = async () => {
    try {
      const { data } = await api.get(`/api/attempts/${attemptId}/result`);
      setAttempt(data.attempt);
      setQuiz(data.quiz);
      setAnswers(data.answers);
      isLoading(false);
    } catch (error) {
      console.error('Error fetching result:', error);
      navigate('/');
    }
  };

  if (loading) return <div className="loading">Loading results...</div>;
  if (!attempt) return <div className="error">Results not found</div>;

  const percentage = attempt.total_points > 0 
    ? Math.round((attempt.earned_points / attempt.total_points) * 100)
    : 0;
  
  const passed = percentage >= (quiz?.passing_score || 60);

  return (
    <div className="result-container">
      {/* Score Card */}
      <div className={`score-card ${passed ? 'passed' : 'failed'}`}>
        <div className="score-circle">
          <div className="percentage">{percentage}%</div>
          <div className="score-text">{passed ? 'Passed' : 'Failed'}</div>
        </div>
        <div className="score-details">
          <p>Student: <strong>{attempt.student_name}</strong></p>
          {attempt.student_email && <p>Email: <strong>{attempt.student_email}</strong></p>}
          <p>Quiz: <strong>{quiz.title}</strong></p>
          <p>Score: <strong>{attempt.earned_points} / {attempt.total_points}</strong> points</p>
          <p>Passing Score: <strong>{quiz.passing_score}%</strong></p>
        </div>
      </div>

      {/* Detailed Answers */}
      <div className="answers-section">
        <h2>Answer Review</h2>
        {answers.map((answer, idx) => (
          <div 
            key={answer.id} 
            className={`answer-item ${answer.is_correct ? 'correct' : 'incorrect'}`}
          >
            <div 
              className="answer-header"
              onClick={() => setExpandedAnswer(expandedAnswer === answer.id ? null : answer.id)}
            >
              <div className="answer-status">
                <span className="question-number">Q{idx + 1}</span>
                <span className={`status-badge ${answer.is_correct ? 'correct' : 'incorrect'}`}>
                  {answer.is_correct ? '✓ Correct' : '✗ Incorrect'}
                </span>
              </div>
              <div className="answer-points">
                {answer.points_earned} / {answer.question?.points || 1} points
              </div>
            </div>

            {expandedAnswer === answer.id && (
              <div className="answer-details">
                <div className="question-text">
                  <strong>Question:</strong> {answer.question?.question_text}
                </div>
                <div className="student-answer">
                  <strong>Your Answer:</strong>
                  <p>{answer.answer_text || answer.selected_option?.option_text || 'No answer provided'}</p>
                </div>
                {answer.question?.correct_answer && (
                  <div className="correct-answer">
                    <strong>Correct Answer:</strong>
                    <p>{answer.question.correct_answer}</p>
                  </div>
                )}
                {answer.question?.explanation && (
                  <div className="explanation">
                    <strong>Explanation:</strong>
                    <p>{answer.question.explanation}</p>
                  </div>
                )}
                {answer.ai_feedback && (
                  <div className="ai-feedback">
                    <strong>AI Feedback:</strong>
                    <p>{answer.ai_feedback}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="result-footer">
        <button onClick={() => navigate('/')} className="back-button">
          Back to Home
        </button>
        {quiz.allow_retakes && (
          <button onClick={() => navigate(`/guest/quiz/${quiz.share_code}`)} className="retake-button">
            Retake Quiz
          </button>
        )}
      </div>
    </div>
  );
}
