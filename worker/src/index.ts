import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Env = {
  Bindings: {
    // Add Supabase URL and keys as Cloudflare Worker secrets/bindings later.
    // SUPABASE_URL: string;
    // SUPABASE_SERVICE_ROLE_KEY: string;
  };
};

type ScorePayload = {
  playerName: string;
  score: number;
  worldId: number;
};

const app = new Hono<Env>();

// Replace the wildcard with the deployed Pages origin before production.
app.use('/api/*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'], allowHeaders: ['Content-Type'] }));
app.get('/api/health', (context) => context.json({ ok: true, service: 'zion-api' }));

/** Accepts a validated score payload; persistence will be wired to Supabase later. */
app.post('/api/score', async (context) => {
  let payload: Partial<ScorePayload>;
  try {
    payload = await context.req.json<Partial<ScorePayload>>();
  } catch {
    return context.json({ error: 'Request body must be valid JSON.' }, 400);
  }

  const playerName = typeof payload.playerName === 'string' ? payload.playerName.trim() : '';
  const { score, worldId } = payload;
  if (!playerName || playerName.length > 18) {
    return context.json({ error: 'playerName must contain 1–18 characters.' }, 400);
  }
  if (typeof score !== 'number' || !Number.isSafeInteger(score) || score < 0 || score > 1_000_000_000) {
    return context.json({ error: 'score must be a non-negative safe integer.' }, 400);
  }
  if (typeof worldId !== 'number' || !Number.isInteger(worldId) || worldId < 0 || worldId > 4) {
    return context.json({ error: 'worldId must be an integer from 0 to 4.' }, 400);
  }

  // TODO: insert into Supabase after credentials and the score schema are configured.
  return context.json({ accepted: true, persisted: false, score: { playerName, score, worldId } }, 202);
});

app.notFound((context) => context.json({ error: 'Not found.' }, 404));
app.onError((error, context) => {
  console.error('Unhandled Zion API error:', error);
  return context.json({ error: 'Internal server error.' }, 500);
});

export default app;
