import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.schemas.email import (
    EmailGenerationRequest,
    EmailGenerationResponse,
    EmailSendRequest,
    EmailSendResponse,
    ProcessAndSendRequest,
    ProcessAndSendResponse
)
from app.services.ai_service import generate_email_draft
from app.services.gmail_service import send_gmail

app = FastAPI(
    title="Voice-Activated Email Assistant API",
    description="Backend API to parse voice transcripts and send emails via Gmail API.",
    version="1.0.0"
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "llm_provider": settings.LLM_PROVIDER}

@app.post("/api/process-voice", response_model=EmailGenerationResponse)
def process_voice_endpoint(payload: EmailGenerationRequest):
    """
    Accepts a raw voice-to-text transcript and uses LLM to generate 
    a structured email draft (recipient, subject, and body).
    """
    try:
        draft = generate_email_draft(payload.transcript)
        return EmailGenerationResponse(success=True, draft=draft)
    except Exception as e:
        return EmailGenerationResponse(success=False, error=str(e))

@app.post("/api/send-email", response_model=EmailSendResponse)
def send_email_endpoint(payload: EmailSendRequest):
    """
    Accepts the generated email fields and a Google OAuth2 access token,
    and sends the email using the Gmail API on behalf of the user.
    """
    try:
        message_id = send_gmail(
            recipient=payload.recipient,
            subject=payload.subject,
            body=payload.body,
            access_token=payload.access_token
        )
        return EmailSendResponse(success=True, message_id=message_id)
    except Exception as e:
        return EmailSendResponse(success=False, error=str(e))

@app.post("/api/process-and-send", response_model=ProcessAndSendResponse)
def process_and_send_endpoint(payload: ProcessAndSendRequest):
    """
    Parses a voice transcript with contacts mapping, generates the email draft,
    and immediately dispatches it via Gmail API.
    """
    try:
        # 1. Parse draft using contact mappings
        draft = generate_email_draft(payload.transcript, payload.contacts)
        
        if not draft.recipient or "@" not in draft.recipient:
            return ProcessAndSendResponse(
                success=False, 
                draft=draft, 
                error=f"Could not resolve a valid recipient email. Resolved recipient: '{draft.recipient}'"
            )
            
        # 2. Auto send via Gmail API
        message_id = send_gmail(
            recipient=draft.recipient,
            subject=draft.subject,
            body=draft.body,
            access_token=payload.access_token
        )
        return ProcessAndSendResponse(success=True, message_id=message_id, draft=draft)
        
    except Exception as e:
        return ProcessAndSendResponse(success=False, error=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
