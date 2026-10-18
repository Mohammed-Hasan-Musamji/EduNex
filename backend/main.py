from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging

configure_logging()
settings = get_settings()

if settings.environment != "development" and settings.secret_key == "change-me-generate-a-real-random-secret":
    raise RuntimeError(
        "SECRET_KEY is still the placeholder default outside of development. "
        "Generate a real secret (see .env.example) before starting in this environment."
    )

app = FastAPI(title="EduNex API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(api_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to EduNex",
        "description": "Adaptive personalized learning platform"
    }

@app.get("/health")
def health():
    return {"status": "ok"}
