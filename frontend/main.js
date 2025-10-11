const el = document.getElementById('app');
async function ping() {
  try {
    const res = await fetch((import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api/v1") + "/health");
    const json = await res.json();
    el.textContent = "API /health → " + JSON.stringify(json);
  } catch (e) {
    el.textContent = "API unreachable: " + e;
  }
}
ping();
