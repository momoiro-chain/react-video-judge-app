import React, { useState } from "react";
import VideoRecorderWithTimer from "./components/VideoRecorderWithTimer";
import VideoPlayer from "./components/videoPlayer";

function App() {
  const [recordedUrl, setRecordedUrl] = useState(null);

  return (
    <div style={{ padding: 20 }}>
      <h1>ライン入りビデオレコーダー ＆ プレイヤー</h1>

      <VideoRecorderWithTimer
        width={480}
        lineColor="#00ff00"
        lineWidth={4}
        lineOpacity={0.7}
        fps={24}
        downloadFileName="my_recording.webm"
        onRecordingComplete={(url) => setRecordedUrl(url)}
      />

      {recordedUrl && (
        <div style={{ marginTop: 40 }}>
          <h2>録画結果プレビュー</h2>
          <VideoPlayer
            src={recordedUrl}
            initialFrameRate={24}
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
