// VideoRecorderWithTimer.jsx
import React, { useRef, useState, useEffect } from "react";

const VideoRecorderWithTimer = ({
  width = 400,
  lineColor = "lightgreen",
  lineWidth = 2,
  lineOpacity = 0.8,
  downloadFileName = "recording_with_line.webm",
  onRecordingComplete,
}) => {
  const videoInputRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);

  // ユーザー設定
  const [captureFps, setCaptureFps] = useState(30); // 30 or 60
  const [facingMode, setFacingMode] = useState("user"); // "user" or "environment"
  // 実際に得られたFPSと警告
  const [cameraFrameRate, setCameraFrameRate] = useState(null);
  const [fpsWarning, setFpsWarning] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let animationId;
    let currentStream;

    async function setupStream() {
      if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop());
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            frameRate: { ideal: captureFps },
          },
          audio: true,
        });
        currentStream = stream;

        // 実際のFPSを取得
        const [videoTrack] = stream.getVideoTracks();
        let actualFps = null;
        if (videoTrack && videoTrack.getSettings) {
          const settings = videoTrack.getSettings();
          if (settings.frameRate) {
            actualFps = settings.frameRate;
            setCameraFrameRate(actualFps);
            setFpsWarning(actualFps < captureFps);
          }
        }

        // 非表示 video にストリームをセットして再生
        const vidIn = videoInputRef.current;
        vidIn.srcObject = stream;
        vidIn.muted = true;
        vidIn.playsInline = true;
        await vidIn.play();

        // canvas のサイズを video に合わせ
        const canvas = canvasRef.current;
        canvas.width = vidIn.videoWidth;
        canvas.height = vidIn.videoHeight;
        const ctx = canvas.getContext("2d");

        // 毎フレーム：video→縦線→canvas
        function drawFrame() {
          ctx.drawImage(vidIn, 0, 0, canvas.width, canvas.height);
          const x = (canvas.width - lineWidth) / 2;
          ctx.globalAlpha = lineOpacity;
          ctx.fillStyle = lineColor;
          ctx.fillRect(x, 0, lineWidth, canvas.height);
          ctx.globalAlpha = 1.0;
          animationId = requestAnimationFrame(drawFrame);
        }
        drawFrame();

        // canvas ストリーム + 音声トラックを混合
        const canvasStream = canvas.captureStream(captureFps);
        const mixedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...stream.getAudioTracks(),
        ]);

        // MediaRecorder 初期化
        const chunks = [];
        const recorder = new MediaRecorder(mixedStream, {
          mimeType: "video/webm; codecs=vp8,opus",
        });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
            setRecordedChunks([...chunks]);
          }
        };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          onRecordingComplete?.(blob);
        };
        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.error("ストリームセットアップ失敗:", err);
      }
    }

    setupStream();
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (currentStream) currentStream.getTracks().forEach((t) => t.stop());
    };
  }, [
    captureFps,
    facingMode,
    lineColor,
    lineWidth,
    lineOpacity,
    onRecordingComplete,
  ]);

  const startRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    setRecordedChunks([]);
    rec.start();
    setIsRecording(true);
    const t0 = Date.now();
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - t0);
    }, 100);
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    rec.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  const downloadRecording = () => {
    if (!recordedChunks.length) return;
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (ms) => {
    const total = Math.floor(ms / 1000);
    const m = String(Math.floor(total / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    const cs = String(Math.floor((ms % 1000) / 10)).padStart(2, "0");
    return `${m}:${s}.${cs}`;
  };

  return (
    <div>
      {/* FPS 選択 */}
      <div style={{ marginBottom: 10 }}>
        <label>
          撮影FPS：
          <select
            value={captureFps}
            onChange={(e) => setCaptureFps(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          >
            <option value={30}>30fps</option>
            <option value={60}>60fps</option>
          </select>
        </label>
      </div>

      {/* カメラ切り替え */}
      <div style={{ marginBottom: 10 }}>
        <label>
          カメラ：
          <select
            value={facingMode}
            onChange={(e) => setFacingMode(e.target.value)}
            style={{ marginLeft: 8 }}
          >
            <option value="user">フロント</option>
            <option value="environment">リア</option>
          </select>
        </label>
      </div>

      {/* 警告表示 */}
      {fpsWarning && (
        <div style={{ color: "red", marginBottom: 10 }}>
          警告: 選択した {captureFps}fps に対応していません。
          <br />
          実際のカメラFPS:{" "}
          {cameraFrameRate ? cameraFrameRate.toFixed(1) : "取得不可"}
        </div>
      )}

      {/* 非表示カメラ入力 */}
      <video
        ref={videoInputRef}
        style={{ display: "none" }}
        autoPlay
        muted
        playsInline
      />

      {/* プレビュー＆録画用キャンバス */}
      <canvas
        ref={canvasRef}
        style={{
          width: `${width}px`,
          border: "1px solid #ccc",
          display: "block",
        }}
      />

      {/* 録画コントロール */}
      <div style={{ margin: "10px 0" }}>
        {!isRecording ? (
          <button onClick={startRecording}>録画開始</button>
        ) : (
          <button onClick={stopRecording}>録画停止</button>
        )}
        {!isRecording && recordedChunks.length > 0 && (
          <button onClick={downloadRecording} style={{ marginLeft: 8 }}>
            ダウンロード
          </button>
        )}
      </div>

      {/* ストップウォッチ */}
      <div style={{ fontFamily: "monospace", fontSize: "1.1em" }}>
        ストップウォッチ：{formatTime(elapsedTime)}
      </div>
    </div>
  );
};

export default VideoRecorderWithTimer;
