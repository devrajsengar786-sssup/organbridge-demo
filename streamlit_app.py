"""Streamlit host for the existing OrganBridge interface and isolated Node API."""
import atexit
import http.cookiejar
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

import streamlit as st
from streamlit.components.v1 import declare_component

ROOT = Path(__file__).resolve().parent
st.set_page_config(page_title="OrganBridge", page_icon="🌉", layout="wide")


@st.cache_resource
def start_backend(accounts):
    executable = shutil.which("node") or shutil.which("nodejs")
    if not executable:
        raise RuntimeError("Node.js is required. Community Cloud installs it from packages.txt.")
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    env = dict(os.environ, PUBLIC_DEMO="1", HOST="127.0.0.1", PORT=str(port))
    env.pop("ORGANBRIDGE_TEST_PASSWORD", None)
    if accounts:
        # Hashes remain on the server, never in component arguments or Git.
        json.loads(accounts)
        env["ORGANBRIDGE_ACCOUNTS_JSON"] = accounts
    process = subprocess.Popen([executable, "server.js"], cwd=ROOT, env=env,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    atexit.register(process.terminate)
    base = f"http://127.0.0.1:{port}"
    for _ in range(100):
        if process.poll() is not None:
            raise RuntimeError("OrganBridge API could not start. Check server-side account configuration.")
        try:
            with urllib.request.urlopen(base + "/api/health", timeout=1) as response:
                if response.status == 200:
                    return base
        except (OSError, urllib.error.URLError):
            time.sleep(0.1)
    process.terminate()
    raise RuntimeError("OrganBridge API startup timed out.")


@st.cache_resource
def component_assets():
    directory = Path(tempfile.mkdtemp(prefix="organbridge-component-"))
    shutil.copytree(ROOT / "public", directory, dirs_exist_ok=True)
    html = (directory / "index.html").read_text(encoding="utf-8")
    html = html.replace('src="/', 'src="').replace('href="/', 'href="')
    html = html.replace("<head>", '<head><script src="streamlit-bridge.js"></script>')
    (directory / "index.html").write_text(html, encoding="utf-8")
    shutil.copyfile(ROOT / "streamlit-bridge.js", directory / "streamlit-bridge.js")
    return str(directory)


def proxy_call(opener, base, operation):
    identifier = operation.get("id")
    route, options = operation.get("path", ""), operation.get("options", {})
    method = options.get("method", "GET").upper()
    if (not isinstance(route, str) or not route.startswith("/api/") or
            ".." in route or method not in {"GET", "POST", "PATCH"}):
        return {"id": identifier, "status": 400, "text": '{"error":"Unsupported request"}'}
    body = options.get("body")
    if body is not None and (not isinstance(body, str) or len(body.encode()) > 12000):
        return {"id": identifier, "status": 413, "text": '{"error":"Request too large"}'}
    request = urllib.request.Request(base + route, method=method,
                                    data=body.encode() if body is not None else None,
                                    headers={"Content-Type": "application/json", "X-OrganBridge-Request": "1"})
    try:
        with opener.open(request, timeout=15) as response:
            return {"id": identifier, "status": response.status, "text": response.read().decode()}
    except urllib.error.HTTPError as error:
        return {"id": identifier, "status": error.code, "text": error.read().decode()}
    except (OSError, urllib.error.URLError):
        return {"id": identifier, "status": 503, "text": '{"error":"Demo API unavailable. Reload to retry."}'}


try:
    accounts = st.secrets.get("ORGANBRIDGE_ACCOUNTS_JSON", "")
except st.errors.StreamlitSecretNotFoundError:
    accounts = os.environ.get("ORGANBRIDGE_ACCOUNTS_JSON", "")
try:
    base_url = start_backend(accounts)
except (RuntimeError, ValueError):
    st.error("The demo API could not start. Check Node.js installation and account secret configuration.")
    st.stop()

if "ob_http" not in st.session_state:
    st.session_state.ob_http = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    st.session_state.ob_done = set()
    st.session_state.ob_responses = []

st.markdown("<style>.block-container{padding:0!important;max-width:100%!important}"
            "header[data-testid='stHeader']{background:transparent;pointer-events:none}"
            "[data-testid='stToolbar']{pointer-events:auto}</style>", unsafe_allow_html=True)
component = declare_component("organbridge_console", path=component_assets())
operations = component(responses=st.session_state.ob_responses, key="organbridge", default=[])
if isinstance(operations, list):
    fresh = [item for item in operations[:20] if isinstance(item, dict)
             and isinstance(item.get("id"), str) and item["id"] not in st.session_state.ob_done]
    if fresh:
        results = []
        for item in fresh:
            results.append(proxy_call(st.session_state.ob_http, base_url, item))
            st.session_state.ob_done.add(item["id"])
        st.session_state.ob_responses = results
        # Only the latest component batch is retained; cookies stay server-side.
        if len(st.session_state.ob_done) > 5000:
            st.session_state.ob_done = {item["id"] for item in fresh}
        st.rerun()
