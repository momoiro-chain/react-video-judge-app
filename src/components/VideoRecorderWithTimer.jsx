import React, { useRef, useState, useEffect } from "react";

const VideoRecorderWithTimer = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    async function setupStream() {
      try {
        // 1) カメラ映像＋音声ストリーム取得
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // 2) <video> でプレビュー
        const videoEl = videoRef.current;
        videoEl.srcObject = stream;
        await videoEl.play();

        // 3) <canvas> のサイズをビデオに合わせる
        const canvasEl = canvasRef.current;
        canvasEl.width = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;
        const ctx = canvasEl.getContext("2d");

        // 4) 毎フレーム、ビデオ＋縦ラインをキャンバスに描画
        function draw() {
          ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
          // 中央に幅2pxの縦ライン
          const lineW = 2;
          const x = (canvasEl.width - lineW) / 2;
          ctx.fillStyle = "lightgreen";
          ctx.globalAlpha = 0.8;
          ctx.fillRect(x, 0, lineW, canvasEl.height);
          ctx.globalAlpha = 1.0;
          requestAnimationFrame(draw);
        }
        draw();

        // 5) キャンバスの映像トラック + 音声トラック をまとめたストリームを MediaRecorder に
        const canvasStream = canvasEl.captureStream(30); // FPS
        const mixedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...stream.getAudioTracks(),
        ]);

        const recorder = new MediaRecorder(mixedStream, {
          mimeType: "video/webm; codecs=vp8,opus",
        });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            setRecordedChunks((prev) => [...prev, e.data]);
          }
        };
        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.error("getUserMedia or MediaRecorder setup error:", err);
      }
    }
    setupStream();
  }, []);

  const startRecording = () => {
    if (!mediaRecorderRef.current) return;
    setRecordedChunks([]);
    mediaRecorderRef.current.start();
    setIsRecording(true);

    const startTs = Date.now();
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - startTs);
    }, 100);
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  const downloadRecording = () => {
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recording_with_line.webm";
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
      {/* プレビュー用ビデオ（見やすいように幅400pxに縮小） */}
      <video
        ref={videoRef}
        style={{ width: "400px", border: "1px solid #ccc" }}
        muted
        autoPlay
      />

      {/* Canvas は非表示にしておいてOK */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={{ margin: "8px 0" }}>
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
        ストップウォッチ: {formatTime(elapsedTime)}
      </div>
    </div>
  );
};

export default VideoRecorderWithTimer;
