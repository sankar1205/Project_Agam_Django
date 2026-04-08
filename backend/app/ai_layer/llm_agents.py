import os
import io
import json
from typing import List, Dict
import importlib
from dotenv import load_dotenv

# Explicitly load environment variables so GROQ_API_KEY is found by the background worker
load_dotenv()

# optional PyPDF2
try:
    from PyPDF2 import PdfReader
except Exception:
    PdfReader = None

from langchain_groq import ChatGroq

# FIX: Correctly pull the model name, NOT the API key!
GROQ_MODEL = os.getenv('GROQ_MODEL', 'llama-3.1-8b-instant')

# Tunables
MAX_DOC_CHARS = 120_000
CHUNK_SIZE = 4000
MAX_RETRIES = 2
MAX_CHUNKS_TO_SEND = 20  # safety cap for chunks sent to LLM


def _extract_text_from_pdf_bytes(file_bytes: bytes) -> str:
    """Try multiple PDF extraction methods and return consolidated text (truncated to MAX_DOC_CHARS).

    Priority:
    1) PyPDF2 / pypdf PdfReader
    2) pdfminer.six extract_text
    If both fail or produce empty results, return empty string.
    """
    text = ''

    # 1) Try PyPDF2 / pypdf PdfReader
    if PdfReader is not None:
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            pages = []
            # Some PdfReader implementations expose .pages; guard for attribute differences
            for p in getattr(reader, 'pages', []) or []:
                try:
                    pages.append(p.extract_text() or '')
                except Exception:
                    try:
                        # Some page objects implement get_text()
                        pages.append(p.get_text() or '')
                    except Exception:
                        pages.append('')
            text = "\n\n".join(pages).strip()
        except Exception:
            text = ''

    # 2) If PyPDF2 gave little or no text, try pdfminer.six
    if not text or len(text) < 50:
        try:
            from pdfminer.high_level import extract_text
            try:
                extracted = extract_text(io.BytesIO(file_bytes)) or ''
                if extracted and len(extracted) > len(text):
                    text = extracted.strip()
            except Exception:
                # ignore and keep prior text value
                pass
        except Exception:
            # pdfminer not available
            pass

    # Final truncation to reasonable size for downstream processing
    if text and len(text) > MAX_DOC_CHARS:
        text = text[:MAX_DOC_CHARS]

    return text


def _chunk_text(text: str, size: int = CHUNK_SIZE) -> List[str]:
    if not text:
        return []
    return [text[i:i + size] for i in range(0, len(text), size)]


def _call_chat_completion(messages: List[dict], model: str = GROQ_MODEL, temperature: float = 0.0) -> str:
    """Call Groq via langchain_groq.ChatGroq."""

    if not os.getenv("GROQ_API_KEY"):
        print("\n[CRITICAL ERROR] GROQ_API_KEY is missing from your .env file!\n")

    HumanMsgCls = None
    SystemMsgCls = None
    AssistantMsgCls = None
    try:
        mod = importlib.import_module('langchain.schema')
        HumanMsgCls = getattr(mod, 'HumanMessage')
        SystemMsgCls = getattr(mod, 'SystemMessage')
        AssistantMsgCls = getattr(mod, 'AIMessage', None) or getattr(mod, 'AssistantMessage', None)
    except Exception:
        try:
            mod = importlib.import_module('langchain_core.messages')
            HumanMsgCls = getattr(mod, 'HumanMessage')
            SystemMsgCls = getattr(mod, 'SystemMessage')
            AssistantMsgCls = getattr(mod, 'AIMessage', None) or getattr(mod, 'AssistantMessage', None)
        except Exception:
            from dataclasses import dataclass

            @dataclass
            class HumanMsgCls:
                content: str

                def __repr__(self): return f"HumanMessage(content={self.content!r})"

            @dataclass
            class SystemMsgCls:
                content: str

                def __repr__(self): return f"SystemMessage(content={self.content!r})"

            @dataclass
            class AssistantMsgCls:
                content: str

                def __repr__(self): return f"AssistantMessage(content={self.content!r})"

    msg_objs = []
    for m in messages:
        role = (m.get('role') or '').lower()
        content = m.get('content') or ''
        if role == 'system':
            msg_objs.append(SystemMsgCls(content=content))
        elif role in ('user', 'human'):
            msg_objs.append(HumanMsgCls(content=content))
        else:
            msg_objs.append(AssistantMsgCls(content=content))

    try:
        llm = ChatGroq(model=model, temperature=temperature)
        resp = llm.invoke(msg_objs)
        content = getattr(resp, 'content', None)
        if content is None:
            try:
                text = str(resp)
            except Exception:
                text = ''
            return (text or '').strip()
        return str(content).strip()
    except Exception as e:
        print(f"[Groq API Error] {e}")
        try:
            import traceback
            traceback.print_exc()
        except Exception:
            pass
        return ''


