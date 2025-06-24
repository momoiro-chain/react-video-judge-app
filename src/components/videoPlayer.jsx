import React, { useState, useRef, useEffect } from "react";
//import './App.css'; // 必要に応じてスタイルファイルを変更してください

const VideoPlayer = ({ onClick }) => {
  // AppからのonClickプロパティを受け取る
  const videoRef = useRef(null);

  const [videoSrc, setVideoSrc] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frameRate, setFrameRate] = useState(30);

  const currentFrame = Math.floor(currentTime * frameRate);
  const totalFrames = Math.floor(videoDuration * frameRate);

  // ビデオのクリックハンドラー
  const handleVideoContainerClick = (e) => {
    if (onClick && videoRef.current) {
      onClick(e, videoRef.current); // ビデオ要素を第2引数として渡す
    }
  };

  // ファイル選択時の処理
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (videoSrc) URL.revokeObjectURL(videoSrc); // 既に動画が選択されていたら解放
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setCurrentTime(0);
      setVideoDuration(0);
      setIsPlaying(false);
    }
  };

  // 動画メタデータ読み込み完了時の処理
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setVideoDuration(video.duration);
    }
  };

  // 再生中の時間更新
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  };

  // 時間のフォーマット（分:秒.ミリ秒）
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    return `${minutes}:${secs.toString().padStart(2, "0")}.${millis
      .toString()
      .padStart(3, "0")}`;
  };

  // 再生/一時停止の切り替え
  const handlePlayPause = async () => {
    const video = videoRef.current;
    if (video) {
      try {
        if (video.paused) {
          await video.play();
          setIsPlaying(true);
        } else {
          video.pause();
          setIsPlaying(false);
        }
      } catch (error) {
        console.error("Play/Pause切り替え中のエラー", error);
        setIsPlaying(false);
      }
    }
  };

  // シークバーの変更
  const handleSeekChange = (e) => {
    const video = videoRef.current;
    if (video && video.duration) {
      const value = e.target.value;
      const time = (value / 100) * video.duration;
      video.currentTime = time;
      setCurrentTime(time);
    }
  };

  // 前のフレームへ移動
  const handlePrevFrame = () => {
    const video = videoRef.current;
    if (video) {
      const frameTime = 1 / frameRate;
      video.currentTime = Math.max(0, video.currentTime - frameTime);
    }
  };

  // 次のフレームへ移動
  const handleNextFrame = () => {
    const video = videoRef.current;
    if (video) {
      const frameTime = 1 / frameRate;
      video.currentTime = Math.min(
        video.duration,
        video.currentTime + frameTime
      );
    }
  };

  // フレームレートの変更
  const handleFrameRateChange = (e) => {
    setFrameRate(Number(e.target.value));
  };

  return (
    <>
      {/* 動画ファイル選択 */}
      <div className="file-input-container">
        <input
          type="file"
          id="videoInput"
          accept="video/*"
          className="file-input"
          onChange={handleFileChange}
        />
        <label className="file-input-label" htmlFor="videoInput">
          動画を開く
        </label>
      </div>

      <div className="main-container">
        {/* 動画表示部分 - クリックイベントハンドラーを追加 */}
        <div className="video-container" onClick={handleVideoContainerClick}>
          <video
            id="videoPlayer"
            ref={videoRef}
            src={videoSrc || undefined}
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
          ></video>
        </div>

        {/* コントロールパネル */}
        <div className="video-controls">
          <button
            id="playPauseButton"
            className="control-button"
            onClick={handlePlayPause}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <input
            type="range"
            id="seekBar"
            className="seek-bar"
            value={videoDuration ? (currentTime / videoDuration) * 100 : 0}
            onChange={handleSeekChange}
          />
          <span id="currentTime">{formatTime(currentTime)}</span> /{" "}
          <span id="duration">{formatTime(videoDuration)}</span>
        </div>

        {/* フレーム操作部分 */}
        <div className="frame-controls">
          <button
            id="prevFrame"
            className="frame-button"
            onClick={handlePrevFrame}
            disabled={currentFrame <= 0}
          >
            ◀前フレーム
          </button>
          <div className="frame-info">
            <span>現在のフレーム: </span>
            <span id="currentFrame">{currentFrame}</span>
            <span> / </span>
            <span id="totalFrames">{totalFrames}</span>
          </div>
          <button
            id="nextFrame"
            className="frame-button"
            onClick={handleNextFrame}
            disabled={currentFrame >= totalFrames - 1}
          >
            次フレーム▶
          </button>
          <div className="frame-rate-control">
            <label htmlFor="frameRate">Frame Rate(fps):</label>
            <input
              type="number"
              id="frameRate"
              value={frameRate}
              min="1"
              max="120"
              onChange={handleFrameRateChange}
            />
          </div>
        </div>
      </div>

      <div className="testArea">
        test.{currentFrame}/{totalFrames}
      </div>
    </>
  );
};

export default VideoPlayer;
