from services.agentic_rag_service.config import MAX_RETRIES
from services.agentic_rag_service.graph.nodes import route_after_grading


def test_retry_guard_allows_the_requested_last_retry():
    # grade_documents_node increments the counter before requesting this retry.
    state = {"should_retry": True, "retry_count": MAX_RETRIES}

    assert route_after_grading(state) == "retry"


def test_retry_guard_generates_after_retry_is_exhausted():
    state = {"should_retry": False, "retry_count": MAX_RETRIES}

    assert route_after_grading(state) == "generate"
