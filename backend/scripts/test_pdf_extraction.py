import sys
from pathlib import Path

# Adjust path so backend package imports work when run from scripts dir
ROOT = Path(__file__).resolve().parents[1]
import os
sys.path.insert(0, str(ROOT))

from app.ai_layer import llm_agents, architect


def run_test(pdf_path: Path):
    print(f"Testing PDF extraction for: {pdf_path}")
    if not pdf_path.exists():
        print("File not found.")
        return

    b = pdf_path.read_bytes()

    print("\n-- Using llm_agents._extract_text_from_pdf_bytes --")
    try:
        text = llm_agents._extract_text_from_pdf_bytes(b)
        print(f"Extracted text length: {len(text)} chars")
        print("Sample (first 1000 chars):\n")
        print(text[:1000])
    except Exception as e:
        print(f"llm_agents extraction failed: {e}")

    print("\n-- Using architect.process_pdf_bytes (heuristic) --")
    try:
        modules = architect.process_pdf_bytes(b)
        print(f"Architect produced {len(modules)} modules")
        for i, m in enumerate(modules[:10], start=1):
            print(f"Module {i}: id={m.get('module_id')} name={m.get('name')!r} status={m.get('status')}")
    except Exception as e:
        print(f"architect.process_pdf_bytes failed: {e}")


if __name__ == '__main__':
    default = ROOT / 'app' / 'uploads'
    default_file = None
    if default.exists():
        files = sorted(default.iterdir())
        if files:
            default_file = files[-1]
    path_arg = None
    if len(sys.argv) > 1:
        path_arg = Path(sys.argv[1])
    elif default_file is not None:
        path_arg = default_file
    else:
        print("No PDF provided and no uploads found. Usage: python test_pdf_extraction.py /path/to/file.pdf")
        sys.exit(1)

    run_test(path_arg)

