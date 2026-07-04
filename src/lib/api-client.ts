import {
  ApiError,
  apiErrorEnvelope,
  type ContractInput,
  type ContractOutput,
  type EndpointContract,
} from "@/contracts/common";

/**
 * Typed API client for client components. The contract object carries the
 * path, method, and schemas, so the return type is inferred and the response
 * is runtime-validated — no manual casting anywhere.
 *
 *   const result = await api(contracts.submitDiagnostic, { attemptId, responses });
 */
export async function api<C extends EndpointContract>(
  contract: C,
  input: ContractInput<C>
): Promise<ContractOutput<C>> {
  const isGet = contract.method === "GET";
  const url = isGet
    ? `${contract.path}?${new URLSearchParams(input as Record<string, string>)}`
    : contract.path;

  let response: Response;
  try {
    response = await fetch(url, {
      method: contract.method,
      credentials: "same-origin",
      headers: isGet ? undefined : { "Content-Type": "application/json" },
      body: isGet ? undefined : JSON.stringify(input),
    });
  } catch {
    throw new ApiError("internal", "Network error — check your connection");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const envelope = apiErrorEnvelope.safeParse(body);
    if (envelope.success) {
      throw new ApiError(
        envelope.data.error.code,
        envelope.data.error.message
      );
    }
    throw new ApiError("internal", `Request failed (${response.status})`);
  }

  // parse() on a generic ZodType loses the inferred output type — safe cast.
  return contract.output.parse(body) as ContractOutput<C>;
}
