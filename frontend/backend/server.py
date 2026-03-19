from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import httpx
from datetime import datetime, timezone

app = FastAPI(title="NannyElite API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DIDIT Configuration
DIDIT_API_KEY = os.environ.get("DIDIT_API_KEY", "")
DIDIT_API_URL = os.environ.get("DIDIT_API_URL", "https://apx.didit.me/auth/v2")
DIDIT_WEBHOOK_SECRET = os.environ.get("DIDIT_WEBHOOK_SECRET", "")
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "nannyelite-api"}


class DiditSessionRequest(BaseModel):
    user_id: str
    callback_url: str


class DiditSessionResponse(BaseModel):
    session_id: str
    verification_url: str


@app.post("/api/didit/create-session", response_model=DiditSessionResponse)
async def create_didit_session(req: DiditSessionRequest):
    """Create a DIDIT verification session for a user."""
    if not DIDIT_API_KEY:
        # MOCK MODE: Return a mock session when no API key configured
        return DiditSessionResponse(
            session_id=f"mock_{req.user_id}_{int(datetime.now(timezone.utc).timestamp())}",
            verification_url=f"{req.callback_url}?session_id=mock&status=mock_pending",
        )

    # REAL MODE: Call DIDIT API to create verification session
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{DIDIT_API_URL}/sessions",
            headers={
                "Authorization": f"Bearer {DIDIT_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "vendor_data": req.user_id,
                "callback": req.callback_url,
                "features": ["document-verification", "face-match", "liveness"],
            },
            timeout=15.0,
        )
        if resp.status_code != 200 and resp.status_code != 201:
            raise HTTPException(status_code=502, detail=f"DIDIT API error: {resp.text}")
        data = resp.json()
        return DiditSessionResponse(
            session_id=data.get("session_id", data.get("id", "")),
            verification_url=data.get("url", data.get("verification_url", "")),
        )


@app.post("/api/didit/webhook")
async def didit_webhook(request: Request):
    """Receive verification results from DIDIT webhook."""
    body = await request.json()

    session_id = body.get("session_id", "")
    user_id = body.get("vendor_data", "")
    status = body.get("status", "")
    is_verified = status in ("approved", "verified", "completed")

    if not user_id:
        raise HTTPException(status_code=400, detail="Missing vendor_data (user_id)")

    # Update user verification status in Supabase
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        async with httpx.AsyncClient() as client:
            await client.patch(
                f"{SUPABASE_URL}/rest/v1/nanny_profiles?user_id=eq.{user_id}",
                headers={
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
                json={
                    "identity_verified": is_verified,
                    "identity_verification_status": status,
                    "identity_verified_at": datetime.now(timezone.utc).isoformat() if is_verified else None,
                },
                timeout=10.0,
            )

    return {"status": "ok", "verified": is_verified}


@app.post("/api/didit/manual-verify")
async def manual_verify(request: Request):
    """Admin manually verifies a user's identity (fallback when DIDIT fails)."""
    body = await request.json()
    user_id = body.get("user_id", "")
    admin_id = body.get("admin_id", "")

    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id")

    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        async with httpx.AsyncClient() as client:
            await client.patch(
                f"{SUPABASE_URL}/rest/v1/nanny_profiles?user_id=eq.{user_id}",
                headers={
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
                json={
                    "manual_identity_verified": True,
                    "identity_verified_at": datetime.now(timezone.utc).isoformat(),
                },
                timeout=10.0,
            )

    return {"status": "ok", "manually_verified": True}
