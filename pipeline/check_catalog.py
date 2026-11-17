"""Fails if pipeline/catalog.py is out of date with the JavaScript libraries. Fix with: python pipeline/gen_catalog.py"""
import sys
import catalog, gen_catalog
bad = [k for k, v in gen_catalog.build().items() if sorted(v) != sorted(getattr(catalog, k, []))]
print("catalog OK" if not bad else f"catalog out of date: {bad} (run python pipeline/gen_catalog.py)")
sys.exit(1 if bad else 0)
