from fastapi import FastAPI

app = FastAPI(title="EduNex API")

@app.get("/")
def home():
    return {
        "message": "Welcome to EduNex",
        "description": "Adaptive personalized learning platform"
    }

@app.get("/health")
def health():
    return {"status": "ok"}
