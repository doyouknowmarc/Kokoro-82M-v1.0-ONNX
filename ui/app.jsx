function App() {
  const [text, setText] = React.useState('');
  const [audioUrl, setAudioUrl] = React.useState(null);

  const generate = async () => {
    setAudioUrl(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!res.ok) throw new Error('Failed to generate');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h1>Kokoro Speech Synthesis</h1>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Enter text here" />
      <div>
        <button onClick={generate}>Generate Speech</button>
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
