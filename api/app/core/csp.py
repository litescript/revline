"""Content Security Policy (CSP) configuration and policy builder."""
from __future__ import annotations

from enum import Enum

from .config import settings


class CSPMode(str, Enum):
    """CSP policy modes."""

    STRICT = "strict"
    PERMISSIVE = "permissive"
    OFF = "off"


class CSPDirectives:
    """CSP directive builder."""

    # Strict policy: minimal permissions
    STRICT = {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],  # Tailwind requires inline styles
        "connect-src": ["'self'", "ws:", "wss:"],  # API + WebSocket + Vite HMR
        "font-src": ["'self'", "data:"],  # Data-URI fonts for Tailwind
        "frame-ancestors": ["'none'"],
        "form-action": ["'self'"],
        "base-uri": ["'self'"],
        "object-src": ["'none'"],
    }

    # Permissive policy: allows more sources (useful for development)
    PERMISSIVE = {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "https:"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "frame-ancestors": ["'self'"],
        "form-action": ["'self'"],
        "connect-src": ["'self'", "ws:", "wss:"],  # Allow WebSocket
    }

    @staticmethod
    def build_policy(mode: CSPMode) -> str:
        """
        Build CSP policy string based on mode.

        Args:
            mode: CSP mode (strict, permissive, or off)

        Returns:
            CSP policy string, or empty string if mode is off
        """
        if mode == CSPMode.OFF:
            return ""

        directives = CSPDirectives.STRICT if mode == CSPMode.STRICT else CSPDirectives.PERMISSIVE

        # Convert dict to CSP string format
        parts = []
        for directive, sources in directives.items():
            sources_str = " ".join(sources)
            parts.append(f"{directive} {sources_str}")

        return "; ".join(parts)


def get_csp_policy() -> str:
    """
    Get CSP policy from settings.

    Returns:
        CSP policy string
    """
    mode_str = getattr(settings, "csp_mode", "strict").lower()

    try:
        mode = CSPMode(mode_str)
    except ValueError:
        # Default to strict if invalid mode
        mode = CSPMode.STRICT

    return CSPDirectives.build_policy(mode)
