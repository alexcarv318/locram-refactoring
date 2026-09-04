import base64
import json
from datetime import UTC, datetime, timedelta

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from schemas.access import AccessSettings, EntitlementLeasePayload, SignedEntitlementLease

TEST_ENTITLEMENT_PRIVATE_KEY = "25fIMM+Xn8ULjaessrq9lmqTRC0Dqaqo65G4ir9irTo="
TEST_ENTITLEMENT_PUBLIC_KEY = "5SFF5aLR9eSba1EhR2huNVTDw1GvrCgrRa5IbTJCKVY="
TEST_ACCESS_SETTINGS = AccessSettings(entitlement_public_key=TEST_ENTITLEMENT_PUBLIC_KEY)


def signed_entitlement_lease(
    plan_code: str = "locram_pro",
    expires_at: str | None = None,
    grace_until: str | None = None,
    revoked_at: str | None = None,
    status: str = "active",
) -> SignedEntitlementLease:
    if expires_at is None:
        expires_at = (datetime.now(UTC) + timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")

    payload = EntitlementLeasePayload(
        plan_code=plan_code,
        status=status,
        issued_at="2026-01-01T00:00:00Z",
        expires_at=expires_at,
        grace_until=grace_until,
        revoked_at=revoked_at,
        device_id="device-one",
        license_root_id="root-one",
        license_seat_id="seat-one",
    )
    payload_data = json.loads(payload.model_dump_json(exclude_none=True))
    private_key = Ed25519PrivateKey.from_private_bytes(
        base64.b64decode(TEST_ENTITLEMENT_PRIVATE_KEY)
    )
    signature = base64.b64encode(
        private_key.sign(json.dumps(payload_data, separators=(",", ":"), sort_keys=True).encode())
    ).decode("ascii")

    return SignedEntitlementLease(payload=payload, signature=signature, key_id="test")
