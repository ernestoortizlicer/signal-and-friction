from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse


SELLER_SELF_REFERENCE = "seller_self_reference"


@dataclass(frozen=True)
class SellerIdentity:
    canonical_name: str
    canonical_domains: tuple[str, ...]


@dataclass(frozen=True)
class QualificationGateResult:
    blocked: bool
    code: str | None = None
    reason: str | None = None


def normalize_domain(raw: str) -> str:
    """Normalize a domain or URL into a lowercase hostname without `www.` or port."""
    value = raw.strip()
    if not value:
        return ""

    parsed = urlparse(value if "://" in value else f"https://{value}")
    host = (parsed.hostname or "").lower().rstrip(".")
    if host.startswith("www."):
        host = host[4:]
    return host


def _is_same_domain_or_subdomain(candidate: str, canonical: str) -> bool:
    return candidate == canonical or candidate.endswith(f".{canonical}")


def seller_self_reference_gate(
    candidate_domain: str,
    seller_identity: SellerIdentity,
) -> QualificationGateResult:
    """
    Deterministically block the seller's own domains before model-driven qualification.

    The comparison is intentionally exact/subdomain-based after normalization. A lookalike
    such as `signal-and-friction.com.evil.example` must not match the canonical seller domain.
    """
    candidate = normalize_domain(candidate_domain)
    canonical_domains = {
        normalize_domain(domain)
        for domain in seller_identity.canonical_domains
        if normalize_domain(domain)
    }

    if any(_is_same_domain_or_subdomain(candidate, canonical) for canonical in canonical_domains):
        return QualificationGateResult(
            blocked=True,
            code=SELLER_SELF_REFERENCE,
            reason=(
                f"{candidate or candidate_domain!r} belongs to the seller identity "
                f"{seller_identity.canonical_name}; it cannot be an external sales opportunity."
            ),
        )

    return QualificationGateResult(blocked=False)
