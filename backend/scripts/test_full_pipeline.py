import sys
import time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
UPLOADS = ROOT / 'app' / 'uploads'

API_BASE = 'http://127.0.0.1:8000/api/v1'


def upload_and_poll(pdf_path: Path, patient_id: int = 1, timeout: int = 60):
    if not pdf_path.exists():
        print(f"File not found: {pdf_path}")
        return 1

    print(f"Uploading {pdf_path} to patient {patient_id}...")
    with open(pdf_path, 'rb') as f:
        files = {'file': (pdf_path.name, f, 'application/pdf')}
        r = requests.post(f"{API_BASE}/therapist/upload-pdf/{patient_id}", files=files)
    print(f"Upload response: {r.status_code} {r.text}")
    if r.status_code != 200:
        return 1

    deadline = time.time() + timeout
    print("Polling patient state until treatment_plan is populated (timeout {}s)...".format(timeout))
    while time.time() < deadline:
        try:
            s = requests.get(f"{API_BASE}/patient/state/{patient_id}")
            if s.status_code != 200:
                print("Failed to fetch state:", s.status_code, s.text)
                time.sleep(2)
                continue
            j = s.json()
            plan = j.get('treatment_plan', [])
            print(f"Current plan length: {len(plan)}")
            if plan:
                print("Treatment plan received:")
                for i, m in enumerate(plan, start=1):
                    print(f" {i}. {m.get('module_id')} - {m.get('name')} ({m.get('status')})")
                return 0
        except Exception as e:
            print("Error polling state:", e)
        time.sleep(3)

    print("Timed out waiting for treatment_plan to be populated.")
    return 2


if __name__ == '__main__':
    file_arg = None
    if len(sys.argv) > 1:
        file_arg = Path(sys.argv[1])
    else:
        # pick latest upload if available
        if UPLOADS.exists():
            files = sorted(UPLOADS.iterdir())
            if files:
                file_arg = files[-1]
    if not file_arg:
        print("Usage: python test_full_pipeline.py /path/to/file.pdf")
        sys.exit(1)

    rc = upload_and_poll(file_arg)
    sys.exit(rc)

