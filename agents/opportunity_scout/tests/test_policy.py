import unittest

from opportunity_scout.policy import SellerIdentity, normalize_domain, seller_self_reference_gate


SELLER = SellerIdentity(
    canonical_name="Signal and Friction",
    canonical_domains=(
        "signal-and-friction.com",
        "signal-and-friction.pages.dev",
    ),
)


class NormalizeDomainTests(unittest.TestCase):
    def test_normalizes_url_www_path_and_port(self) -> None:
        self.assertEqual(
            normalize_domain("HTTPS://WWW.Signal-And-Friction.com:443/scan?x=1"),
            "signal-and-friction.com",
        )


class SellerSelfReferenceGateTests(unittest.TestCase):
    def test_blocks_exact_domain(self) -> None:
        result = seller_self_reference_gate("signal-and-friction.com", SELLER)
        self.assertTrue(result.blocked)
        self.assertEqual(result.code, "seller_self_reference")

    def test_blocks_www_variant(self) -> None:
        result = seller_self_reference_gate("https://www.signal-and-friction.com", SELLER)
        self.assertTrue(result.blocked)

    def test_blocks_owned_subdomain(self) -> None:
        result = seller_self_reference_gate("app.signal-and-friction.com", SELLER)
        self.assertTrue(result.blocked)

    def test_blocks_pages_deployment(self) -> None:
        result = seller_self_reference_gate("signal-and-friction.pages.dev", SELLER)
        self.assertTrue(result.blocked)

    def test_allows_unrelated_company(self) -> None:
        result = seller_self_reference_gate("example-saas.com", SELLER)
        self.assertFalse(result.blocked)
        self.assertIsNone(result.code)

    def test_does_not_block_domain_suffix_lookalike(self) -> None:
        result = seller_self_reference_gate("signal-and-friction.com.evil.example", SELLER)
        self.assertFalse(result.blocked)

    def test_does_not_block_prefix_lookalike(self) -> None:
        result = seller_self_reference_gate("signal-and-friction.competitor.example", SELLER)
        self.assertFalse(result.blocked)


if __name__ == "__main__":
    unittest.main()
