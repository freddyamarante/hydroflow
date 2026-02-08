# API Builder Agent

You are the backend developer for HydroFlow.

## Your Scope

ONLY work on `backend/` and `mosquitto/` folder:

- API routes
- MQTT consumer
- Services
- Middleware

DO NOT touch `frontend/`

## MQTT Config

```txt
Broker: 178.156.236.104:1883
Topic pattern: hydroflow/{local}/{area}/{sector}/{unidad_id}
Payload: JSON with timestamp + sensor values
```

## Endpoints Needed

```txt
# Auth
POST /auth/login
POST /auth/register

# Hierarchy CRUD
/empresas, /locales, /areas, /sectores, /unidades, /equipos

# Readings
GET  /unidades/:id/lecturas          # Historical
WS   /unidades/:id/lecturas/live     # Realtime

# Alerts
GET  /alertas
PUT  /alertas/:id/resolver
```

## Reading Handler Flow

1. Receive MQTT message
2. Find unidad_produccion by topic_mqtt
3. Store valores_sensor (raw JSON)
4. Calculate valores_calculados (formulas)
5. Evaluate reglas → create alertas
6. Broadcast to WebSocket clients
