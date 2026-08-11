/**
 * One release-tool definition of a legacy Signal & Friction Payment Link.
 * Old creator versions consistently prefixed their Stripe Product names with
 * this product identity; unrelated links in a shared Stripe account are never
 * mutated or allowed to block the S&F cutover.
 */
export async function listActiveSignalAndFrictionPaymentLinks(stripeGet) {
  const active = [];
  let startingAfter = null;
  do {
    const params = new URLSearchParams({ active: "true", limit: "100" });
    if (startingAfter) params.set("starting_after", startingAfter);
    const page = await stripeGet(`/payment_links?${params}`);
    active.push(...(page.data || []));
    startingAfter = page.has_more && page.data?.length ? page.data.at(-1).id : null;
  } while (startingAfter);

  const productMatches = new Map();
  const scoped = [];
  for (const link of active) {
    const lines = await stripeGet(`/payment_links/${encodeURIComponent(link.id)}/line_items?limit=100`);
    let belongs = false;
    for (const line of lines.data || []) {
      const productId =
        typeof line.price?.product === "string" ? line.price.product : line.price?.product?.id;
      if (!productId) continue;
      if (!productMatches.has(productId)) {
        const product = await stripeGet(`/products/${encodeURIComponent(productId)}`);
        productMatches.set(
          productId,
          typeof product.name === "string" && product.name.startsWith("Signal & Friction")
        );
      }
      if (productMatches.get(productId)) {
        belongs = true;
        break;
      }
    }
    if (belongs) scoped.push(link);
  }
  return scoped;
}
