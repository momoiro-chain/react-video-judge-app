import React, { useState, useRef, useEffect } from "react";

const VideoPlayer = ({
  src: videoSrcProp = null, // App.jsx から渡される録画URL
  onClick, // クリック時に (e, videoEl) を呼び出し
  initialFrameRate = 30, // 初期フレームレート
}) => {
  const videoRef = useRef(null);

  const [videoSrc, setVideoSrc] = useState(videoSrcProp);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frameRate, setFrameRate] = useState(initialFrameRate);

  const currentFrame = Math.floor(currentTime * frameRate);
  const totalFrames = Math.floor(videoDuration * frameRate);

  // App.jsx から渡された src が変わったら再セット
  useEffect(() => {
    if (videoSrcProp) {
      // 以前の URL がオブジェクト URL なら解放
      if (videoSrc && videoSrc.startsWith("blob:")) {
        URL.revokeObjectURL(videoSrc);
      }
      setVideoSrc(videoSrcProp);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [videoSrcProp]);

  // --- ファイル選択で動画を開く ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // 既存のオブジェクトURLを解放
    if (videoSrc && videoSrc.startsWith("blob:")) {
      URL.revokeObjectURL(videoSrc);
    }
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setCurrentTime(0);
    setVideoDuration(0);
    setIsPlaying(false);
  };

  // --- メタデータ読み込み ---
  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (v) setVideoDuration(v.duration);
  };

  // --- 再生時間更新 ---
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (v) setCurrentTime(v.currentTime);
  };

  // --- 再生 / 一時停止 ---
  const handlePlayPause = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (v.paused) {
        await v.play();
        setIsPlaying(true);
      } else {
        v.pause();
        setIsPlaying(false);
      }
    } catch {
      setIsPlaying(false);
    }
  };

  // --- シークバー操作 ---
  const handleSeekChange = (e) => {
    const v = videoRef.current;
    if (v && v.duration) {
      const pct = Number(e.target.value);
      const t = (pct / 100) * v.duration;
      v.currentTime = t;
      setCurrentTime(t);
    }
  };

  // --- 前後フレーム移動 ---
  const handlePrevFrame = () => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(0, v.currentTime - 1 / frameRate);
  };
  const handleNextFrame = () => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.min(v.duration, v.currentTime + 1 / frameRate);
  };

  // --- フレームレート変更 ---
  const handleFrameRateChange = (e) => {
    setFrameRate(Number(e.target.value));
  };

  // --- クリックイベントを親に伝搬 ---
  const handleVideoContainerClick = (e) => {
    if (onClick && videoRef.current) {
      onClick(e, videoRef.current);
    }
  };

  // --- 時間フォーマット mm:ss.mmm ---
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    const ms = Math.floor((seconds % 1) * 1000)
      .toString()
      .padStart(3, "0");
    return `${m}:${s}.${ms}`;
  };

  return (
    <div>
      {/* ファイルアップロード */}
      <div style={{ marginBottom: 12 }}>
        <input type="file" accept="video/*" onChange={handleFileChange} />
      </div>

      {/* 動画表示エリア */}
      <div className="video-container" onClick={handleVideoContainerClick}>
        <video
          ref={videoRef}
          src={videoSrc || undefined}
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          style={{ maxWidth: "100%", display: "block" }}
        />
      </div>

      {/* 再生コントロール */}
      <div className="video-controls" style={{ marginTop: 8 }}>
        <button onClick={handlePlayPause}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          value={videoDuration ? (currentTime / videoDuration) * 100 : 0}
          onChange={handleSeekChange}
          style={{ width: 200, margin: "0 8px" }}
        />
        <span>{formatTime(currentTime)}</span> /{" "}
        <span>{formatTime(videoDuration)}</span>
      </div>

      {/* フレーム操作 */}
      <div className="frame-controls" style={{ marginTop: 8 }}>
        <button onClick={handlePrevFrame} disabled={currentFrame <= 0}>
          ◀Prev Frame
        </button>
        <span style={{ margin: "0 8px" }}>
          {currentFrame} / {totalFrames}
        </span>
        <button
          onClick={handleNextFrame}
          disabled={currentFrame >= totalFrames - 1}
        >
          Next Frame▶
        </button>
        <label style={{ marginLeft: 12 }}>
          fps:
          <input
            type="number"
            value={frameRate}
            min={1}
            max={120}
            onChange={handleFrameRateChange}
            style={{ width: 50, marginLeft: 4 }}
          />
        </label>
      </div>
    </div>
  );
};

export default VideoPlayer;
