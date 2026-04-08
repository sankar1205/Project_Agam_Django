from typing import Dict, Any
from dataclasses import dataclass


@dataclass
class SystemMessage:
    content: str

    def __repr__(self):
        return f"SystemMessage(content={self.content!r})"


def evaluate_and_maybe_introduce(patient: Dict[str, Any]) -> None:
    """Examine patient's treatment_plan and activate the next module if no active_worksheet_context."""
    plan = patient.get('treatment_plan') or []
    if not plan:
        return
    if patient.get('active_worksheet_context'):
        return

    # Find first non-completed module
    for mod in plan:
        if mod.get('status') != 'completed':
            mod['status'] = 'pending'
            # FIX: Ensure the LLM receives the actual content/goal of the module, not just the name
            patient['active_worksheet_context'] = f"{mod.get('name')}: {mod.get('clinical_goal')}"
            patient['active_module_id'] = mod.get('module_id')

            # append intro system message so patient sees the module has been activated
            intro = SystemMessage(content=f"New module activated: {mod.get('name')}. Goal: {mod.get('clinical_goal')}")
            hist = patient.get('history')
            if isinstance(hist, list):
                hist.append(intro)
            return
    return


def advance_to_next(patient: Dict[str, Any]) -> None:
    """Mark current active module as completed and activate the next one if available."""
    plan = patient.get('treatment_plan') or []
    active_id = patient.get('active_module_id')
    if active_id:
        # mark it completed
        for mod in plan:
            if mod.get('module_id') == active_id:
                mod['status'] = 'completed'
                break
        # clear active flags
        patient['active_module_id'] = None
        patient['active_worksheet_context'] = None
    # Try to introduce next
    evaluate_and_maybe_introduce(patient)


def evaluate_after_ai_turn(patient: Dict[str, Any], ai_text: str) -> None:
    """Heuristic: if the AI's response indicates the module is complete, advance the plan."""
    if not ai_text:
        return
    low = ai_text.lower()
    complete_triggers = ['module complete', 'module completed', 'you have completed', 'you have finished',
                         'congratulations', 'well done', 'exercise complete', 'exercise completed', 'great job']
    # explicit token
    if 'module_complete' in low or 'module complete' in low:
        advance_to_next(patient)
        # append system confirmation
        hist = patient.get('history')
        if isinstance(hist, list):
            hist.append(
                SystemMessage(content='The module was marked complete and the next one (if any) was activated.'))
        return

    for trig in complete_triggers:
        if trig in low:
            advance_to_next(patient)
            hist = patient.get('history')
            if isinstance(hist, list):
                hist.append(
                    SystemMessage(content='The module was marked complete and the next one (if any) was activated.'))
            return
    return