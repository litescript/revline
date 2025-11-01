import json, sys, urllib.request

API_BASE = "http://localhost:8000/api/v1"

def get(path):
    with urllib.request.urlopen(f"{API_BASE}{path}") as r:
        return json.loads(r.read().decode())

def main():
    problems = []

    # 1) Health-ish pings
    stats = get("/stats")            # expects keys: customers, vehicles, open_ros
    active = get("/ros/active")      # list of ROs; each has nested status object

    # Basic shape checks
    for k in ("customers","vehicles","open_ros"):
        if k not in stats or not isinstance(stats[k], int):
            problems.append(f"/stats missing or invalid key: {k}")

    if not isinstance(active, list):
        problems.append("/ros/active did not return a list")
    else:
        # Validate nested status payloads
        bad = []
        bad_meta = []
        for ro in active:
            st = ro.get("status") or {}
            sc = st.get("status_code")
            label = st.get("label")
            role = st.get("role_owner")
            color = st.get("color")
            if not sc:
                bad.append(ro.get("ro_number"))
            if not (label and role and color):
                bad_meta.append(ro.get("ro_number"))

        if bad:
            problems.append(f"{len(bad)} active ROs have null/empty status.status_code: {bad}")
        if bad_meta:
            problems.append(f"{len(bad_meta)} active ROs missing status metadata fields: {bad_meta}")

    if problems:
        print("SANITY: FAIL")
        for p in problems:
            print(" -", p)
        sys.exit(1)
    else:
        print("SANITY: OK")
        print("Stats:", stats)
        print(f"/ros/active count: {len(active)}")
        sys.exit(0)

if __name__ == "__main__":
    main()
