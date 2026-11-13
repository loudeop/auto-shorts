import json, os, datetime as dt
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def load_schedule():
    return json.load(open(os.path.join(ROOT, "config", "schedule.json")))


def next_publish(now=None, lead_minutes=120):
    """Next HH:MM IST that is at least `lead_minutes` away (time to render)."""
    sch = load_schedule()
    hh, mm = map(int, sch["publish_time_ist"].split(":"))
    now = (now or dt.datetime.now(dt.timezone.utc)).astimezone(IST)
    t = now.replace(hour=hh, minute=mm, second=0, microsecond=0)
    while t < now + dt.timedelta(minutes=lead_minutes):
        t += dt.timedelta(days=1)
    return t


def formats_for(t):
    return load_schedule()["days"][DAYS[t.weekday()]]


def history():
    p = os.path.join(ROOT, "state", "history.json")
    return json.load(open(p)) if os.path.exists(p) else []
