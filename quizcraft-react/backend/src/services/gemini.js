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

module.exports = { generateFromDocument };
