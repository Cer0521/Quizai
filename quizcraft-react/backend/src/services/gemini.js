const fetch = require('node-fetch');

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * Strips markdown code fences that Gemini sometimes wraps around JSON.
 * e.g.  ```json\n{...}\n```  →  {...}
 */
function extractJson(text) {
  if (!text) return null;
  const trimmed = text.trim();
  // Strip ```json ... ``` or ``` ... ``` fences
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) return fenceMatch[1];
  return trimmed;
}

async function generateFromDocument(prompt, mimeType, base64Data) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in environment variables.');

  const response = await fetch(`${BASE_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64Data } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const msg = body?.error?.message || '';
    if (response.status === 400) throw new Error(`Document rejected by AI: ${msg || 'too large or unsupported format.'}`);
    if (response.status === 403) throw new Error('Invalid or missing GEMINI_API_KEY.');
    if (response.status === 429) throw new Error('AI rate limit hit. Please wait a moment and try again.');
    throw new Error(`AI service error (${response.status}): ${msg || 'please try again.'}`);
  }

  const data = await response.json();
  const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!aiText) {
    const finishReason = data?.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY') throw new Error('The AI flagged the document content. Please try a different document.');
    if (finishReason === 'MAX_TOKENS') throw new Error('The AI response was too long. Try reducing the number of questions.');
    throw new Error('The AI returned an empty response. Please try again.');
  }

  try {
    return JSON.parse(extractJson(aiText));
  } catch {
    // Log the raw text to help debug what Gemini actually returned
    console.error('Failed to parse Gemini JSON. Raw response:\n', aiText.slice(0, 500));
    throw new Error('The AI returned malformed data. Please try again or reduce the number of questions.');
  }
}

/**
 * Grade an essay answer using Gemini.
 * Returns { score: 0.0–1.0, feedback: string, isCorrect: boolean }
 */
async function gradeEssay(questionText, correctAnswer, studentAnswer) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in environment variables.');

  const prompt = `You are a strict but fair teacher grading an essay question.

Question: ${questionText}
Model Answer / Key Points: ${correctAnswer}
Student's Answer: ${studentAnswer || '(no answer provided)'}

Evaluate the student's answer against the model answer. Return ONLY a JSON object with:
- "score": a number from 0.0 to 1.0 (1.0 = fully correct, 0.6+ = mostly correct, 0.3–0.59 = partially correct, 0–0.29 = incorrect/missing)
- "feedback": a concise 1–3 sentence explanation of why the answer is correct, partially correct, or incorrect, referencing specific key points

Example: {"score": 0.8, "feedback": "The student correctly identified the main concept but missed the specific detail about X."}`;

  const response = await fetch(`${BASE_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      contents: [{ parts: [{ text: prompt }] }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`AI grading error (${response.status})`);
  }

  const data = await response.json();
  const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!aiText) throw new Error('AI returned empty grading response.');

  try {
    const result = JSON.parse(extractJson(aiText));
    const score = Math.min(1, Math.max(0, parseFloat(result.score) || 0));
    return { score, feedback: result.feedback || '', isCorrect: score >= 0.6 };
  } catch {
    return { score: 0, feedback: 'Could not grade automatically.', isCorrect: false };
  }
}

module.exports = { generateFromDocument, gradeEssay };
