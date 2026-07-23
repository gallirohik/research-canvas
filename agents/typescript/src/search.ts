/**
 * Search Node
 */

/**
 * The search node is responsible for searching the internet for information.
 */

import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { tavily } from "@tavily/core";
import { AgentState } from "./state";
import { RunnableConfig } from "@langchain/core/runnables";
import {
  AIMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { getModel } from "./model";
import {
  copilotkitCustomizeConfig,
  copilotkitEmitState,
} from "@copilotkit/sdk-js/langgraph";

const ResourceInput = z.object({
  url: z.string().describe("The URL of the resource"),
  title: z.string().describe("The title of the resource"),
  description: z.string().describe("A short description of the resource"),
});

const ExtractResources = tool(() => {}, {
  name: "ExtractResources",
  description: "Extract the 3-5 most relevant resources from a search result.",
  schema: z.object({ resources: z.array(ResourceInput) }),
});

const tavilyClient = tavily({
  apiKey: process.env.TAVILY_API_KEY,
});

export async function search_node(state: AgentState, config: RunnableConfig) {
  const aiMessage = state["messages"][
    state["messages"].length - 1
  ] as AIMessage;

  let resources = state["resources"] || [];
  let logs = state["logs"] || [];

  // Guard 1: the incoming ai_message (the Search tool call from chat_node) may have
  // no tool_calls. Indexing tool_calls![0] would throw at runtime. Nothing to search,
  // and — since there is no tool_call here — nothing to resolve in the message history
  // (mirrors the Python guard 1). Log, emit, and return early with no new messages.
  if (!aiMessage.tool_calls?.length) {
    logs.push({
      message: "No search queries provided; skipping search.",
      done: true,
    });
    const { messages: _messages, ...restOfStateForGuard } = state;
    await copilotkitEmitState(config, {
      ...restOfStateForGuard,
      logs,
      resources,
    });
    return { messages: [], resources, logs };
  }

  const queries = aiMessage.tool_calls![0]["args"]["queries"];

  for (const query of queries) {
    logs.push({
      message: `Search for ${query}`,
      done: false,
    });
  }
  const { messages, ...restOfState } = state;
  await copilotkitEmitState(config, {
    ...restOfState,
    logs,
    resources,
  });

  const search_results = [];

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const response = await tavilyClient.search(query, {});
    search_results.push(response);
    logs[i]["done"] = true;
    await copilotkitEmitState(config, {
      ...restOfState,
      logs,
      resources,
    });
  }

  const searchResultsToolMessageFull = new ToolMessage({
    tool_call_id: aiMessage.tool_calls![0]["id"]!,
    content: `Performed search: ${JSON.stringify(search_results)}`,
    name: "Search",
  });

  const searchResultsToolMessage = new ToolMessage({
    tool_call_id: aiMessage.tool_calls![0]["id"]!,
    content: `Performed search.`,
    name: "Search",
  });

  const customConfig = copilotkitCustomizeConfig(config, {
    emitIntermediateState: [
      {
        stateKey: "resources",
        tool: "ExtractResources",
        toolArgument: "resources",
      },
    ],
  });

  const model = getModel(state);
  const invokeArgs: Record<string, any> = {};
  if (model.constructor.name === "ChatOpenAI") {
    invokeArgs["parallel_tool_calls"] = false;
  }

  logs = [];

  await copilotkitEmitState(config, {
    ...restOfState,
    resources,
    logs,
  });

  const response = await model.bindTools!([ExtractResources], {
    ...invokeArgs,
    tool_choice: "ExtractResources",
  }).invoke(
    [
      new SystemMessage({
        content: `You need to extract the 3-5 most relevant resources from the following search results.`,
      }),
      ...state["messages"],
      searchResultsToolMessageFull,
    ],
    customConfig,
  );

  const aiMessageResponse = response as AIMessage;

  // Guard 2: the forced ExtractResources extraction may come back with no tool_calls.
  // Indexing tool_calls![0] would throw at runtime. Skip the resources.push and the
  // happy-path returns — BUT the original Search tool_call (aiMessage.tool_calls[0].id,
  // proven non-empty by guard 1 above) is normally resolved by searchResultsToolMessage
  // on the happy path. If we return without appending a ToolMessage that resolves it,
  // the AIMessage's tool_call is left dangling, and the next chat_node re-invoke
  // (search_node -> download -> chat_node) 400s the provider ("tool_calls must be
  // followed by tool result messages"). This mirrors the Python search-guard-py fix:
  // its first pass FAILED prism for exactly this dangling-tool_call bug.
  if (!aiMessageResponse.tool_calls?.length) {
    logs.push({
      message: "No resources extracted from search results.",
      done: true,
    });
    await copilotkitEmitState(config, {
      ...restOfState,
      resources,
      logs,
    });
    return {
      messages: [
        new ToolMessage({
          tool_call_id: aiMessage.tool_calls![0]["id"]!,
          content: `No resources extracted from search results.`,
          name: "Search",
        }),
      ],
      resources,
      logs,
    };
  }

  const newResources = aiMessageResponse.tool_calls![0]["args"]["resources"];

  resources.push(...newResources);

  return {
    messages: [
      searchResultsToolMessage,
      aiMessageResponse,
      new ToolMessage({
        tool_call_id: aiMessageResponse.tool_calls![0]["id"]!,
        content: `Resources added.`,
        name: "ExtractResources",
      }),
    ],
    resources,
    logs,
  };
}
