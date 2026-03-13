const fetch = require('node-fetch');

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * Strips markdown code fences from JSON response
 */
function extractJson(text) {
  if (!text) return null;
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) return fenceMatch[1];
  return trimmed;
}

/**
 * Grade an essay question using AI
 * @param {string} question - The question text
 * @param {string} correctAnswer - The expected/model answer or grading criteria
 * @param {string} studentAnswer - The student's answer
 * @param {number} maxPoints - Maximum points for this question
 * @returns {Promise<{score: number, feedback: string}>}
 */
async function gradeEssay(question, correctAnswer, studentAnswer, maxPoints = 1) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const prompt = `You are an expert educator grading student essays. Grade the following essay answer.

QUESTION:
${question}

EXPECTED ANSWER/GRADING CRITERIA:
${correctAnswer || 'Evaluate based on accuracy, completeness, and clarity.'}

STUDENT'S ANSWER:
${studentAnswer}

MAXIMUM POINTS: ${maxPoints}

Please evaluate the student's answer and provide:
1. A score from 0 to ${maxPoints} (can be decimal for partial credit)
2. Detailed feedback explaining what was correct, what was incorrect, and suggestions for improvement

Return your response as a JSON object with this exact format:
{
  "score": <number between 0 and ${maxPoints}>,
  "feedback": "<detailed feedback string>"
}`;

  const response = await fetch(`${BASE_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
      contents: [{
        parts: [{ text: prompt }]
      }]
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message || `AI service error: ${response.status}`);
  }

  const data = await response.json();
  const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!aiText) {
    throw new Error('AI returned empty response');
  }

  try {
    const result = JSON.parse(extractJson(aiText));
    return {
      score: Math.min(Math.max(0, Number(result.score) || 0), maxPoints),
      feedback: result.feedback || 'No feedback provided.'
    };
  } catch {
    console.error('Failed to parse AI grading response:', aiText);
    throw new Error('Failed to parse AI grading response');
  }
}

module.exports = { gradeEssay };
