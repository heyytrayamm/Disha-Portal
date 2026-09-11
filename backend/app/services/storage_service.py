import os
import uuid
import logging
from app.core.config import settings

logger = logging.getLogger("storage_service")

class StorageService:
    """
    AWS S3 File Storage Service with automatic Local Static File Storage fallback.
    """

    def __init__(self):
        self.s3_client = None
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY and settings.S3_BUCKET_NAME:
            try:
                import boto3
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_REGION
                )
                logger.info(f"AWS S3 client initialized for bucket: {settings.S3_BUCKET_NAME}")
            except Exception as e:
                logger.warning(f"Failed to initialize S3 client: {e}. Using local storage fallback.")

    def save_file(self, file_bytes: bytes, filename: str, folder: str = "uploads") -> str:
        """
        Saves file to S3 or local directory and returns access URL.
        """
        ext = os.path.splitext(filename)[1] or ".jpg"
        unique_name = f"{uuid.uuid4().hex[:10]}_{filename}"

        if self.s3_client and settings.S3_BUCKET_NAME:
            try:
                s3_key = f"{folder}/{unique_name}"
                self.s3_client.put_object(
                    Bucket=settings.S3_BUCKET_NAME,
                    Key=s3_key,
                    Body=file_bytes,
                    ContentType="image/jpeg" if ext in [".jpg", ".jpeg"] else "application/pdf"
                )
                url = f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
                return url
            except Exception as e:
                logger.error(f"S3 upload error: {e}. Falling back to local storage.")

        # Local File Fallback
        target_dir = os.path.join(settings.UPLOAD_DIR if folder == "uploads" else settings.REPORT_DIR)
        os.makedirs(target_dir, exist_ok=True)
        local_path = os.path.join(target_dir, unique_name)
        with open(local_path, "wb") as f:
            f.write(file_bytes)

        return f"/static/{folder}/{unique_name}"

storage_service = StorageService()
