"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function Home() {
  const [text, setText] = React.useState("")
  const [audioUrls, setAudioUrls] = React.useState<string[]>([])
  const [voices, setVoices] = React.useState<string[]>([])
  const [voice, setVoice] = React.useState("")
  const [speed, setSpeed] = React.useState("1")
  const [pause, setPause] = React.useState("0.5")
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    fetch("/api/voices")
      .then((res) => res.json())
      .then((data) => {
        setVoices(data.voices || [])
        if (data.voices && data.voices.length) {
          setVoice(data.voices[0])
        }
      })
      .catch((err) => console.error(err))
  }, [])

  const generate = async () => {
    if (!text.trim()) return
    setAudioUrls([])
    setLoading(true)
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, speed: parseFloat(speed) }),
      })
      if (!res.ok) throw new Error("Failed to generate")
      const data = await res.json()
      const urls = await Promise.all(
        (data.audios || []).map(async (b64: string) => {
          const resp = await fetch(`data:audio/wav;base64,${b64}`)
          const blob = await resp.blob()
          return URL.createObjectURL(blob)
        })
      )
      setAudioUrls(urls)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const combineAudios = async () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const decoded = await Promise.all(
        audioUrls.map((url) => fetch(url).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)))
      )
      if (!decoded.length) return
      const sampleRate = decoded[0].sampleRate
      const channels = decoded[0].numberOfChannels
      const pauseSamples = Math.round(parseFloat(pause) * sampleRate)
      let total = decoded.reduce((acc, b) => acc + b.length, 0)
      total += pauseSamples * (decoded.length - 1)
      const out = ctx.createBuffer(channels, total, sampleRate)
      let offset = 0
      decoded.forEach((buf, i) => {
        for (let c = 0; c < channels; c++) {
          out.getChannelData(c).set(buf.getChannelData(c), offset)
        }
        offset += buf.length + (i < decoded.length - 1 ? pauseSamples : 0)
      })

      const encodeWav = (audioBuffer: AudioBuffer) => {
        const numOfChan = audioBuffer.numberOfChannels
        const length = audioBuffer.length * numOfChan * 2 + 44
        const buffer = new ArrayBuffer(length)
        const view = new DataView(buffer)
        const writeString = (v: DataView, o: number, s: string) => {
          for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i))
        }
        let o = 0
        writeString(view, o, "RIFF"); o += 4
        view.setUint32(o, length - 8, true); o += 4
        writeString(view, o, "WAVE"); o += 4
        writeString(view, o, "fmt "); o += 4
        view.setUint32(o, 16, true); o += 4
        view.setUint16(o, 1, true); o += 2
        view.setUint16(o, numOfChan, true); o += 2
        view.setUint32(o, audioBuffer.sampleRate, true); o += 4
        view.setUint32(o, audioBuffer.sampleRate * numOfChan * 2, true); o += 4
        view.setUint16(o, numOfChan * 2, true); o += 2
        view.setUint16(o, 16, true); o += 2
        writeString(view, o, "data"); o += 4
        view.setUint32(o, length - o - 4, true); o += 4

        for (let i = 0; i < audioBuffer.length; i++) {
          for (let ch = 0; ch < numOfChan; ch++) {
            const sample = audioBuffer.getChannelData(ch)[i] * 0x7fff
            view.setInt16(o, sample, true); o += 2
          }
        }
        return new Blob([buffer], { type: "audio/wav" })
      }

      const wavBlob = encodeWav(out)
      const url = URL.createObjectURL(wavBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = "combined.wav"
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const wordCount = text.trim().replace(/---/g, "").split(/\s+/).filter((w) => w.length > 0).length
  const breakCount = (text.match(/---/g) || []).length

  const downloadAll = () => {
    audioUrls.forEach((url, idx) => {
      const a = document.createElement("a")
      a.href = url
      a.download = `speech_${idx + 1}.wav`
      a.click()
    })
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div>
        <Label htmlFor="input" className="mb-1 block">Your Text</Label>
        <textarea
          id="input"
          className="w-full border rounded p-2"
          placeholder="Start typing or paste your text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="text-sm text-muted-foreground mt-2">
          {wordCount} words{breakCount > 0 && `, ${breakCount} breaks`}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 items-end">
        <div>
          <Label htmlFor="voice">Voice</Label>
          <select id="voice" className="w-full border rounded p-2" value={voice} onChange={(e) => setVoice(e.target.value)}>
            {voices.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="speed">Speed</Label>
          <div className="flex items-center gap-2">
            <input
              id="speed"
              type="range"
              min="0.25"
              max="2"
              step="0.25"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
            />
            <span>{speed}x</span>
          </div>
        </div>
      </div>
      <Button onClick={generate} disabled={!text.trim() || loading} className="w-full">
        {loading ? "Generating..." : "Generate Speech"}
      </Button>

      {audioUrls.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Downloads</h3>
            <Button variant="ghost" onClick={() => setAudioUrls([])}>Clear</Button>
          </div>
          <div className="space-y-2">
            {audioUrls.map((url, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <audio controls src={url}></audio>
                <a className="underline" href={url} download={`speech_${idx + 1}.wav`}>Download</a>
              </div>
            ))}
          </div>
          {audioUrls.length > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={downloadAll}>Download All</Button>
              <div className="flex items-center gap-2">
                <Label htmlFor="pause">Pause</Label>
                <select id="pause" className="border rounded p-1" value={pause} onChange={(e) => setPause(e.target.value)}>
                  <option value="0">0s</option>
                  <option value="0.5">0.5s</option>
                  <option value="1">1s</option>
                  <option value="2">2s</option>
                  <option value="3">3s</option>
                </select>
              </div>
              <Button variant="secondary" onClick={combineAudios}>Combine</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
