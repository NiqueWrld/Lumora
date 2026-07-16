"""FastAPI server exposing the driver monitoring camera feed and status.

Endpoints:
    GET /api/status - latest driver state as JSON
    GET /api/video  - MJPEG stream of the annotated camera feed
    WS  /api/ws     - pushes the driver state ~10x per second
    GET /*          - React web app (when a build is available)
"""

import asyncio
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

import Server.Drive.config as config
from Server.Drive.monitor import CameraWorker

worker = CameraWorker()


def _web_dir() -> Path | None:
    """Locate the built React app (repo dist/ in dev, bundled dist/ when frozen)."""
    if getattr(sys, "frozen", False):
        base = Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))
    else:
        base = Path(__file__).resolve().parents[2]
    web = base / "dist"
    return web if (web / "index.html").is_file() else None


WEB_DIR = _web_dir()


@asynccontextmanager
async def lifespan(_: FastAPI):
    worker.start()
    yield
    worker.stop()


app = FastAPI(title="Driver Monitor", lifespan=lifespan)


@app.get("/api/status")
def status() -> JSONResponse:
    return JSONResponse(worker.latest_status)


async def _mjpeg_generator():
    boundary = b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
    delay = 1.0 / config.STREAM_FPS
    while True:
        jpeg = worker.latest_jpeg
        if jpeg is not None:
            yield boundary + jpeg + b"\r\n"
        await asyncio.sleep(delay)


@app.get("/api/video")
def video() -> StreamingResponse:
    return StreamingResponse(
        _mjpeg_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.websocket("/api/ws")
async def ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await websocket.send_json(worker.latest_status)
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        pass


@app.get("/{path:path}", response_model=None)
def spa(path: str) -> FileResponse | JSONResponse:
    """Serve the built React app with SPA fallback for client-side routes."""
    if WEB_DIR is None:
        return JSONResponse(
            {"detail": "Web build not found. Run 'pnpm build' or use the Vite dev server."},
            status_code=404,
        )
    file = (WEB_DIR / path).resolve() if path else WEB_DIR / "index.html"
    if file.is_file() and file.is_relative_to(WEB_DIR):
        return FileResponse(file)
    return FileResponse(WEB_DIR / "index.html")


if __name__ == "__main__":
    uvicorn.run(app, host=config.HOST, port=config.PORT)
