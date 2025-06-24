import React, { useState, useRef, useEffect } from "react";

const VideoPlayer = ({
  videoFile = null, // Blob を受け取る
  onClick,
  initialFrameRate = 30,
}) => {
  const videoRef = useRef(null);

  const [videoSrc, setVideoSrc] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frameRate, setFrameRate] = useState(initialFrameRate);

  // videoFile が来たら自動ロード
  useEffect(() => {
    if (videoFile) {
      // 既存 blob URL 解放
      if (videoSrc && videoSrc.startsWith("blob:")) {
        URL.revokeObjectURL(videoSrc);
      }
      const url = URL.createObjectURL(videoFile);
      setVideoSrc(url);
      setCurrentTime(0);
      setVideoDuration(0);
      setIsPlaying(false);
    }
  }, [videoFile]);

  const currentFrame = Math.floor(currentTime * frameRate);
  const totalFrames = Math.floor(videoDuration * frameRate);

  // ファイル選択で上書き
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (videoSrc && videoSrc.startsWith("blob:")) {
      URL.revokeObjectURL(videoSrc);
    }
    const url = URL.createObjectURL(f);
    setVideoSrc(url);
    setCurrentTime(0);
    setVideoDuration(0);
    setIsPlaying(false);
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (v) setVideoDuration(v.duration);
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (v) setCurrentTime(v.currentTime);
  };

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

  const handleSeekChange = (e) => {
    const v = videoRef.current;
    if (v && v.duration) {
      const pct = Number(e.target.value);
      const t = (pct / 100) * v.duration;
      v.currentTime = t;
      setCurrentTime(t);
    }
  };

  const handlePrevFrame = () => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(0, v.currentTime - 1 / frameRate);
  };
  const handleNextFrame = () => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.min(v.duration, v.currentTime + 1 / frameRate);
  };

  const handleFrameRateChange = (e) => {
    setFrameRate(Number(e.target.value));
  };

  const handleVideoContainerClick = (e) => {
    if (onClick && videoRef.current) {
      onClick(e, videoRef.current);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = String(Math.floor(seconds % 60)).padStart(2, "0");
    const ms = String(Math.floor((seconds % 1) * 1000)).padStart(3, "0");
    return `${m}:${s}.${ms}`;
  };

  return (
    <div>
      {/* ファイルアップロードも可能 */}
      <div style={{ marginBottom: 12 }}>
        <input type="file" accept="video/*" onChange={handleFileChange} />
      </div>

      {/* 動画表示 */}
      <div onClick={handleVideoContainerClick}>
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
      <div style={{ marginTop: 8 }}>
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
      <div style={{ marginTop: 8 }}>
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
