function App() {
  const [text, setText] = React.useState('');
  const [audioUrls, setAudioUrls] = React.useState([]);
  const [voices, setVoices] = React.useState([]);
  const [voice, setVoice] = React.useState('');
  const [speed, setSpeed] = React.useState(1);
  const [pause, setPause] = React.useState('0.5');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/voices')
      .then(res => res.json())
      .then(data => {
        setVoices(data.voices || []);
        if (data.voices && data.voices.length) {
          setVoice(data.voices[0]);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const generate = async () => {
    if (!text.trim()) return;
    setAudioUrls([]);
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed: parseFloat(speed) })
      });
      if (!res.ok) throw new Error('Failed to generate');
      const data = await res.json();
      const urls = await Promise.all(
        (data.audios || []).map(async b64 => {
          const resp = await fetch(`data:audio/wav;base64,${b64}`);
          const blob = await resp.blob();
          return URL.createObjectURL(blob);
        })
      );
      setAudioUrls(urls);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const combineAudios = async () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const decoded = await Promise.all(
        audioUrls.map(url => fetch(url).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)))
      );
      if (!decoded.length) return;
      const sampleRate = decoded[0].sampleRate;
      const channels = decoded[0].numberOfChannels;
      const pauseSamples = Math.round(parseFloat(pause) * sampleRate);
      let total = decoded.reduce((acc, b) => acc + b.length, 0);
      total += pauseSamples * (decoded.length - 1);
      const out = ctx.createBuffer(channels, total, sampleRate);
      let offset = 0;
      decoded.forEach((buf, i) => {
        for (let c = 0; c < channels; c++) {
          out.getChannelData(c).set(buf.getChannelData(c), offset);
        }
        offset += buf.length + (i < decoded.length - 1 ? pauseSamples : 0);
      });

      const encodeWav = audioBuffer => {
        const numOfChan = audioBuffer.numberOfChannels;
        const length = audioBuffer.length * numOfChan * 2 + 44;
        const buffer = new ArrayBuffer(length);
        const view = new DataView(buffer);
        const writeString = (v, o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
        let o = 0;
        writeString(view, o, 'RIFF'); o += 4;
        view.setUint32(o, length - 8, true); o += 4;
        writeString(view, o, 'WAVE'); o += 4;
        writeString(view, o, 'fmt '); o += 4;
        view.setUint32(o, 16, true); o += 4;
        view.setUint16(o, 1, true); o += 2;
        view.setUint16(o, numOfChan, true); o += 2;
        view.setUint32(o, audioBuffer.sampleRate, true); o += 4;
        view.setUint32(o, audioBuffer.sampleRate * numOfChan * 2, true); o += 4;
        view.setUint16(o, numOfChan * 2, true); o += 2;
        view.setUint16(o, 16, true); o += 2;
        writeString(view, o, 'data'); o += 4;
        view.setUint32(o, length - o - 4, true); o += 4;

        for (let i = 0; i < audioBuffer.length; i++) {
          for (let ch = 0; ch < numOfChan; ch++) {
            const sample = audioBuffer.getChannelData(ch)[i] * 0x7fff;
            view.setInt16(o, sample < 0 ? sample : sample, true); o += 2;
          }
        }
        return new Blob([buffer], { type: 'audio/wav' });
      };

      const wavBlob = encodeWav(out);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'combined.wav';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert(err.message);
    }
  };

  const wordCount = text.trim().replace(/---/g, '').split(/\s+/).filter(w => w.length > 0).length;
  const breakCount = (text.match(/---/g) || []).length;

  const downloadAll = () => {
    audioUrls.forEach((url, idx) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = `speech_${idx + 1}.wav`;
      a.click();
    });
  };

  return (
    <div className="container">
      <div className="header"></div>
      <main className="content">
        <div className="input-group">
          <div className="input-header">
            <label>Your Text</label>
            <div className="counts">
              <span>{wordCount} words</span>
              {breakCount > 0 && <span>{breakCount} breaks</span>}
            </div>
          </div>
          <textarea
            placeholder="Start typing or paste your text here. This is where your content will be transformed into natural-sounding speech..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </div>
        <div className="controls">
          <div className="control">
            <label>Voice</label>
            <select value={voice} onChange={e => setVoice(e.target.value)}>
              {voices.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="control">
            <label>Speed</label>
            <div className="speed-range">
              <input
                type="range"
                min="0.25"
                max="2"
                step="0.25"
                value={speed}
                onChange={e => setSpeed(e.target.value)}
              />
              <span>{speed}x</span>
            </div>
          </div>
          <button onClick={generate} disabled={!text.trim() || loading}>
            {loading ? 'Generating...' : 'Generate Speech'}
          </button>
        </div>

        {audioUrls.length > 0 && (
          <div className="downloads">
            <div className="downloads-header">
              <h3>Downloads</h3>
              <button className="clear" onClick={() => setAudioUrls([])}>Clear</button>
            </div>
            <div className="files">
              {audioUrls.map((url, idx) => (
                <div className="file" key={idx}>
                  <div className="info">
                    <div className="dot"></div>
                    <span className="name">speech_output_{idx + 1}.wav</span>
                  </div>
                  <div className="actions">
                    <audio controls src={url}></audio>
                    <a className="download-btn" href={url} download={`speech_${idx + 1}.wav`}>Download</a>
                  </div>
                </div>
              ))}
            </div>
            {audioUrls.length > 1 && (
              <div className="download-actions">
                <button className="download-all" onClick={downloadAll}>Download All</button>
                <div className="combine-controls">
                  <label>Pause</label>
                  <select value={pause} onChange={e => setPause(e.target.value)}>
                    <option value="0">0s</option>
                    <option value="0.5">0.5s</option>
                    <option value="1">1s</option>
                    <option value="2">2s</option>
                    <option value="3">3s</option>
                  </select>
                  <button className="combine-btn" onClick={combineAudios}>Combine</button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
