import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import './App.css'
import Globe from 'react-globe.gl'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const API_BASE = 'http://localhost:8080'


function magColor(mag) {
  if (mag >= 6) return '#ff2d2d'
  if (mag >= 5) return '#ff5a3c'
  if (mag >= 4) return '#ff8c1a'
  if (mag >= 3) return '#ffb020'
  if (mag >= 2) return '#ffd84d'
  return '#8ce99a'
}

function magColorRGB(mag) {
  if (mag >= 6) return '255,45,45'
  if (mag >= 5) return '255,90,60'
  if (mag >= 4) return '255,140,26'
  if (mag >= 3) return '255,176,32'
  if (mag >= 2) return '255,216,77'
  return '140,233,154'
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}


export default function App() {
  const [quakes, setQuakes] = useState([])
  const [selected, setSelected] = useState(null)
  const [toasts, setToasts] = useState([])
  const [connected, setConnected] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(true)
  const globeEl = useRef()
  const seenIds = useRef(new Set())

  const mergeQuakes = useCallback((incoming) => {
    setQuakes((prev) => {
      const map = new Map(prev.map((q) => [q.id, q]))
      for (const q of incoming) map.set(q.id, q)
      return Array.from(map.values())
        .sort((a, b) => b.time - a.time)
        .slice(0, 500)
    })
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/quakes/recent`)
      .then((res) => res.json())
      .then((data) => {
        data.forEach((q) => seenIds.current.add(q.id))
        mergeQuakes(data)
      })
      .catch((err) => console.error('Failed to load quakes', err))
  }, [mergeQuakes])

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true)
        client.subscribe('/topic/quakes', (msg) => {
          const quake = JSON.parse(msg.body)
          mergeQuakes([quake])
          if (!seenIds.current.has(quake.id)) {
            seenIds.current.add(quake.id)
            pushToast(quake)
          }
        })
      },
      onDisconnect: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
    })
    client.activate()
    return () => client.deactivate()
  }, [mergeQuakes])

  useEffect(() => {
    if (!globeEl.current) return
    const controls = globeEl.current.controls()
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.35
    const stop = () => (controls.autoRotate = false)
    controls.addEventListener('start', stop)
    return () => controls.removeEventListener('start', stop)
  }, [])

  function pushToast(quake) {
    const id = `${quake.id}-${Date.now()}`
    setToasts((prev) => [{ ...quake, toastId: id }, ...prev].slice(0, 4))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.toastId !== id))
    }, 8000)
  }

  const focusQuake = useCallback((q) => {
    setSelected(q)
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = false
      globeEl.current.pointOfView(
        { lat: q.latitude, lng: q.longitude, altitude: 1.6 },
        900
      )
    }
  }, [])

  const stats = useMemo(() => {
    const strongest = quakes.reduce((m, q) => (q.magnitude > m ? q.magnitude : m), 0)
    const tsunamis = quakes.filter((q) => q.tsunami === 1)
    const significant = quakes.filter((q) => q.magnitude >= 5)
    return { count: quakes.length, strongest, tsunamis, significant }
  }, [quakes])

  const tsunamiActive = stats.tsunamis.length > 0

  return (
    <div className="app">
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        backgroundColor="#05070f"
        atmosphereColor="#3a7bd5"
        atmosphereAltitude={0.18}
        pointsData={quakes}
        pointLat="latitude"
        pointLng="longitude"
        pointAltitude={(q) => Math.max(0.01, q.magnitude * 0.07)}
        pointColor={(q) => magColor(q.magnitude)}
        pointRadius={(q) => 0.15 + q.magnitude * 0.05}
        pointLabel={(q) =>
          `<div class="globe-label">
             <b>M ${q.magnitude.toFixed(1)}</b> — ${q.place}
             <br/><span>${q.depthKm.toFixed(0)} km deep · ${timeAgo(q.time)}</span>
             ${q.tsunami === 1 ? '<br/><span class="tsu">&#9888; Tsunami flag</span>' : ''}
           </div>`
        }
        onPointClick={focusQuake}
        ringsData={quakes}
        ringLat="latitude"
        ringLng="longitude"
        ringMaxRadius={(q) => Math.max(1, q.magnitude * 1.6)}
        ringColor={(q) => {
          const base = magColorRGB(q.magnitude)
          return (t) => `rgba(${base},${1 - t})`
        }}
        ringPropagationSpeed={1.6}
        ringRepeatPeriod={(q) => Math.max(400, 2200 - q.magnitude * 250)}
      />

      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          <h1>SEISMIC<span>LIVE</span></h1>
        </div>
        <div className={`conn ${connected ? 'on' : 'off'}`}>
          <span className="conn-dot" />
          {connected ? 'Live feed connected' : 'Reconnecting…'}
        </div>
      </header>

      {tsunamiActive && (
        <div className="tsunami-banner" onClick={() => focusQuake(stats.tsunamis[0])}>
          <span className="tsu-icon">&#9888;</span>
          <div>
            <strong>Tsunami flag active</strong>
            <span>
              {stats.tsunamis.length} flagged event
              {stats.tsunamis.length > 1 ? 's' : ''} — strongest M
              {Math.max(...stats.tsunamis.map((t) => t.magnitude)).toFixed(1)}
            </span>
          </div>
          <span className="tsu-cta">View →</span>
        </div>
      )}

      <div className="stats">
        <Stat label="Events" value={stats.count} />
        <Stat label="Strongest" value={`M ${stats.strongest.toFixed(1)}`} color={magColor(stats.strongest)} />
        <Stat label="Significant ≥5" value={stats.significant.length} />
        <Stat label="Tsunami flags" value={stats.tsunamis.length} alert={tsunamiActive} />
      </div>

      <div className="toasts">
        {toasts.map((t) => (
          <div
            key={t.toastId}
            className={`toast ${t.magnitude >= 5 ? 'toast-strong' : ''}`}
            onClick={() => focusQuake(t)}
          >
            <span className="toast-mag" style={{ background: magColor(t.magnitude) }}>
              {t.magnitude.toFixed(1)}
            </span>
            <div className="toast-body">
              <strong>New earthquake</strong>
              <span>{t.place}</span>
            </div>
          </div>
        ))}
      </div>

      <aside className={`history ${historyOpen ? '' : 'collapsed'}`}>
        <div className="history-head">
          <h2>Recent activity</h2>
          <button onClick={() => setHistoryOpen((o) => !o)}>
            {historyOpen ? '›' : '‹'}
          </button>
        </div>
        <div className="history-list">
          {quakes.slice(0, 60).map((q) => (
            <div
              key={q.id}
              className={`hist-row ${selected?.id === q.id ? 'active' : ''}`}
              onClick={() => focusQuake(q)}
            >
              <span className="hist-mag" style={{ background: magColor(q.magnitude) }}>
                {q.magnitude.toFixed(1)}
              </span>
              <div className="hist-meta">
                <span className="hist-place">{q.place}</span>
                <span className="hist-sub">
                  {q.depthKm.toFixed(0)} km · {timeAgo(q.time)}
                  {q.tsunami === 1 && <b className="hist-tsu"> · &#9888; tsunami</b>}
                </span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {selected && (
        <div className="detail">
          <button className="detail-close" onClick={() => setSelected(null)}>×</button>
          <div className="detail-mag" style={{ color: magColor(selected.magnitude) }}>
            M {selected.magnitude.toFixed(1)}
          </div>
          <div className="detail-place">{selected.place}</div>
          <dl className="detail-grid">
            <div><dt>Depth</dt><dd>{selected.depthKm.toFixed(1)} km</dd></div>
            <div><dt>When</dt><dd>{timeAgo(selected.time)}</dd></div>
            <div><dt>Latitude</dt><dd>{selected.latitude.toFixed(3)}</dd></div>
            <div><dt>Longitude</dt><dd>{selected.longitude.toFixed(3)}</dd></div>
          </dl>
          {selected.tsunami === 1 && (
            <div className="detail-tsu">&#9888; Tsunami-flagged zone (USGS)</div>
          )}
          <div className="detail-time">{new Date(selected.time).toLocaleString()}</div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color, alert }) {
  return (
    <div className={`stat ${alert ? 'stat-alert' : ''}`}>
      <div className="stat-value" style={color ? { color } : undefined}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
