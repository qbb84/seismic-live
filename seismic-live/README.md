# 🌍 Seismic Live

A real-time 3D earthquake globe. Live USGS seismic events flow through a Kafka
pipeline and stream onto a rotatable Earth as they happen — with magnitude rings,
click-to-inspect details, live notifications, and tsunami-flag warnings.

![Seismic Live demo](seismicdemo.gif)

Built end to end in about **5 hours**.

## Architecture

```
USGS feed → Producer → Kafka → Consumer → WebSocket → React globe
```

The consumer feeds two channels: a REST endpoint that seeds the globe with history
on load, and a WebSocket push so new quakes appear live without polling.

## Stack

**Backend** — Java 17, Spring Boot, Spring Kafka, WebSocket (STOMP/SockJS), Kafka (KRaft).
**Frontend** — React (Vite), react-globe.gl, @stomp/stompjs.

## Run it

Needs Java 17+, Maven, Docker, Node 18+.

```bash
docker compose up -d        # Kafka
cd backend && mvn spring-boot:run
cd frontend && npm install && npm run dev
```

Open **http://localhost:5173**.

## Notes
Data from the [USGS Earthquake Hazards Program](https://earthquake.usgs.gov/earthquakes/feed/).