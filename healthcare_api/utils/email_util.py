from schemas.email_schema import EmailSchema
import smtplib
from email.message import EmailMessage
from config.api_config import Config

class EmailUtil:
    @staticmethod
    def send_email(email_data: EmailSchema) -> tuple[bool, str]:
        try:
            msg = EmailMessage()
            msg["Subject"] = email_data.subject
            msg["To"] = email_data.recipient_email
            msg.set_content(email_data.body)
            msg["From"] = Config.SENDER_EMAIL

            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
                smtp.login(Config.SENDER_EMAIL, Config.SENDER_PASSKEY)
                smtp.send_message(msg)
            return True, "Email sent successfully"
        except Exception as e:
            return False, str(e)