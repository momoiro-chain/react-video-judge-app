// VideoRecorderWithTimer.jsx
import React, { useRef, useState, useEffect } from "react";

const VideoRecorderWithTimer = ({
  width = 400,
  lineColor = "lightgreen",
  lineWidth = 2,
  lineOpacity = 0.8,
  fps = 30,
  downloadFileName = "recording_with_line.webm",
  onRecordingComplete, // 録画完了時に Blob を返すコールバック
}) => {
  const videoInputRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);

  const [devices, setDevices] = useState([]); // videoinput デバイス一覧
  const [selectedDevice, setSelectedDevice] = useState(""); // 選択中の deviceId

  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);

  // 1) 起動直後にカメラ一覧を取得
  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((deviceInfos) => {
        const videoInputs = deviceInfos.filter((d) => d.kind === "videoinput");
        setDevices(videoInputs);
        if (!selectedDevice && videoInputs.length > 0) {
          setSelectedDevice(videoInputs[0].deviceId);
        }
      })
      .catch(console.error);
  }, []);

  // 2) 選択カメラが変わるたびにストリームを再構築
  useEffect(() => {
    if (!selectedDevice) return;
    let animationId;
    let currentStream;

    const setupStream = async () => {
      // (a) 既存ストリームがあれば停止
      if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop());
      }

      try {
        // (b) 選択中カメラ＋マイクで新ストリーム取得
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedDevice } },
          audio: true,
        });
        currentStream = stream;

        // (c) 非表示 <video> にあてて再生し、サイズ取得
        const vidIn = videoInputRef.current;
        vidIn.srcObject = stream;
        await vidIn.play();

        // (d) <canvas> を video サイズに合わせる
        const canvas = canvasRef.current;
        canvas.width = vidIn.videoWidth;
        canvas.height = vidIn.videoHeight;
        const ctx = canvas.getContext("2d");

        // (e) 毎フレーム、video→canvas→ライン描画
        function drawFrame() {
          ctx.drawImage(vidIn, 0, 0, canvas.width, canvas.height);
          const x = (canvas.width - lineWidth) / 2;
          ctx.globalAlpha = lineOpacity;
          ctx.fillStyle = lineColor;
          ctx.fillRect(x, 0, lineWidth, canvas.height);
          ctx.globalAlpha = 1;
          animationId = requestAnimationFrame(drawFrame);
        }
        drawFrame();

        // (f) canvas ストリーム + 音声で混合ストリームを作成
        const canvasStream = canvas.captureStream(fps);
        const mixedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...stream.getAudioTracks(),
        ]);

        // (g) MediaRecorder 初期化
        const recorder = new MediaRecorder(mixedStream, {
          mimeType: "video/webm; codecs=vp8,opus",
        });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            setRecordedChunks((prev) => [...prev, e.data]);
          }
        };
        recorder.onstop = () => {
          const blob = new Blob(recordedChunks, { type: "video/webm" });
          if (onRecordingComplete) {
            onRecordingComplete(blob);
          }
        };
        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.error("ストリームセットアップ失敗:", err);
      }
    };

    setupStream();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (currentStream) currentStream.getTracks().forEach((t) => t.stop());
    };
  }, [
    selectedDevice,
    fps,
    lineColor,
    lineWidth,
    lineOpacity,
    onRecordingComplete,
  ]);

  // 録画開始
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

  // 録画停止
  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    rec.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  // ダウンロード
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

  // mm:ss.cc フォーマット
  const formatTime = (ms) => {
    const total = Math.floor(ms / 1000);
    const m = String(Math.floor(total / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    const cs = String(Math.floor((ms % 1000) / 10)).padStart(2, "0");
    return `${m}:${s}.${cs}`;
  };

  return (
    <div>
      {/* カメラ切り替えセレクト */}
      <div style={{ marginBottom: 10 }}>
        <label>
          カメラ：
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
          >
            {devices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 非表示のカメラ入力 */}
      <video
        ref={videoInputRef}
        style={{ display: "none" }}
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
