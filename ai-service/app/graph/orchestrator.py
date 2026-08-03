from langgraph.graph import StateGraph, END
from app.graph.state import AgentState
from app.graph.nodes.agents import (
    redaction_node, 
    summarization_node, 
    clinical_research_node,
    diagnostics_node, 
    coding_research_node,
    coding_node, 
    pathway_node, 
    unmasking_node
)

def build_clinical_graph():
    graph = StateGraph(AgentState)
    
    graph.add_node("redact", redaction_node)
    graph.add_node("summarize", summarization_node)
    graph.add_node("clinical_research", clinical_research_node)
    graph.add_node("diagnose", diagnostics_node)
    graph.add_node("coding_research", coding_research_node)
    graph.add_node("code", coding_node)
    graph.add_node("recommend_pathway", pathway_node)
    graph.add_node("unmask", unmasking_node)
    
    graph.set_entry_point("redact")
    graph.add_edge("redact", "summarize")
    graph.add_edge("summarize", "clinical_research")
    graph.add_edge("clinical_research", "diagnose")
    graph.add_edge("diagnose", "coding_research")
    graph.add_edge("coding_research", "code")
    graph.add_edge("code", "recommend_pathway")
    graph.add_edge("recommend_pathway", "unmask")
    graph.add_edge("unmask", END)
    
    return graph.compile()

clinical_workflow = build_clinical_graph()
