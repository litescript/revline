const el = document.getElementById('app');

async function ping() {
  try {
    // call through the proxy instead of hard-coding the port
    const res = await fetch("/api/v1/health");
    const json = await res.json();
    el.textContent = "API /health → " + JSON.stringify(json);
  } catch (e) {
    el.textContent = "API unreachable: " + e;
  }
}

ping();
