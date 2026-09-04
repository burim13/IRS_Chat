import { embedText, cosineSimilarity, decodeEmbedding } from './embed.js';
import { getApiKey } from './apiKey.js';

const TOP_K = 5;
const SIMILARITY_THRESHOLD = 0.25;
const ANTHROPIC_MODELS_URL = 'https://api.anthropic.com/v1/messages';

// yearIndex is { docs: [{code,category,number,title,year}], chunks: [{d, page, text, e}] }
// (see scripts/build-index.js) - resolve each chunk's doc reference and
// decode its embedding so callers get a flat, self-contained object.
function retrieveChunks(queryEmbedding, yearIndex) {
  const scored = yearIndex.chunks.map((raw) => {
    const doc = yearIndex.docs[raw.d];
    const embedding = decodeEmbedding(raw.e);
    return {
      chunk: { ...doc, page: raw.page, text: raw.text },
      score: cosineSimilarity(queryEmbedding, embedding),
    };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score >= SIMILARITY_THRESHOLD).slice(0, TOP_K);
}

function buildSystemPrompt() {
  return [
    'You are a tax document assistant. You answer questions using ONLY the excerpts from official IRS documents provided in the user message below.',
    'Do not use any outside knowledge about tax law, even if you are confident it is correct.',
    'If the excerpts do not contain enough information to answer the question, respond with exactly this sentence and nothing else: "The indexed documents do not contain information to answer this question."',
    'Otherwise, write a short, plain-English explanation (aimed at someone with no tax background) of what the excerpts mean in relation to the question. Do not just repeat the excerpts verbatim - the user already sees those separately. Keep it concise.',
  ].join(' ');
}

function buildUserMessage(question, scoredChunks) {
  const excerpts = scoredChunks
    .map(
      (s, i) =>
        `[${i + 1}] Source: ${s.chunk.number} - ${s.chunk.title} (${s.chunk.year}), page ${s.chunk.page}\n${s.chunk.text}`
    )
    .join('\n\n');
  return `Excerpts:\n\n${excerpts}\n\nQuestion: ${question}`;
}

async function callClaude(model, question, scoredChunks) {
  const res = await fetch(ANTHROPIC_MODELS_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': getApiKey(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: buildUserMessage(question, scoredChunks) }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.content?.map((c) => c.text).join('') || '';
}

export async function answerQuestion({ question, year, yearIndex, model, onStatus }) {
  onStatus('Embedding your question...');
  const queryEmbedding = await embedText(question, onStatus);

  onStatus('Searching indexed documents...');
  const scoredChunks = retrieveChunks(queryEmbedding, yearIndex);

  if (!scoredChunks.length) {
    return { noAnswer: true, chunks: [], plainEnglish: null };
  }

  onStatus('Asking Claude to explain the excerpts...');
  const plainEnglish = await callClaude(model, question, scoredChunks);

  return { noAnswer: false, chunks: scoredChunks, plainEnglish };
}
