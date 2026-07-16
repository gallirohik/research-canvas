import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
  copilotKitEndpoint,
  EmptyAdapter,
} from "@copilotkit/runtime";
import {
  LangGraphHttpAgent,
  LangGraphAgent,
} from "@copilotkit/runtime/langgraph";
import { NextRequest, NextResponse } from "next/server";

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// const llmAdapter = new OpenAIAdapter({ openai } as any);
const llmAdapter = new EmptyAdapter();
const langsmithApiKey = process.env.LANGSMITH_API_KEY as string;

// NOTE: this route is called directly from the browser (see src/app/page.tsx),
// so this key ships in client-side JS and is visible to anyone via devtools.
// It blocks blind bots/scanners hitting the endpoint; it is NOT real access control.
function isAuthorized(req: NextRequest): boolean {
  const apiKey = process.env.NEXT_PUBLIC_COPILOTKIT_API_KEY;
  return Boolean(apiKey) && req.headers.get("x-api-key") === apiKey;
}

// Rejects anything that could redirect this proxy (and its langsmithApiKey) at an
// internal/private host instead of a real LangGraph Cloud deployment.
function isSafeDeploymentUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;

  const hostname = parsed.hostname.toLowerCase();
  const isPrivate =
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    /^169\.254\./.test(hostname);

  return !isPrivate;
}

export const POST = async (req: NextRequest) => {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const requestedDeploymentUrl = searchParams.get("lgcDeploymentUrl");
  if (requestedDeploymentUrl && !isSafeDeploymentUrl(requestedDeploymentUrl)) {
    return NextResponse.json(
      { error: "Invalid lgcDeploymentUrl" },
      { status: 400 },
    );
  }
  const deploymentUrl = requestedDeploymentUrl || process.env.LGC_DEPLOYMENT_URL;

  const baseUrl =
    process.env.REMOTE_ACTION_URL || "http://localhost:8000/copilotkit";

  let runtime = new CopilotRuntime({
    agents: {
      research_agent: new LangGraphHttpAgent({
        url: `${baseUrl}/agents/research_agent`,
      }),
      research_agent_google_genai: new LangGraphHttpAgent({
        url: `${baseUrl}/agents/research_agent_google_genai`,
      }),
    },
  });

  if (deploymentUrl) {
    runtime = new CopilotRuntime({
      agents: {
        research_agent: new LangGraphAgent({
          deploymentUrl,
          langsmithApiKey,
          graphId: "research_agent",
        }),
        research_agent_google_genai: new LangGraphAgent({
          deploymentUrl,
          langsmithApiKey,
          graphId: "research_agent_google_genai",
        }),
      },
    });
  }

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: llmAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
