"""Fails if pipeline/catalog.py and the JavaScript libraries disagree. Run after editing accessories.js or details.js."""
import json, os, re, subprocess, sys
import catalog
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
acc = open(os.path.join(root, "engine/src/accessories.js")).read(); det = open(os.path.join(root, "engine/src/details.js")).read()
defs = re.findall(r"^def\('([a-z_]+)', '([a-z]+)'", acc, re.M)
ok = True
for name, js in [("COSTUME", [i for i, s in defs if s != "hand"]), ("HELD", [i for i, s in defs if s == "hand"]),
                 ("ROLES", re.findall(r"^  ([a-z]+): \{ids:", acc, re.M)), ("DETAILS", re.findall(r"^  ([a-z_]+): \{place:", det, re.M)),
                 ("PIECES", re.findall(r"^  ([a-z_]+)\(c(?:, text)?\) \{", open(os.path.join(root, "engine/src/setpieces.js")).read(), re.M))]:
    if sorted(js) != sorted(getattr(catalog, name)):
        ok = False; print("MISMATCH", name, set(js) ^ set(getattr(catalog, name)))
print("catalog OK" if ok else "catalog out of date"); sys.exit(0 if ok else 1)
