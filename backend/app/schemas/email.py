from pydantic import BaseModel, Field
from typing import Optional

class EmailDraft(BaseModel):
    recipient: Optional[str] = Field(
        default="",
        description="The email address or name of the recipient extracted from the transcript. If not mentioned, return empty string."
    )
    subject: str = Field(
        ...,
        description="A concise and professional subject line suitable for the email content."
    )
    body: str = Field(
        ...,
        description="The body content of the email, polished into a clear, professional, and grammatically correct message."
    )

class EmailGenerationRequest(BaseModel):
    transcript: str = Field(
        ...,
        description="The raw voice-to-text transcript spoken by the user."
    )

class EmailGenerationResponse(BaseModel):
    success: bool
    draft: Optional[EmailDraft] = None
    error: Optional[str] = None

class EmailSendRequest(BaseModel):
    recipient: str = Field(..., description="The recipient email address.")
    subject: str = Field(..., description="The subject line of the email.")
    body: str = Field(..., description="The body content of the email.")
    access_token: str = Field(..., description="Google OAuth access token for sending via Gmail API.")

class EmailSendResponse(BaseModel):
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None

class ProcessAndSendRequest(BaseModel):
    transcript: str = Field(..., description="The voice transcript command.")
    access_token: str = Field(..., description="Google OAuth access token.")
    contacts: Optional[dict[str, str]] = Field(
        default=None,
        description="Dictionary mapping names/aliases to email addresses."
    )

class ProcessAndSendResponse(BaseModel):
    success: bool
    message_id: Optional[str] = None
    draft: Optional[EmailDraft] = None
    error: Optional[str] = None
