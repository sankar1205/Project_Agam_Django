import sys
from pathlib import Path
# Ensure backend package directory is on sys.path regardless of current working dir
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from importlib import reload
import app.main as main
app = main.app
routes = sorted([(r.path, sorted(list(r.methods))) for r in app.routes], key=lambda x: x[0])
for p, m in routes:
    print(p, m)
