import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import './GuestQuizPage.css';

export default function GuestQuizPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, isLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchQuizData();
  }, [attemptId]);

  useEffect(() => {
    if (!timeLeft || timeLeft === 0) return;
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeft]);

  const fetchQuizData = async () => {
    try {
      const { data } = await api.get(`/api/attempts/${attemptId}`);
      setAttempt(data.attempt);
      setQuiz(data.quiz);
      setQuestions(data.questions);
      
      if (data.quiz.time_limit) {
        setTimeLeft(data.quiz.time_limit * 60);
      }
      
      isLoading(false);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      navigate('/');
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/api/attempts/${attemptId}/submit`, { answers });
      navigate(`/guest/result/${attemptId}`);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Loading quiz...</div>;
  if (!quiz || questions.length === 0) return <div className="error">Quiz not found</div>;

  const currentQuestion = questions[currentQuestionIndex];
  const isAnswered = answers.hasOwnProperty(currentQuestion.id);
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="guest-quiz-container">
      {/* Header */}
      <div className="quiz-header">
        <div className="quiz-title">{quiz.title}</div>
        {timeLeft && (
          <div className={`timer ${timeLeft < 300 ? 'warning' : ''}`}>
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        <div className="progress-text">
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>
      </div>

      {/* Question Container */}
      <div className="question-container">
        <h2>{currentQuestion.question_text}</h2>
        
        {currentQuestion.type === 'multiple_choice' && (
          <div className="options">
            {currentQuestion.options?.map(option => (
              <label key={option.id} className="option-label">
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={option.id}
                  checked={answers[currentQuestion.id] === option.id}
                  onChange={() => handleAnswerChange(currentQuestion.id, option.id)}
                />
                <span>{option.option_text}</span>
              </label>
            ))}
          </div>
        )}

        {currentQuestion.type === 'true_false' && (
          <div className="options">
            <label className="option-label">
              <input
                type="radio"
                name={`question-${currentQuestion.id}`}
                value="true"
                checked={answers[currentQuestion.id] === 'true'}
                onChange={() => handleAnswerChange(currentQuestion.id, 'true')}
              />
              <span>True</span>
            </label>
            <label className="option-label">
              <input
                type="radio"
                name={`question-${currentQuestion.id}`}
                value="false"
                checked={answers[currentQuestion.id] === 'false'}
                onChange={() => handleAnswerChange(currentQuestion.id, 'false')}
              />
              <span>False</span>
            </label>
          </div>
        )}

        {currentQuestion.type === 'essay' && (
          <textarea
            className="essay-input"
            placeholder="Write your answer here..."
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            rows="8"
          />
        )}

        {currentQuestion.type === 'enumeration' && (
          <textarea
            className="essay-input"
            placeholder="Enter your answer items, one per line..."
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            rows="6"
          />
        )}
      </div>

      {/* Navigation and Submit */}
      <div className="quiz-footer">
        <button 
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="nav-button"
        >
          Previous
        </button>

        <div className="question-navigator">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestionIndex(idx)}
              className={`question-dot ${idx === currentQuestionIndex ? 'active' : ''} ${answers[q.id] ? 'answered' : ''}`}
              title={`Question ${idx + 1}`}
            />
          ))}
        </div>

        {currentQuestionIndex === questions.length - 1 ? (
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="submit-button"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        ) : (
          <button 
            onClick={handleNext}
            className="nav-button"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
