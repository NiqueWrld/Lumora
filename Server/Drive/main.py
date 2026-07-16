"""FastAPI server exposing the driver monitoring camera feed and status.

Endpoints:
    GET /        - dashboard page (live stream + status)
    GET /video   - MJPEG stream of the annotated camera feed
    GET /status  - latest driver state as JSON
    WS  /ws      - pushes the driver state ~10x per second
"""

import asyncio
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse

import Server.Drive.config as config
from Server.Drive.monitor import CameraWorker

worker = CameraWorker()


@asynccontextmanager
async def lifespan(_: FastAPI):
    worker.start()
    yield
    worker.stop()


app = FastAPI(title="Driver Monitor", lifespan=lifespan)


@app.get("/status")
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


@app.get("/video")
def video() -> StreamingResponse:
    return StreamingResponse(
        _mjpeg_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.websocket("/ws")
async def ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await websocket.send_json(worker.latest_status)
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        pass


INDEX_HTML = """<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Driver Monitor</title>
<style>
  body{background:#111;color:#eee;font-family:system-ui,sans-serif;margin:0;
       padding:24px;display:flex;gap:24px;flex-wrap:wrap}
  img{max-width:840px;width:100%;border:1px solid #333;border-radius:8px}
  #panel{min-width:280px;flex:1}
  .badge{display:inline-block;padding:6px 12px;border-radius:6px;
         font-weight:600;margin:4px 0}
  .ok{background:#0a5}.bad{background:#c33}
  pre{background:#1b1b1b;padding:12px;border-radius:8px;overflow:auto;font-size:12px}
</style>
</head>
<body>
  <div><img src="/video" alt="camera stream"></div>
  <div id="panel">
    <h2>Driver status</h2>
    <div id="focus" class="badge bad">ROAD FOCUS: ?</div><br>
    <div id="hands" class="badge bad">HANDS ON WHEEL: ?</div>
    <pre id="raw">connecting...</pre>
  </div>
<script>
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onmessage = (e) => {
    const s = JSON.parse(e.data);
    const f = document.getElementById("focus");
    f.textContent = "ROAD FOCUS: " + (s.focused_on_road ? "YES" : "NO");
    f.className = "badge " + (s.focused_on_road ? "ok" : "bad");
    const hd = document.getElementById("hands");
    hd.textContent = `HANDS ON WHEEL: ${s.hands_in_wheel_zone}/2`;
    hd.className = "badge " + (s.both_hands_on_wheel ? "ok" : "bad");
    document.getElementById("raw").textContent = JSON.stringify(s, null, 2);
  };
  ws.onclose = () => {
    document.getElementById("raw").textContent = "connection closed";
  };
</script>
</body>
</html>
"""


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return INDEX_HTML


if __name__ == "__main__":
    uvicorn.run(app, host=config.HOST, port=config.PORT)
