import React, { useRef, useState, useEffect } from "react";

const VideoRecorderWithTimer = ({
  width = 400, // プレビュー横幅(px)
  lineColor = "lightgreen", // 縦線の色
  lineWidth = 2, // 縦線の太さ(px)
  lineOpacity = 0.8, // 縦線の透過度(0〜1)
  fps = 30, // プレビュー＆録画のFPS
  downloadFileName = "recording_with_line.webm",
  onRecordingComplete, // 録画完了時に Blob を受け取るコールバック
}) => {
  const videoInputRef = useRef(null); // 非表示でカメラ映像を受け取る
  const canvasRef = useRef(null); // 焼き込み＆プレビュー用
  const mediaRecorderRef = useRef(null); // MediaRecorder インスタンス
  const timerRef = useRef(null); // ストップウォッチ用 Interval

  const [facingMode, setFacingMode] = useState("user"); // "user" or "environment"
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);

  // ——————————————
  // カメラ切り替え or パラメータ変化時にストリームを再構築
  useEffect(() => {
    let animationId = null;
    let currentStream = null;

    async function setupStream() {
      // 既存ストリームがあれば停止
      if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop());
      }

      try {
        // facingMode でカメラを指定
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: true,
        });
        currentStream = stream;

        // 非表示 <video> にストリームをセット＆再生
        const vidIn = videoInputRef.current;
        vidIn.srcObject = stream;
        vidIn.muted = true; // インライン自動再生許可のためミュート
        vidIn.playsInline = true;
        await vidIn.play();

        // <canvas> をビデオサイズに合わせる
        const canvas = canvasRef.current;
        canvas.width = vidIn.videoWidth;
        canvas.height = vidIn.videoHeight;
        const ctx = canvas.getContext("2d");

        // 毎フレーム：映像→縦線を描画
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

        // canvas＋音声を混合したストリームを録画用に生成
        const canvasStream = canvas.captureStream(fps);
        const mixedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...stream.getAudioTracks(),
        ]);

        // MediaRecorder 初期化
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
        console.error("カメラストリームのセットアップに失敗:", err);
      }
    }

    setupStream();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (currentStream) currentStream.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, fps, lineColor, lineWidth, lineOpacity, onRecordingComplete]);

  // ——————————————
  // 録画開始
  const startRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    setRecordedChunks([]);
    rec.start();
    setIsRecording(true);

    const startTs = Date.now();
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - startTs);
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

  // ストップウォッチ表示用フォーマット
  const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
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
            value={facingMode}
            onChange={(e) => setFacingMode(e.target.value)}
            style={{ marginLeft: 8 }}
          >
            <option value="user">フロントカメラ</option>
            <option value="environment">リアカメラ</option>
          </select>
        </label>
      </div>

      {/* 非表示のカメラ入力 */}
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
