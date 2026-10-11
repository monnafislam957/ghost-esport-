// Webhook scaffold: intentionally does not mark any transaction as paid.
// A production webhook must validate provider signatures against official
// documentation, fetch/verify the transaction server-side, and be idempotent.
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  return Response.json({
    error: "Webhook verification is not configured; no payment status was changed."
  }, { status: 501 });
});