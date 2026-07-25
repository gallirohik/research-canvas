"""
This is the state definition for the AI.
It defines the state of the agent and the state of the conversation.
"""

from typing import List, Optional, TypedDict
from langgraph.graph import MessagesState


class Resource(TypedDict):
    """
    Represents a resource. Give it a good title and a short description.
    """

    url: str
    title: str
    description: str


class Log(TypedDict):
    """
    Represents a log of an action performed by the agent.
    """

    message: str
    done: bool


class Citation(TypedDict):
    """
    Represents a fact-check result linking a claim in the report to the
    resource(s) that back it (or fail to).
    """

    claim: str
    resource_urls: List[str]
    supported: bool
    note: Optional[str]


class AgentState(MessagesState):
    """
    This is the state of the agent.
    It is a subclass of the MessagesState class from langgraph.
    """

    model: str
    research_question: str
    report: str
    resources: List[Resource]
    logs: List[Log]
    citations: List[Citation]
