"""Free-tier LLM chain: Google AI Studio -> OpenRouter -> NVIDIA Build -> Cloudflare Workers AI.
Model names are read from env so you can change them when free models rotate."""
import json, os, re, time, requests

T = 180


class QuotaError(RuntimeError):
    """Every request was refused because the free quota is used up (retrying only wastes more of it)."""


# tried in order until one works; set GEMINI_MODEL to force a single model, GROUNDING=0 to skip Google Search grounding
GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3-flash-preview", "gemini-2.5-flash-lite", "gemini-2.5-flash"]
GEMINI_TIMEOUT = 120


def _gemini(prompt):
    key = os.environ["GEMINI_API_KEY"]
    models = [os.environ["GEMINI_MODEL"]] if os.environ.get("GEMINI_MODEL") else GEMINI_MODELS
    base = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.8}}
    bodies = [base] if os.environ.get("GROUNDING") == "0" else [{**base, "tools": [{"google_search": {}}]}, base]
    outcomes = []                                    # one entry per request: HTTP status or the exception name
    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        gone = False
        for body in bodies:                          # grounded first, then plain
            for attempt in range(2):
                try:
                    r = requests.post(url, params={"key": key}, json=body, timeout=GEMINI_TIMEOUT)
                except requests.RequestException as e:   # timeout / connection problem: skip this request, never the whole provider
                    print(f"[llm] {model}: {type(e).__name__}"); outcomes.append(type(e).__name__); break
                if r.ok:
                    print(f"[llm] gemini model {model}")
                    return "".join(p.get("text", "") for p in r.json()["candidates"][0]["content"]["parts"])
                print(f"[llm] {model}: HTTP {r.status_code} {r.text[:300]}"); outcomes.append(r.status_code)
                if r.status_code in (500, 502, 503, 504) and attempt == 0:
                    time.sleep(8); continue          # overloaded: one more try
                if r.status_code == 404: gone = True
                break
            if gone: break                           # unknown model -> next model
    if outcomes and all(o == 429 for o in outcomes):
        raise QuotaError("Gemini free quota is used up (HTTP 429 on every model).")
    raise RuntimeError("Gemini failed: " + ", ".join(str(o) for o in outcomes[-6:]))


def _openai_style(url, key, model, prompt, extra_headers=None):
    r = requests.post(url, headers={"Authorization": f"Bearer {key}", **(extra_headers or {})}, timeout=T,
                      json={"model": model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.8})
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def _openrouter(prompt):
    return _openai_style("https://openrouter.ai/api/v1/chat/completions", os.environ["OPENROUTER_API_KEY"],
                         os.environ.get("OPENROUTER_MODEL", "openrouter/free"), prompt, {"X-Title": "auto-shorts"})


def _nvidia(prompt):
    return _openai_style("https://integrate.api.nvidia.com/v1/chat/completions", os.environ["NVIDIA_API_KEY"],
                         os.environ.get("NVIDIA_MODEL", "meta/llama-3.3-70b-instruct"), prompt)


def _cloudflare(prompt):
    acc, tok = os.environ["CF_ACCOUNT_ID"], os.environ["CF_API_TOKEN"]
    model = os.environ.get("CF_MODEL", "@cf/meta/llama-3.3-70b-instruct-fp8-fast")
    r = requests.post(f"https://api.cloudflare.com/client/v4/accounts/{acc}/ai/run/{model}",
                      headers={"Authorization": f"Bearer {tok}"}, json={"messages": [{"role": "user", "content": prompt}], "max_tokens": 6000}, timeout=T)
    r.raise_for_status()
    return r.json()["result"]["response"]


PROVIDERS = [("GEMINI_API_KEY", "gemini", _gemini), ("OPENROUTER_API_KEY", "openrouter", _openrouter),
             ("NVIDIA_API_KEY", "nvidia", _nvidia), ("CF_API_TOKEN", "cloudflare", _cloudflare)]


def extract_json(text):
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    a, b = text.find("{"), text.rfind("}")
    return json.loads(text[a:b + 1])


def generate_json(prompt, log=print, prefer=None, only=None):
    """prefer: provider names to try first; only: restrict to these providers (e.g. keep Gemini's quota for scripts)."""
    order = list(PROVIDERS)
    if prefer:
        order.sort(key=lambda p: prefer.index(p[1]) if p[1] in prefer else len(prefer))
    if only:
        order = [p for p in order if p[1] in only]
    errors, quota = [], []
    for env, name, fn in order:
        if not os.environ.get(env):
            continue
        try:
            out = extract_json(fn(prompt))
            log(f"[llm] {name} ok")
            return out
        except QuotaError as e:
            quota.append(name); errors.append(f"{name}: {e}"); log(f"[llm] {name} quota: {e}")
        except Exception as e:  # try the next provider
            errors.append(f"{name}: {e}"); log(f"[llm] {name} failed: {e}")
    if not errors:
        raise RuntimeError("No LLM API key is set.")
    if len(quota) == len(errors):
        raise QuotaError("All providers are out of free quota. " + " | ".join(errors))
    raise RuntimeError("No LLM provider worked. " + " | ".join(errors))
