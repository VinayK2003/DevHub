import { API_BASE } from "../config/api";

interface ExecuteResponse {
  output?: string;
  error?: string;
}

async function executeCode(language: string, code: string): Promise<ExecuteResponse> {
  const response = await fetch(`${API_BASE}/run-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, code }),
  });
  return response.json() as Promise<ExecuteResponse>;
}

/**
 * Runs code on the backend and returns a human-readable output string.
 * Combines stdout and stderr when both are present.
 */
async function runCode(language: string, code: string): Promise<string> {
  try {
    const result = await executeCode(language, code);
    if (result.error) {
      return result.output ? `${result.output}\n${result.error}` : result.error;
    }
    return result.output ?? "";
  } catch {
    return "Execution failed: could not reach the backend.";
  }
}

export default runCode;
