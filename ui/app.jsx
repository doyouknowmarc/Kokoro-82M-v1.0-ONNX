function App() {
  const [text, setText] = React.useState('');
  const [audioUrl, setAudioUrl] = React.useState(null);
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
    setAudioUrl(null);
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed: parseFloat(speed) })
      });
      if (!res.ok) throw new Error('Failed to generate');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
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
        {audioUrl && (
          <div>
            <audio controls src={audioUrl}></audio>
            <a href={audioUrl} download="speech.wav">Download</a>
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
