#!/usr/bin/env python3
import json
import sys
import urllib.request

API_BASE = "http://localhost:8000/api/v1"

CANON_CODES = {"OPEN","DIAG","PARTS","READY"}
ALLOWED_ROLES = {"advisor","technician","parts"}
ALLOWED_COLORS = {"green","yellow","purple","teal"}  # adjust if you use hex etc.

def get(path):
    with urllib.request.urlopen(f"{API_BASE}{path}") as r:
        return json.loads(r.read().decode())

def main():
    probs = []

    # /stats
    stats = get("/stats")
    for k in ("customers","vehicles","open_ros"):
        if k not in stats or not isinstance(stats[k], int):
            probs.append(f"/stats missing or invalid key: {k}")

    # /ros/active
    active = get("/ros/active")
    if not isinstance(active, list):
        probs.append("/ros/active did not return a list")
    else:
        bad_code, bad_meta, bad_role, bad_color = [], [], [], []
        for ro in active:
            st = ro.get("status") or {}
            sc = st.get("status_code")
            lbl = st.get("label")
            role = st.get("role_owner")
            color = st.get("color")

            if not sc:
                bad_code.append(ro.get("ro_number"))
            else:
                if sc not in CANON_CODES:
                    bad_code.append(ro.get("ro_number"))

            if not (lbl and role and color):
                bad_meta.append(ro.get("ro_number"))
            else:
                if role not in ALLOWED_ROLES:
                    bad_role.append(ro.get("ro_number"))
                if color.lower() not in ALLOWED_COLORS:
                    bad_color.append(ro.get("ro_number"))

        if bad_code:
            probs.append(f"{len(bad_code)} active ROs have invalid status_code (not in {sorted(CANON_CODES)}): {bad_code}")
        if bad_meta:
            probs.append(f"{len(bad_meta)} active ROs missing status metadata fields: {bad_meta}")
        if bad_role:
            probs.append(f"{len(bad_role)} active ROs have role_owner outside {sorted(ALLOWED_ROLES)}: {bad_role}")
        if bad_color:
            probs.append(f"{len(bad_color)} active ROs have color outside {sorted(ALLOWED_COLORS)}: {bad_color}")

    if probs:
        print("SANITY: FAIL")
        for p in probs:
            print(" -", p)
        sys.exit(1)
    print("SANITY: OK")
    print("Stats:", stats)
    print(f"/ros/active count: {len(active)}")

if __name__ == "__main__":
    main()
