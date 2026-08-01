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
import dns from "node:dns/promises";
import net from "node:net";

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

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;
  if (a === 0) return true; // unspecified / "this network"
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a >= 224) return true; // multicast (224-239) + reserved (240-255)
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true; // loopback / unspecified
  const ipv4Mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (ipv4Mapped) return isPrivateIPv4(ipv4Mapped[1]);
  const firstGroup = normalized.split(":")[0];
  if (/^fe[89ab]/.test(firstGroup)) return true; // fe80::/10 link-local
  if (/^f[cd]/.test(firstGroup)) return true; // fc00::/7 unique local
  if (firstGroup.startsWith("ff")) return true; // multicast
  return false;
}

// Deny-private alone still lets a caller redirect this proxy (and its
// langsmithApiKey) at any public host on the internet. The server already
// knows its one legitimate target (LGC_DEPLOYMENT_URL, also read below for
// the no-param fallback), so require the hostname to match it exactly;
// unset/unparseable means there is no known host to allow.
const allowedDeploymentHost = (() => {
  const configured = process.env.LGC_DEPLOYMENT_URL;
  if (!configured) return null;
  try {
    return new URL(configured).hostname.toLowerCase();
  } catch {
    return null;
  }
})();

// Rejects anything that could redirect this proxy (and its langsmithApiKey) at an
// internal/private host, or at any host other than the configured deployment.
// Resolves DNS (mirroring agents/python/src/lib/download.py's _is_safe_url) so a
// hostname that merely *points* at a private address can't slip past a
// hostname-string check.
async function isSafeDeploymentUrl(value: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local")) return false;
  if (!allowedDeploymentHost || hostname !== allowedDeploymentHost) return false;

  let addresses: string[];
  try {
    addresses = (
      await dns.lookup(hostname, { all: true, verbatim: true })
    ).map((r) => r.address);
  } catch {
    return false;
  }
  if (addresses.length === 0) return false;

  return addresses.every((addr) =>
    net.isIPv4(addr) ? !isPrivateIPv4(addr) : !isPrivateIPv6(addr),
  );
}

export const POST = async (req: NextRequest) => {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const requestedDeploymentUrl = searchParams.get("lgcDeploymentUrl");
  if (
    requestedDeploymentUrl &&
    !(await isSafeDeploymentUrl(requestedDeploymentUrl))
  ) {
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
