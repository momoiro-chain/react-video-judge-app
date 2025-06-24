import React, { useState } from "react";
import VideoRecorderWithTimer from "./components/VideoRecorderWithTimer";
import VideoPlayer from "./components/videoPlayer";

function App() {
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedFps, setRecordedFps] = useState(30);

  return (
    <div style={{ padding: 20 }}>
      <h1>ライン入りビデオレコーダー ＆ プレイヤー</h1>

      <VideoRecorderWithTimer
        width={480}
        lineColor="#00ff00"
        lineWidth={4}
        lineOpacity={0.7}
        downloadFileName="my_recording.webm"
        // 録画完了時に Blob と選択した FPS を受け取る
        onRecordingComplete={(blob, fps) => {
          setRecordedBlob(blob);
          setRecordedFps(fps);
        }}
      />

      {recordedBlob && (
        <div style={{ marginTop: 40 }}>
          <h2>録画結果プレビュー</h2>
          <VideoPlayer
            videoFile={recordedBlob}
            // 録画時の FPS をコマ送りに反映
            initialFrameRate={recordedFps}
            onClick={(e, videoEl) => {
              console.log("Video clicked at", e.clientX, e.clientY);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default App;
