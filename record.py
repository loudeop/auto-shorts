import json, os, sys
from common import ROOT, IST
import datetime as dt
p = os.path.join(ROOT, "state", "history.json")
h = json.load(open(p)) if os.path.exists(p) else []
for vid in sys.argv[1:]:
    m = json.load(open(os.path.join(ROOT, "work", vid, "meta.json")))
    h.append(dict(date=dt.datetime.now(IST).date().isoformat(), format=m["format"], title=m["title"]))
json.dump(h[-300:], open(p, "w"), indent=1)
