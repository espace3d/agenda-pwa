import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function hashEndpoint(endpoint) {
  return createHash('sha256').update(endpoint).digest('hex').slice(0, 16);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription, events, timezone } = req.body;

    if (!subscription?.endpoint || !subscription?.keys) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Invalid events' });
    }

    const redis = getRedis();
    const hash = hashEndpoint(subscription.endpoint);
    const key = `sub:${hash}`;

    const data = {
      subscription,
      events,
      timezone: timezone || 'Europe/Paris',
      updatedAt: Date.now(),
    };

    await redis.set(key, JSON.stringify(data), { ex: TTL_SECONDS });

    return res.status(200).json({ ok: true, hash });
  } catch (err) {
    console.error('sync error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
