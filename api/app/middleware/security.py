"""Security headers middleware for FastAPI."""
from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings
from app.core.csp import get_csp_policy


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses.

    Headers added:
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - Referrer-Policy: strict-origin-when-cross-origin
    - Cross-Origin-Resource-Policy: same-origin
    - Permissions-Policy: (restrictive defaults)
    - Content-Security-Policy: (configurable via CSP_MODE)
    - Cross-Origin-Opener-Policy: same-origin (if enabled)
    - Cross-Origin-Embedder-Policy: require-corp (if enabled)
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)

        # ---- Basic Security Headers (always applied) ----

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Restrict resource loading
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"

        # Disable dangerous browser features
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=()"
        )

        # ---- Content Security Policy ----

        csp_policy = get_csp_policy()
        if csp_policy:
            response.headers["Content-Security-Policy"] = csp_policy

        # ---- Cross-Origin Isolation (COOP + COEP) ----

        coop_coep_enabled = getattr(settings, "coop_coep_enabled", False)
        if coop_coep_enabled:
            # Enable cross-origin isolation
            response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
            response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"

        return response
