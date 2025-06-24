import React, { useRef, useState, useEffect } from "react";

const VideoRecorderWithTimer = ({
  width = 400,
  lineColor = "lightgreen",
  lineWidth = 2,
  lineOpacity = 0.8,
  fps = 30,
  downloadFileName = "recording_with_line.webm",
  onRecordingComplete, // Blob を親に渡すコールバック
}) => {
  const videoInputRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);

  const [facingMode, setFacingMode] = useState("user"); // "user" or "environment"
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let animationId;
    let currentStream;

    async function setupStream() {
      // 既存ストリームを停止
      if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop());
      }

      try {
        // facingMode で前面／背面カメラを指定
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: true,
        });
        currentStream = stream;

        // 非表示の <video> にセットして再生
        const vidIn = videoInputRef.current;
        vidIn.srcObject = stream;
        vidIn.muted = true;
        vidIn.playsInline = true;
        await vidIn.play();

        // <canvas> サイズ合わせ
        const canvas = canvasRef.current;
        canvas.width = vidIn.videoWidth;
        canvas.height = vidIn.videoHeight;
        const ctx = canvas.getContext("2d");

        // 毎フレーム、ビデオ＋縦線を描画
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

        // canvas映像 + 音声を混合したストリームを生成
        const canvasStream = canvas.captureStream(fps);
        const mixedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...stream.getAudioTracks(),
        ]);

        // MediaRecorder のローカルチャンク配列
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
          // 録画終了時に最新のチャンクから Blob を作成
          const blob = new Blob(chunks, { type: "video/webm" });
          if (onRecordingComplete) {
            onRecordingComplete(blob);
          }
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
  }, [facingMode, fps, lineColor, lineWidth, lineOpacity, onRecordingComplete]);

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
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    const cs = String(Math.floor((ms % 1000) / 10)).padStart(2, "0");
    return `${m}:${s}.${cs}`;
  };

  return (
    <div>
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

      <video
        ref={videoInputRef}
        style={{ display: "none" }}
        autoPlay
        muted
        playsInline
      />

      <canvas
        ref={canvasRef}
        style={{
          width: `${width}px`,
          border: "1px solid #ccc",
          display: "block",
        }}
      />

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

      <div style={{ fontFamily: "monospace", fontSize: "1.1em" }}>
        ストップウォッチ：{formatTime(elapsedTime)}
      </div>
    </div>
  );
};

export default VideoRecorderWithTimer;
