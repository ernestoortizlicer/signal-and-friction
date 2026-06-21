import Stripe from 'stripe';

interface Env {
  STRIPE_SECRET_KEY: string;
}

export const onRequestGet = async ({
  env,
}: {
  env: Env;
}): Promise<Response> => {
  if (!env.STRIPE_SECRET_KEY) {
    return Response.json({ error: 'Missing Stripe key' }, { status: 500 });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-05-27.dahlia',
    httpClient: Stripe.createFetchHttpClient(),
  });

  // 7-day window
  const now = Math.floor(Date.now() / 1000);
  const sevenDaysAgo = now - 7 * 86400;

  // Bucket by day (0 = 7 days ago, 6 = today)
  const dailyTotals: number[] = new Array(7).fill(0);

  try {
    const sessions = await stripe.checkout.sessions.list({
      created: { gte: sevenDaysAgo },
      limit: 100,
    });

    for (const session of sessions.data) {
      if (session.payment_status !== 'paid' || !session.amount_total) continue;
      const daysAgo = Math.floor((now - session.created) / 86400);
      const bucketIndex = 6 - Math.min(daysAgo, 6);
      dailyTotals[bucketIndex] += session.amount_total;
    }

    // Convert from cents to dollars
    const sparkline = dailyTotals.map(v => Math.round(v / 100));

    return Response.json(
      { sparkline, generatedAt: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe error';
    return Response.json({ error: msg }, { status: 500 });
  }
};
