export type Resource = {
  url: string;
  title: string;
  description: string;
};

export interface Citation {
  claim: string;
  resource_urls: string[];
  supported: boolean;
  note?: string | null;
}

export type Log = {
  message: string;
  done: boolean;
};

export type AgentState = {
  model: string;
  research_question: string;
  report: string;
  resources: Resource[];
  logs: Log[];
  citations: Citation[];
};

// Single source of truth for a freshly-seeded AgentState. `model` is only known
// at render time (via useModelSelectorContext), so this is a factory rather than
// a static constant. Both useCoAgent hooks (Main.tsx, ResearchCanvas.tsx) must
// seed the SAME shape or the shared coagent state becomes mount-order dependent.
export function createInitialAgentState(model: string): AgentState {
  return {
    model,
    research_question: "",
    report: "",
    resources: [],
    logs: [],
    citations: [],
  };
}
