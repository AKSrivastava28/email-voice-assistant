import base64
import logging
from email.message import EmailMessage
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

def send_gmail(recipient: str, subject: str, body: str, access_token: str) -> str:
    """
    Constructs an email message and sends it via the Gmail API.
    
    Args:
        recipient: The email address of the receiver.
        subject: The subject of the email.
        body: The body content of the email.
        access_token: The Google OAuth 2.0 access token passed from frontend.
        
    Returns:
        The ID of the sent message.
    """
    try:
        # Create a modern EmailMessage object (which correctly handles unicode/UTF-8)
        message = EmailMessage()
        message.set_content(body)
        message["To"] = recipient
        message["Subject"] = subject

        # Encode the message in base64url format as required by the Gmail API
        raw_bytes = message.as_bytes()
        encoded_message = base64.urlsafe_b64encode(raw_bytes).decode("utf-8")
        
        # Initialize Google OAuth credentials directly with the access token
        # No local storage/credentials file required on the server
        credentials = Credentials(token=access_token)
        
        # Build the Gmail service
        service = build("gmail", "v1", credentials=credentials)
        
        # Create and send the message
        logger.info(f"Sending email to {recipient} using Gmail API...")
        send_response = service.users().messages().send(
            userId="me",
            body={"raw": encoded_message}
        ).execute()
        
        message_id = send_response.get("id")
        logger.info(f"Email successfully sent. Message ID: {message_id}")
        return message_id

    except Exception as e:
        logger.error(f"Failed to send email via Gmail API: {e}", exc_info=True)
        raise e
