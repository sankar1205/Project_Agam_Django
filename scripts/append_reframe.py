"""Append the /journal/graph LLM endpoint to routes_chat.py"""
import pathlib

routes_path = pathlib.Path('backend/app/api/routes_chat.py')
content = routes_path.read_text(encoding='utf-8')

if '/journal/graph' in content:
    print('Already added, skipping.')
else:
    addition = r'''

# --- LLM Insight Graph ---

class GraphRequest(BaseModel):
    text: str
    predictions: List[dict]   # [{text, prediction}]

@router.post("/journal/graph")
def generate_graph(request: GraphRequest):
    """
    Ask Groq to analyse the journal entry and return a cause-effect insight graph:
    typed nodes (belief / thought / emotion / behavior) with labeled directed edges
    and a one-sentence overall insight.
    """
    from ..ai_layer.llm_agents import _call_chat_completion
    import json, re

    distorted = [p for p in request.predictions if p.get("prediction", "").lower() not in
                 ("no distortion", "none", "neutral", "")]

    if not distorted:
        return {
            "nodes": [{"id": "n0", "label": "No patterns detected", "type": "thought", "layer": 1}],
            "edges": [],
            "insight": "This entry looks balanced — no strong thought patterns were detected."
        }

    sentences_block = "\n".join(
        f'- "{p["text"]}" [{p["prediction"]}]' for p in distorted
    )

    system_prompt = (
        "You are a cognitive-behavioral therapist analysing a patient's journal entry. "
        "Given a set of sentences and their associated cognitive patterns, produce a cause-effect insight graph "
        "that shows HOW these thoughts connect to each other and to emotions or behaviours.\n\n"
        "Output valid JSON with exactly these keys:\n"
        "{\n"
        '  "nodes": [ { "id": "n1", "label": "short label (max 6 words)", "type": "belief|thought|emotion|behavior", "layer": 0|1|2|3 } ],\n'
        '  "edges": [ { "source": "n1", "target": "n2", "label": "short verb phrase (max 4 words)" } ],\n'
        '  "insight": "One warm, plain-English sentence summarising the overall pattern"\n'
        "}\n\n"
        "Layer meanings:\n"
        "  0 = Core beliefs or underlying assumptions (root causes)\n"
        "  1 = Distorted thoughts / self-talk\n"
        "  2 = Emotional responses\n"
        "  3 = Behaviours or consequences\n\n"
        "Rules:\n"
        "- 3 to 8 nodes total. Do not include every sentence as its own node — cluster similar ones.\n"
        "- Each edge must have a short, human-readable label (e.g. 'triggers', 'leads to', 'reinforces', 'stems from').\n"
        "- Edges should reflect REAL causal or reinforcing relationships, not just sequence.\n"
        "- Include at least one cycle-closing or reinforcing edge where clinically appropriate.\n"
        "- The insight must be non-clinical, warm and first-person friendly (e.g. 'Your thoughts seem to form a loop...').\n"
        "- Return ONLY valid JSON. No markdown. No explanation."
    )

    user_msg = (
        f"Journal entry: \"{request.text}\"\n\n"
        f"Distorted sentences detected:\n{sentences_block}\n\n"
        "Produce the JSON insight graph."
    )

    raw = _call_chat_completion(
        [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_msg}],
        temperature=0.4
    )

    # Extract JSON from response
    try:
        graph = json.loads(raw)
    except Exception:
        m = re.search(r'\{.*\}', raw, re.S)
        if m:
            try:
                graph = json.loads(m.group(0))
            except Exception:
                graph = None
        else:
            graph = None

    if not graph or "nodes" not in graph:
        # Fallback: simple linear graph from predictions
        nodes = []
        for i, p in enumerate(distorted[:5]):
            nodes.append({"id": f"n{i}", "label": p["text"][:40], "type": "thought", "layer": 1})
        edges = [{"source": f"n{i}", "target": f"n{i+1}", "label": "connects to"} for i in range(len(nodes)-1)]
        graph = {"nodes": nodes, "edges": edges,
                 "insight": "These thoughts appear to be interconnected and may reinforce each other."}

    return graph
'''
    routes_path.write_text(content.rstrip() + '\n' + addition, encoding='utf-8')
    print('Done - /journal/graph endpoint added.')
