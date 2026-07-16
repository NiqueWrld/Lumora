"""FastAPI server processing a client-supplied camera feed.

Endpoints:
    GET /api/status  - latest driver state as JSON
    WS  /api/ws/feed - client sends JPEG frames (binary); server replies with
                       the annotated frame (binary) followed by status (JSON)
    GET /*           - React web app (when a build is available)
"""

import asyncio
import sys
from pathlib import Path

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse

import Server.Drive.config as config
from Server.Drive.monitor import FeedProcessor

processor = FeedProcessor()


def _web_dir() -> Path | None:
    """Locate the built React app (repo dist/ in dev, bundled dist/ when frozen)."""
    if getattr(sys, "frozen", False):
        base = Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))
    else:
        base = Path(__file__).resolve().parents[2]
    web = base / "dist"
    return web if (web / "index.html").is_file() else None


WEB_DIR = _web_dir()

app = FastAPI(title="Driver Monitor")


@app.get("/api/status")
def status() -> JSONResponse:
    return JSONResponse(processor.latest_status)


@app.websocket("/api/ws/feed")
async def ws_feed(websocket: WebSocket):
    """Receive webcam frames from the browser, respond with results.

    Client sends each frame as a binary JPEG message. For every frame the
    server sends back the annotated JPEG (binary), then the status (JSON).
    """
    await websocket.accept()
    loop = asyncio.get_running_loop()
    try:
        while True:
            data = await websocket.receive_bytes()
            annotated, frame_status = await loop.run_in_executor(
                None, processor.process_jpeg, data
            )
            if annotated is not None:
                await websocket.send_bytes(annotated)
            await websocket.send_json(frame_status)
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