def process_pdf_bytes_llm(file_bytes: bytes) -> List[Dict]:
    try:
        from . import architect as heuristic_architect
    except Exception:
        heuristic_architect = None

    try:
        text = _extract_text_from_pdf_bytes(file_bytes)
    except Exception as e:
        print(f"[PDF Extraction Error] {e}")
        if heuristic_architect:
            return heuristic_architect.process_pdf_bytes(file_bytes)
        return []

    if not text:
        if heuristic_architect:
            return heuristic_architect.process_pdf_bytes(file_bytes)
        return []

    chunks = _chunk_text(text)
    system = {
        'role': 'system',
        'content': (
            'You are a clinical curriculum architect. Given the content of an uploaded curriculum, '
            'produce a JSON array of modules describing a sequential treatment plan. Each module must be an object '
            "with keys: module_id (string), name (short title), clinical_goal (1-2 sentence summary), "
            "estimated_minutes (integer), prerequisites (array of module_id strings, can be empty). "
            "Return only valid JSON (no surrounding text). Keep number of modules reasonable (4-20)."
        )
    }

    # Send up to a reasonable number of chunks to the model rather than only the first few.
    max_chunks = min(len(chunks), MAX_CHUNKS_TO_SEND)
    combined = "\n\n---\n\n".join(chunks[:max_chunks])

    user = {
        'role': 'user',
        'content': (
            'Document excerpt (truncated if large):\n\n'
            f"{combined}\n\n"
            'Instructions: produce the JSON array as described. If content implies sections/chapters, convert them into modules. '
            'Ensure module_id values are short unique identifiers (e.g., mod_1, mod_2).'
        )
    }

    try:
        raw = _call_chat_completion([system, user])
        if not raw or not raw.strip():
            raise ValueError('Empty LLM response')

        try:
            modules = json.loads(raw)
        except Exception:
            import re
            m = re.search(r"\[\s*\{.*\}\s*\]", raw, flags=re.S)
            if m:
                modules = json.loads(m.group(0))
            else:
                raise

        normalized = []
        for i, m in enumerate(modules, start=1):
            mid = m.get('module_id') or f'mod_{i}'
            name = m.get('name') or m.get('title') or f'Module {i}'
            clinical_goal = (m.get('clinical_goal') or m.get('summary') or '')[:300]
            est = int(m.get('estimated_minutes') or 10)
            prereqs = m.get('prerequisites') or []
            normalized.append({
                'module_id': mid,
                'name': name,
                'clinical_goal': clinical_goal,
                'estimated_minutes': est,
                'prerequisites': prereqs,
                'status': 'locked'
            })
        if normalized:
            normalized[0]['status'] = 'pending'
        return normalized
    except Exception as e:
        print(f"[Architect Structuring Error] {e}")
        if heuristic_architect:
            return heuristic_architect.process_pdf_bytes(file_bytes)
        return []


def evaluate_and_maybe_introduce_llm(patient: Dict) -> Dict:
    try:
        plan = patient.get('treatment_plan', [])
        active_id = patient.get('active_module_id')
        therapist_tone = patient.get('therapist_tone', '')
        pending_checkin = patient.get('pending_checkin', '')
        short_plan = [
            {'module_id': m.get('module_id'), 'name': m.get('name'), 'status': m.get('status'),
             'clinical_goal': (m.get('clinical_goal') or '')[:220]}
            for m in plan
        ]

        system = {
            'role': 'system',
            'content': (
                'You are a clinical evaluator agent. Given the patient state and a sequential treatment plan, decide whether to introduce '
                "the next module to the patient now. Consider patient's pending_checkin and therapist_tone. Respond with a strict JSON object "
                "with keys: introduce_module_id (string or null), system_message (string or null), reason (short string). "
                "Do not output any other text."
            )
        }
        user = {
            'role': 'user',
            'content': json.dumps({
                'patient_name': patient.get('name'),
                'therapist_tone': therapist_tone,
                'pending_checkin': pending_checkin,
                'active_module_id': active_id,
                'treatment_plan_preview': short_plan,
                'recent_history_sample': [(h.get('role') if isinstance(h, dict) else getattr(h, 'content', str(h))) for
                                          h in (patient.get('history') or [])][-6:]
            }, default=str)
        }
        raw = _call_chat_completion([system, user])
        if not raw or not raw.strip():
            raise ValueError('Empty LLM response')

        try:
            action = json.loads(raw)
        except Exception:
            import re
            m = re.search(r"\{.*\}", raw, flags=re.S)
            if m:
                action = json.loads(m.group(0))
            else:
                raise
        return {'introduce_module_id': action.get('introduce_module_id'),
                'system_message': action.get('system_message'), 'reason': action.get('reason')}
    except Exception:
        return {}


def architect_and_introduce_background(file_bytes: bytes, patient: Dict) -> None:
    print("[LLM Agent] Reading PDF and structuring JSON. This takes 5-15 seconds...")
    try:
        plan = process_pdf_bytes_llm(file_bytes)
        if plan:
            patient['treatment_plan'] = plan
            print(f"[LLM Agent] Generated {len(plan)} modules.")
        else:
            print("[LLM Agent] Warning: Groq returned an empty plan.")
    except Exception as e:
        print(f"[LLM Agent] Error parsing PDF: {e}")
        try:
            patient.setdefault('history', []).append(
                {'role': 'system', 'content': 'Architect LLM failed to process PDF.'})
        except Exception:
            pass

    print("[LLM Agent] Running Evaluator to introduce first module...")
    try:
        action = evaluate_and_maybe_introduce_llm(patient)
        mid = action.get('introduce_module_id')
        if mid:
            for m in patient.get('treatment_plan', []):
                if m.get('module_id') == mid:
                    m['status'] = 'pending'
                    patient['active_module_id'] = mid
                    print(f"[LLM Agent] Activated Module: {m.get('name')}")
                elif m.get('status') == 'pending' and m.get('module_id') != mid:
                    m['status'] = 'locked'
            sys_msg = action.get('system_message')
            if sys_msg:
                patient.setdefault('history', []).append({'role': 'system', 'content': sys_msg})
    except Exception as e:
        print(f"[LLM Agent] Evaluator failed: {e}")