// The old path ambiguously treated its parent id as a child id. Use /api/childaccount/:id/adjustment.
export async function POST() {
    return Response.json(
        {error: {code: "GONE", message: "This endpoint has moved"}},
        {status: 410},
    );
}
