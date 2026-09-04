// In-browser embeddings, using the SAME model the GitHub Action used to
// build index.json, so query vectors and document vectors live in the same
// space. Loaded from a CDN as an ES module - no build step, no bundler.

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const CDN_URL = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm';

let embedderPromise = null;

async function getEmbedder(onStatus) {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      onStatus?.('Loading local embedding model (first time only, ~25MB, cached after)...');
      const { pipeline, env } = await import(CDN_URL);
      env.allowLocalModels = false;
      const embedder = await pipeline('feature-extraction', MODEL_NAME);
      onStatus?.('');
      return embedder;
    })();
  }
  return embedderPromise;
}

export async function embedText(text, onStatus) {
  const embedder = await getEmbedder(onStatus);
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  // Vectors are already normalized at embed time, so dot product == cosine similarity.
  return dot;
}
