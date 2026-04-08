from typing import List, Dict
import io

# Try preferred PdfReader, but allow fallback to pdfminer if available
try:
    from PyPDF2 import PdfReader
except Exception:
    PdfReader = None


def _chunk_text_to_modules(text: str, max_chars=4000) -> List[Dict]:
    modules = []
    if not text:
        return modules
    # naive chunking by characters to create reasonable modules
    i = 0
    idx = 1
    while i < len(text):
        chunk = text[i:i+max_chars]
        title = chunk.strip().splitlines()[0][:60] if chunk.strip() else f"Module {idx}"
        goal = (chunk.strip().split('. ')[0] or 'Introduce this module to the patient.')[:140]
        modules.append({
            'module_id': f'mod_{idx}',
            'name': title,
            'status': 'locked' if idx > 1 else 'pending',
            'clinical_goal': goal
        })
        i += max_chars
        idx += 1
    return modules


def process_pdf_bytes(file_bytes: bytes) -> List[Dict]:
    """Attempt to extract text from PDF and convert into modules.

    Steps:
    - Try PyPDF2 if available to extract per-page text and create modules per page.
    - Otherwise, try pdfminer.six's high-level extractor if available and chunk into modules.
    - If both fail, return a single fallback module indicating extraction was not available.
    """
    modules = []
    # 1) Try PdfReader
    if PdfReader is not None:
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            # Combine page texts; if pages are long, we chunk them later
            full_text = ''
            for page in reader.pages:
                try:
                    full_text += '\n\n' + (page.extract_text() or '')
                except Exception:
                    continue
            full_text = full_text.strip()
            # If there are clear page boundaries and reasonable text, create modules per page
            if full_text:
                # Create modules using chunk helper for stability
                modules = _chunk_text_to_modules(full_text)
                return modules
        except Exception:
            # fall through to other strategies
            pass

    # 2) Try pdfminer.six as a fallback
    try:
        from pdfminer.high_level import extract_text
        try:
            text = extract_text(io.BytesIO(file_bytes)) or ''
            text = text.strip()
            if text:
                modules = _chunk_text_to_modules(text)
                return modules
        except Exception:
            pass
    except Exception:
        # pdfminer not installed
        pass

    # 3) Final fallback: return a single placeholder module
    return [{
        'module_id': 'mod_1',
        'name': 'Imported Curriculum',
        'status': 'pending',
        'clinical_goal': 'Content was not fully extracted; review uploaded file.'
    }]
