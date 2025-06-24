import React, { useRef, useState, useEffect } from "react";

const VideoRecorderWithTimer = ({
  width = 400,
  lineColor = "lightgreen",
  lineWidth = 2,
  lineOpacity = 0.8,
  downloadFileName = "recording_with_line.webm",
  onRecordingComplete, // (blob, captureFps) を渡す
}) => {
  const videoInputRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);

  const [captureFps, setCaptureFps] = useState(30); // 30 or 60
  const [facingMode, setFacingMode] = useState("user");
  const [cameraFrameRate, setCameraFrameRate] = useState(null);
  const [fpsWarning, setFpsWarning] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let animationId, currentStream;

    async function setupStream() {
      // 前のストリームを停止
      if (currentStream) currentStream.getTracks().forEach((t) => t.stop());

      try {
        // カメラ取得時にフレームレートと向きを指定
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            frameRate: { ideal: captureFps },
          },
          audio: true,
        });
        currentStream = stream;

        // 実際の FPS を取得し、警告フラグをセット
        const [videoTrack] = stream.getVideoTracks();
        if (videoTrack.getSettings) {
          const actual = videoTrack.getSettings().frameRate;
          setCameraFrameRate(actual);
          setFpsWarning(actual < captureFps);
        }

        // プレビュー用の非表示 <video>
        const vidIn = videoInputRef.current;
        vidIn.srcObject = stream;
        vidIn.muted = true;
        vidIn.playsInline = true;
        await vidIn.play();

        // <canvas> をビデオサイズに合わせて焼き込み
        const canvas = canvasRef.current;
        canvas.width = vidIn.videoWidth;
        canvas.height = vidIn.videoHeight;
        const ctx = canvas.getContext("2d");
        function draw() {
          ctx.drawImage(vidIn, 0, 0);
          const x = (canvas.width - lineWidth) / 2;
          ctx.globalAlpha = lineOpacity;
          ctx.fillStyle = lineColor;
          ctx.fillRect(x, 0, lineWidth, canvas.height);
          ctx.globalAlpha = 1;
          animationId = requestAnimationFrame(draw);
        }
        draw();

        // canvas → MediaRecorder 用ストリーム
        const canvasStream = canvas.captureStream(captureFps);
        const mixed = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...stream.getAudioTracks(),
        ]);

        // 録画セットアップ
        const chunks = [];
        const recorder = new MediaRecorder(mixed, {
          mimeType: "video/webm; codecs=vp8,opus",
        });
        recorder.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          onRecordingComplete?.(blob, captureFps);
        };
        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.error("ストリーム取得失敗:", err);
      }
    }

    setupStream();
    return () => {
      cancelAnimationFrame(animationId);
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
    const s = Math.floor(ms / 1000);
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    const cs = String(Math.floor((ms % 1000) / 10)).padStart(2, "0");
    return `${m}:${sec}.${cs}`;
  };

  return (
    <div>
      {/* FPS 選択 */}
      <div style={{ marginBottom: 10 }}>
        <label>
          撮影FPS：
          <select
            value={captureFps}
            onChange={(e) => setCaptureFps(+e.target.value)}
            style={{ marginLeft: 8 }}
          >
            <option value={30}>30fps</option>
            <option value={60}>60fps</option>
          </select>
        </label>
        {fpsWarning && (
          <span style={{ color: "red", marginLeft: 12 }}>
            ※カメラが{captureFps}fpsに対応していません (実:{" "}
            {cameraFrameRate?.toFixed(1) || "?"}fps)
          </span>
        )}
      </div>

      {/* カメラ切替 */}
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

      {/* 非表示ストリーム受け */}
      <video
        ref={videoInputRef}
        style={{ display: "none" }}
        autoPlay
        muted
        playsInline
      />

      {/* プレビュー用キャンバス (レスポンシブ) */}
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          maxWidth: `${width}px`,
          border: "1px solid #ccc",
          display: "block",
        }}
      />

      {/* 録画操作 */}
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
