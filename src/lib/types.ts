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

export type AgentState = {
  model: string;
  research_question: string;
  report: string;
  resources: any[];
  logs: any[];
  citations: Citation[];
};
