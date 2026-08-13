const CORS = { "Content-Type": "application/json" };

export const onRequestGet = async ({ request }: { request: Request }): Promise<Response> => {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId || !/^cs_(?:live|test)_[A-Za-z0-9]{10,200}$/.test(sessionId)) {
    return Response.json({ error: "Valid Checkout session_id required" }, { status: 400, headers: CORS });
  }
  return Response.json({ verified: false, status: "verification_pending" }, { headers: CORS });
};
