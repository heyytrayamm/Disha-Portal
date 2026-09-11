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

# Initialize database tables
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
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

# Include V1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)

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
