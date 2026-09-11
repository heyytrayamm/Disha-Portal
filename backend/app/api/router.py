from fastapi import APIRouter
from app.api.v1 import auth, scan, products, reports, dashboard, notices, rules

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(scan.router)
api_router.include_router(products.router)
api_router.include_router(reports.router)
api_router.include_router(dashboard.router)
api_router.include_router(notices.router)
api_router.include_router(rules.router)
