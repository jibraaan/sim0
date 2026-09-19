from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime, timedelta, timezone

import httpx
from agent_engine.db import get_pool
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

log = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

TOKEN_TTL_MINUTES = 15
RESEND_API_URL = "https://api.resend.com/emails"


def _allowed_emails() -> set[str]:
    raw = os.getenv("ALLOWED_EMAILS", "")
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


async def _send_magic_link(email: str, link: str) -> None:
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        # No email provider configured (local dev default) - print instead of failing,
        # so the flow is still testable end to end without sending real email.
        print(f"[auth] RESEND_API_KEY not set - login link for {email}: {link}")
        return

    from_address = os.getenv("RESEND_FROM_EMAIL", "Sim0 <onboarding@resend.dev>")
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "from": from_address,
                "to": email,
                "subject": "Your Sim0 login link",
                "text": (
                    f"Log in to Sim0:\n\n{link}\n\nThis link expires in {TOKEN_TTL_MINUTES} "
                    "minutes and can only be used once."
                ),
            },
        )
    if resp.status_code >= 400:
        # Most common cause on a sandbox (unverified-domain) Resend account: it can
        # only deliver to the account owner's own address until a domain is verified.
        log.warning("Resend send to %s failed: %s %s", email, resp.status_code, resp.text)


class RequestLinkIn(BaseModel):
    email: str


@router.post("/request-link")
async def request_link(body: RequestLinkIn):
    email = body.email.strip().lower()
    if email and email in _allowed_emails():
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_TTL_MINUTES)
        pool = await get_pool()
        await pool.execute(
            "INSERT INTO magic_links (email, token, expires_at) VALUES ($1, $2, $3)",
            email,
            token,
            expires_at,
        )
        web_url = os.getenv("WEB_URL", "http://localhost:3000")
        link = f"{web_url}/api/auth/verify?token={token}"
        await _send_magic_link(email, link)
    # Same response whether or not the email is allowlisted - don't leak who's invited.
    return {"ok": True}


class VerifyIn(BaseModel):
    token: str


@router.post("/verify")
async def verify(body: VerifyIn):
    pool = await get_pool()
    row = await pool.fetchrow(
        "SELECT email, expires_at, used_at FROM magic_links WHERE token = $1", body.token
    )
    if row is None:
        raise HTTPException(400, "invalid token")
    if row["used_at"] is not None:
        raise HTTPException(400, "token already used")
    if row["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(400, "token expired")

    await pool.execute("UPDATE magic_links SET used_at = now() WHERE token = $1", body.token)
    return {"email": row["email"]}
