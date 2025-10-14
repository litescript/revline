// src/lib/api/examples.ts
// Example: call your FastAPI health route with full typing.
import { get } from "./client";

// Example function for a TanStack Query hook or direct usage
export async function fetchHealth() {
  const { data, error, response } = await get("/health");
  if (error) {
    // error is typed from OpenAPI responses if provided
    throw new Error(`Health check failed: ${response.status}`);
  }
  return data;
}
