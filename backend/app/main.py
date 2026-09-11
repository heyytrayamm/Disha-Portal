from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import logging
import os

from app.core.config import settings
from app.core.database import engine, Base
import app.models  # Register models with Base.metadata before table creation
from app.api.router import api_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fastapi_app")

def ensure_schema_migrations():
    """
    Safely checks and adds any missing columns to existing tables
    without dropping or modifying existing data.
    Works seamlessly on both PostgreSQL and SQLite.
    """
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        table_names = inspector.get_table_names()
        if "scan_records" in table_names:
            existing_columns = {c["name"] for c in inspector.get_columns("scan_records")}
            new_columns = [
                ("inspection_id", "VARCHAR(255)"),
                ("inspector_id", "VARCHAR(255)"),
                ("original_filename", "VARCHAR(255)"),
                ("source_image_url", "TEXT"),
                ("ocr_text", "TEXT"),
                ("normalized_fields", "JSON"),
                ("passed_count", "INTEGER DEFAULT 0"),
                ("failed_count", "INTEGER DEFAULT 0"),
                ("remarks", "TEXT"),
                ("recommendation", "TEXT"),
                ("quality_metrics", "JSON"),
            ]
            with engine.connect() as conn:
                for col_name, col_type in new_columns:
                    if col_name not in existing_columns:
                        try:
                            conn.execute(text(f"ALTER TABLE scan_records ADD COLUMN {col_name} {col_type}"))
                            conn.commit()
                            logger.info(f"Safely added column '{col_name}' to scan_records.")
                        except Exception as col_err:
                            logger.debug(f"Column '{col_name}' already exists or cannot be added: {col_err}")
    except Exception as e:
        logger.warning(f"Schema auto-migration check notice: {e}")

# Initialize database tables
try:
    Base.metadata.create_all(bind=engine)
    ensure_schema_migrations()
    logger.info("Database tables initialized and migrated successfully.")
except Exception as e:
    logger.error(f"Error creating DB tables: {e}")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-stack AI-Powered Label Compliance Checking System (SIH Problem Statement SIH26034)",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Middleware
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
is_wildcard = not origins or "*" in origins

if is_wildcard:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Mount static storage directories for local fallback
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/static/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads_root")
if os.path.exists(settings.REPORT_DIR):
    app.mount("/static/reports", StaticFiles(directory=settings.REPORT_DIR), name="reports")
    app.mount("/reports", StaticFiles(directory=settings.REPORT_DIR), name="reports_root")

from app.api.v1 import inspections

# Include V1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Also mount /inspections directly at root for Part 9 requirement:
# GET /inspections -> actual records
# GET /inspections/{id} -> actual saved inspection
app.include_router(inspections.router, prefix="/inspections")

@app.get("/api/health")
def health_check():
    return {
        "status": "UP",
        "systemName": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "actReference": "Legal Metrology Act, 2009 & Legal Metrology (Packaged Commodities) Rules, 2011"
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception on {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "error": str(exc)}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
