import React, { useState, useRef, useEffect } from "react";

const VideoPlayer = ({ videoFile = null, onClick, initialFrameRate = 30 }) => {
  const videoRef = useRef(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frameRate, setFrameRate] = useState(initialFrameRate);

  // videoFile または initialFrameRate が変わったら更新
  useEffect(() => {
    if (videoFile) {
      if (videoSrc?.startsWith("blob:")) URL.revokeObjectURL(videoSrc);
      setVideoSrc(URL.createObjectURL(videoFile));
      setCurrentTime(0);
      setVideoDuration(0);
      setIsPlaying(false);
    }
  }, [videoFile]);

  useEffect(() => {
    setFrameRate(initialFrameRate);
  }, [initialFrameRate]);

  // メタデータ・時間更新
  const handleLoadedMetadata = () => {
    setVideoDuration(videoRef.current.duration);
  };
  const handleTimeUpdate = () => {
    setCurrentTime(videoRef.current.currentTime);
  };

  // 再生／一時停止
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

  // シーク
  const handleSeek = (e) => {
    const v = videoRef.current;
    if (v.duration) {
      v.currentTime = (e.target.value / 100) * v.duration;
      setCurrentTime(v.currentTime);
    }
  };

  // コマ送り
  const prevFrame = () => {
    const v = videoRef.current;
    v.currentTime = Math.max(0, v.currentTime - 1 / frameRate);
  };
  const nextFrame = () => {
    const v = videoRef.current;
    v.currentTime = Math.min(v.duration, v.currentTime + 1 / frameRate);
  };

  // ファイルアップロード（任意）
  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (f) {
      if (videoSrc?.startsWith("blob:")) URL.revokeObjectURL(videoSrc);
      setVideoSrc(URL.createObjectURL(f));
      setIsPlaying(false);
      setCurrentTime(0);
      setVideoDuration(0);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60),
      ss = Math.floor(s % 60)
        .toString()
        .padStart(2, "0");
    const ms = Math.floor((s % 1) * 1000)
      .toString()
      .padStart(3, "0");
    return `${m}:${ss}.${ms}`;
  };

  return (
    <div>
      {/* アップロード */}
      <div style={{ marginBottom: 12 }}>
        <input type="file" accept="video/*" onChange={handleFileSelect} />
      </div>

      {/* 動画再生 */}
      <div onClick={(e) => onClick?.(e, videoRef.current)}>
        <video
          ref={videoRef}
          src={videoSrc || undefined}
          preload="metadata"
          controls
          playsInline
          style={{ width: "100%", maxWidth: "100%" }}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
        />
      </div>

      {/* プレイバック操作 */}
      <div style={{ marginTop: 8 }}>
        <button onClick={handlePlayPause}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          value={videoDuration ? (currentTime / videoDuration) * 100 : 0}
          onChange={handleSeek}
          style={{ width: 200, margin: "0 8px" }}
        />
        <span>{formatTime(currentTime)}</span> /{" "}
        <span>{formatTime(videoDuration)}</span>
      </div>

      {/* コマ送り */}
      <div style={{ marginTop: 8 }}>
        <button onClick={prevFrame} disabled={currentTime <= 0}>
          ◀Prev
        </button>
        <span style={{ margin: "0 8px" }}>
          {Math.floor(currentTime * frameRate)} /{" "}
          {Math.floor(videoDuration * frameRate)}
        </span>
        <button onClick={nextFrame} disabled={currentTime >= videoDuration}>
          Next▶
        </button>
        <label style={{ marginLeft: 12 }}>
          fps:
          <input
            type="number"
            value={frameRate}
            min={1}
            max={120}
            onChange={(e) => setFrameRate(Number(e.target.value))}
            style={{ width: 50, marginLeft: 4 }}
          />
        </label>
      </div>
    </div>
  );
};

export default VideoPlayer;
