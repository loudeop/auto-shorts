"""Free-tier LLM chain: Google AI Studio -> OpenRouter -> NVIDIA Build -> Cloudflare Workers AI.
Model names are read from env so you can change them when free models rotate."""
import json, os, re, requests

T = 180

# tried in order until one works; set GEMINI_MODEL to force a single model
GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3-flash-preview", "gemini-2.5-flash-lite", "gemini-2.5-flash"]


def _gemini(prompt):
    key = os.environ["GEMINI_API_KEY"]
    models = [os.environ["GEMINI_MODEL"]] if os.environ.get("GEMINI_MODEL") else GEMINI_MODELS
    base = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.8}}
    last = None
    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        # grounding with Google Search gives it real sources; fall back to no tools if refused
        for body in ({**base, "tools": [{"google_search": {}}]}, base):
            r = requests.post(url, params={"key": key}, json=body, timeout=T)
            if r.ok:
                print(f"[llm] gemini model {model}")
                parts = r.json()["candidates"][0]["content"]["parts"]
                return "".join(p.get("text", "") for p in parts)
            last = r
            print(f"[llm] {model}: HTTP {r.status_code} {r.text[:500]}")
            if r.status_code == 404:  # unknown model -> next model (a 429 retries without grounding first)
                break
    last.raise_for_status()


def _openai_style(url, key, model, prompt, extra_headers=None):
    r = requests.post(url, headers={"Authorization": f"Bearer {key}", **(extra_headers or {})}, timeout=T,
                      json={"model": model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.8})
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def _openrouter(prompt):
    return _openai_style("https://openrouter.ai/api/v1/chat/completions", os.environ["OPENROUTER_API_KEY"],
                         os.environ.get("OPENROUTER_MODEL", "openrouter/free"), prompt)


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


def generate_json(prompt, log=print):
    errors = []
    for env, name, fn in PROVIDERS:
        if not os.environ.get(env):
            continue
        try:
            out = extract_json(fn(prompt))
            log(f"[llm] {name} ok")
            return out
        except Exception as e:  # try the next provider
            errors.append(f"{name}: {e}")
            log(f"[llm] {name} failed: {e}")
    raise RuntimeError("No LLM provider worked. " + " | ".join(errors) if errors else "No LLM API key is set.")
