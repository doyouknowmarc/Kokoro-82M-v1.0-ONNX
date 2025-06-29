function App() {
  const [text, setText] = React.useState('');
  const [audioUrls, setAudioUrls] = React.useState([]);
  const [voices, setVoices] = React.useState([]);
  const [voice, setVoice] = React.useState('');
  const [speed, setSpeed] = React.useState(1);
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

  return (
    <div>
      <h1>Kokoro Speech Synthesis</h1>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Enter text here" />
      <div>
        <button type="button" onClick={() => setText(t => t + (t && !t.endsWith('\n') ? '\n' : '') + '---\n')}>Audio Split</button>
      </div>
      <div className="controls">
        <label>
          Voice:
          <select value={voice} onChange={e => setVoice(e.target.value)}>
            {voices.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Speed:
          <input type="number" step="0.1" min="0.5" max="2" value={speed}
                 onChange={e => setSpeed(e.target.value)} />
        </label>
      </div>
      <div>
        <button onClick={generate} disabled={loading}>Generate Speech</button>
        {loading && <span className="loading"> Processing...</span>}
      </div>
      <div id="audio-container">
        {audioUrls.map((url, idx) => (
          <div key={idx}>
            <audio controls src={url}></audio>
            <a href={url} download={`speech_${idx + 1}.wav`}>Download</a>
          </div>
        ))}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
