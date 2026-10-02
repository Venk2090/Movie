from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api import projects, system, models

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="100% FOSS Modular AI Video Localization & Cinematic Generation Studio",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables on startup
@app.on_event("startup")
def on_startup():
    init_db()

# Mount API Routers
app.include_router(projects.router, prefix="/api")
app.include_router(system.router, prefix="/api")
app.include_router(models.router, prefix="/api")

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

# Real-time WebSocket connection manager for live project updates
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, project_id: str, websocket: WebSocket):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)

    def disconnect(self, project_id: str, websocket: WebSocket):
        if project_id in self.active_connections:
            self.active_connections[project_id].remove(websocket)

    async def broadcast(self, project_id: str, message: dict):
        if project_id in self.active_connections:
            for connection in self.active_connections[project_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/projects/{project_id}")
async def websocket_project_telemetry(websocket: WebSocket, project_id: str):
    await manager.connect(project_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo or process client events
            await websocket.send_json({"event": "ack", "project_id": project_id})
    except WebSocketDisconnect:
        manager.disconnect(project_id, websocket)
