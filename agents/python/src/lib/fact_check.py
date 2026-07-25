"""
The fact-check node verifies each claim in the report against the fetched
resource content and records the results in state["citations"].
"""

from typing import List, cast

from copilotkit.langgraph import copilotkit_emit_state
from langchain.tools import tool
from langchain_core.messages import AIMessage, SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from pydantic import BaseModel, Field

from src.lib.download import get_resource
from src.lib.model import get_model
from src.lib.state import AgentState


class ClaimCheckInput(BaseModel):
    """A single fact-checked claim from the report."""

    claim: str = Field(
        description="A specific factual claim made in the report."
    )
    resource_urls: List[str] = Field(
        description=(
            "The URLs of the resources whose content actually backs this claim. "
            "Empty when no resource supports the claim."
        )
    )
    supported: bool = Field(
        description=(
            "True only if the content of at least one resource actually backs "
            "the claim. False if no resource content supports it."
        )
    )
    note: str = Field(
        default="",
        description="A short explanation of why the claim is or is not supported.",
    )


@tool
def ExtractClaimChecks(claims: List[ClaimCheckInput]):  # pylint: disable=invalid-name,unused-argument
    """Extract a fact-check result for every claim in the report."""


async def fact_check_node(state: AgentState, config: RunnableConfig):
    """
    The fact-check node checks each claim in the report against the fetched
    resource content and writes the results to state["citations"].
    """

    ai_message = cast(AIMessage, state["messages"][-1])

    state["logs"] = state.get("logs", [])
    state["citations"] = state.get("citations", [])

    report = state.get("report", "")

    # Nothing to check — resolve the tool call and return without an LLM call.
    if not report.strip():
        state["messages"].append(
            ToolMessage(
                tool_call_id=ai_message.tool_calls[0]["id"],
                content="There is no report to fact-check yet.",
            )
        )
        return state

    logs_offset = len(state["logs"])
    state["logs"].append(
        {"message": "Fact-checking the report against sources", "done": False}
    )
    await copilotkit_emit_state(config, state)

    # Load the cached content for each resource, skipping empty/errored ones.
    resources_with_content = []
    for resource in state.get("resources", []):
        content = get_resource(resource["url"])
        if content in ("", "ERROR"):
            continue
        resources_with_content.append({**resource, "content": content})

    model = get_model(state)
    ainvoke_kwargs = {}
    if model.__class__.__name__ in ["ChatOpenAI"]:
        ainvoke_kwargs["parallel_tool_calls"] = False

    response = await model.bind_tools(
        [ExtractClaimChecks], tool_choice="ExtractClaimChecks", **ainvoke_kwargs
    ).ainvoke(
        [
            SystemMessage(
                content=f"""
            You are a fact-checker. Check EVERY factual claim made in the research
            report against the content of the available resources.

            A claim is supported ONLY if the content of at least one resource actually
            backs it. When a claim is supported, list the URLs of the backing resources
            in resource_urls and set supported=true. When nothing in the resources backs
            a claim, set supported=false and leave resource_urls empty. Add a short note
            explaining each verdict.

            This is the research report to fact-check:
            {report}

            Here are the resources (with their fetched content) available to you:
            {resources_with_content}
            """
            ),
            *state["messages"],
            ToolMessage(
                tool_call_id=ai_message.tool_calls[0]["id"],
                content="Fact-checking the report against the resources.",
            ),
        ],
        config,
    )

    state["logs"][logs_offset]["done"] = True
    await copilotkit_emit_state(config, state)

    ai_message_response = cast(AIMessage, response)

    if not ai_message_response.tool_calls:
        state["messages"].append(
            ToolMessage(
                tool_call_id=ai_message.tool_calls[0]["id"],
                content="Fact-check produced no results.",
            )
        )
        return state

    claims = ai_message_response.tool_calls[0]["args"]["claims"]

    state["citations"] = claims

    state["messages"].append(
        ToolMessage(
            tool_call_id=ai_message.tool_calls[0]["id"],
            content=f"Fact-check complete: {len(claims)} claim(s) checked.",
        )
    )

    return state
