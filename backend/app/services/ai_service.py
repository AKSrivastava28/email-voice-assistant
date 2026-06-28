import os
import json
import logging
from typing import Optional
from app.config import settings
from app.schemas.email import EmailDraft

logger = logging.getLogger(__name__)

def generate_email_draft(transcript: str, contacts: Optional[dict] = None) -> EmailDraft:
    """
    Parses the raw voice transcript and uses an LLM to generate a structured EmailDraft.
    """
    if not transcript or not transcript.strip():
        raise ValueError("Transcript is empty. Cannot generate email draft.")

    contacts_section = ""
    if contacts:
        contacts_str = "\n".join([f"- {name.lower().strip()}: {email.strip()}" for name, email in contacts.items()])
        contacts_section = f"""
    User's Personal Contacts Directory:
    Use this mapping to resolve spoken names/aliases directly to their email addresses. If the transcript mentions one of these names, you MUST use the corresponding email address as the 'recipient':
    {contacts_str}
    """

    prompt = f"""
    You are an expert AI assistant specialized in parsing spoken instructions and drafting professional emails.
    
    Given the following raw voice-to-text transcript:
    ---
    "{transcript}"
    ---
    {contacts_section}
    
    Your task is to:
    1. Identify the recipient. If the recipient matches a name or alias in the User's Personal Contacts Directory above, resolve it to the exact email address. If no recipient is mentioned, return an empty string. For any other email addresses mentioned phonetically, correct standard transcription errors (e.g. removing spaces, fixing spellings) to make them valid email formats.
    2. Create a concise, professional subject line.
    3. Generate a complete, polished email body. Keep it professional, polite, well-structured, and check for correct grammar. Expand abbreviations or spoken sentence fragments into coherent sentences. Do not include any email header placeholders like "Subject:" or "To:" in the body itself.
    """

    provider = settings.LLM_PROVIDER.lower()
    
    if provider == "gemini":
        api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your .env file."
            )
            
        try:
            # Try using the new google-genai SDK
            from google import genai
            from google.genai import types
            
            logger.info("Using new google-genai client...")
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=EmailDraft,
                    temperature=0.1,
                ),
            )
            data = json.loads(response.text)
            return EmailDraft(**data)
            
        except ImportError:
            # Fallback to older google-generativeai if new package isn't loaded properly
            logger.info("google-genai import failed, trying google-generativeai fallback...")
            import google.generativeai as genai_legacy
            
            genai_legacy.configure(api_key=api_key)
            model_name = settings.GEMINI_MODEL
            # Ensure model name compatibility for legacy library (e.g. gemini-1.5-flash)
            if "2.5" in model_name:
                model_name = "gemini-1.5-flash"
                
            model = genai_legacy.GenerativeModel(model_name)
            response = model.generate_content(
                prompt,
                generation_config=genai_legacy.types.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=EmailDraft,
                    temperature=0.1,
                )
            )
            data = json.loads(response.text)
            return EmailDraft(**data)
            
    elif provider == "groq":
        api_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise ValueError(
                "GROQ_API_KEY is not configured. Please set GROQ_API_KEY in your .env file."
            )
            
        from groq import Groq
        
        client = Groq(api_key=api_key)
        logger.info(f"Using Groq model '{settings.GROQ_MODEL}' with JSON response format...")
        
        contacts_str = ""
        if contacts:
            contacts_str = "\n".join([f"- {name.lower().strip()}: {email.strip()}" for name, email in contacts.items()])
        else:
            contacts_str = "(No contacts configured)"
        
        system_instruction = (
            "You are an expert AI assistant specialized in parsing spoken instructions and drafting professional emails.\n\n"
            "User's Personal Contacts Directory:\n"
            f"{contacts_str}\n\n"
            "YOUR TASKS:\n"
            "1. Resolve the recipient: If the spoken transcript mentions a name or alias that exists in the Contacts Directory above (e.g. 'tushar', 'ananya', 'wonder'), you MUST return the corresponding email address as the 'recipient'. If no recipient is mentioned, return an empty string.\n"
            "2. Generate a professional Subject: Create a concise, descriptive, and professional subject line based on the email context. DO NOT leave this empty.\n"
            "3. Draft a polished email Body: Convert the raw spoken transcript into a complete, professional, polite, and grammatically correct email body. Expand abbreviations and spoken fragments into full sentences. Do not include placeholders like 'Subject:' or 'To:' inside the body.\n"
            "4. Format the output: Return a single, valid JSON object containing exactly three keys: 'recipient', 'subject', and 'body'. Do NOT include any markdown code blocks, backticks, or extra text. Return raw JSON."
        )
        
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": f"Voice Transcript: {transcript}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        
        raw_text = response.choices[0].message.content
        logger.info(f"Groq raw response: {raw_text}")
        
        data = json.loads(raw_text)
        return EmailDraft(**data)
        
    else:
        raise ValueError(
            f"Unsupported LLM provider '{settings.LLM_PROVIDER}'. Choose 'gemini' or 'groq'."
        )
