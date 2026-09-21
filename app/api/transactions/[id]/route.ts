// Generic transaction deletion is intentionally unavailable in the product API.
export async function DELETE() {
    return Response.json(
        {error: {code: "METHOD_NOT_ALLOWED", message: "Transaction deletion is not supported"}},
        {status: 405, headers: {Allow: ""}},
    );
}
