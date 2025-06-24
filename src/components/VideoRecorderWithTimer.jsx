import React, { useRef, useState, useEffect } from "react";

const VideoRecorderWithTimer = ({
  width = 400,
  lineColor = "lightgreen",
  lineWidth = 2,
  lineOpacity = 0.8,
  fps = 30,
  downloadFileName = "recording_with_line.webm",
  onRecordingComplete, // ← 録画完了時に URL を返すコールバック
}) => {
  const videoInputRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let animationId;

    async function setupStream() {
      try {
        // 1) カメラ映像＋音声ストリーム取得
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // 2) 生映像を非表示の <video> にセットして再生
        const vidIn = videoInputRef.current;
        vidIn.srcObject = stream;
        await vidIn.play();

        // 3) <canvas> をビデオサイズに合わせる
        const canvas = canvasRef.current;
        canvas.width = vidIn.videoWidth;
        canvas.height = vidIn.videoHeight;
        const ctx = canvas.getContext("2d");

        // 4) 毎フレーム：映像 + 縦線 を <canvas> に描画
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

        // 5) <canvas> 映像ストリーム + 音声トラック を混合
        const canvasStream = canvas.captureStream(fps);
        const mixedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...stream.getAudioTracks(),
        ]);

        // 6) MediaRecorder を mixedStream で初期化
        const recorder = new MediaRecorder(mixedStream, {
          mimeType: "video/webm; codecs=vp8,opus",
        });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            setRecordedChunks((prev) => [...prev, e.data]);
          }
        };

        recorder.onstop = () => {
          // 録画終了後に Blob → URL
          const blob = new Blob(recordedChunks, { type: "video/webm" });
          const url = URL.createObjectURL(blob);

          // 外部コールバックへ URL を通知
          if (onRecordingComplete) {
            onRecordingComplete(url);
          }
        };

        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.error("Stream setup failed:", err);
      }
    }

    setupStream();
    return () => cancelAnimationFrame(animationId);
  }, [fps, lineColor, lineWidth, lineOpacity, onRecordingComplete]);

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

  // ローカルでのダウンロード
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

  // 時間フォーマット(mm:ss.cc)
  const formatTime = (ms) => {
    const total = Math.floor(ms / 1000);
    const m = String(Math.floor(total / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    const cs = String(Math.floor((ms % 1000) / 10)).padStart(2, "0");
    return `${m}:${s}.${cs}`;
  };

  return (
    <div>
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

      {/* コントロール */}
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
