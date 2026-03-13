const mqtt = require("mqtt");
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static(__dirname));

// Redirect root to dashboard
app.get('/', (_req, res) => {
  res.redirect('/dashboard.html');
});

// Store recent data
const dataStore = {
  heartbeats: [],
  wifiData: null,
  rfidData: [],
  latestStatus: {
    battery: 0,
    gsm: 0,
    acc: "UNKNOWN",
    time: null,
    satellites: 0,
    speed: 0
  },
  maxHeartbeats: 50
};

// MQTT Connection
const client = mqtt.connect('mqtt://byte-iot.net', {
  port: 1883,
  username: "wayne123",
  password: "dispenser123"
});

const topics = [
  "/topic/#",
  "/topic/transittag/heartbeat/#",
  "/topic/transittag/wifi/#",
  "/topic/transittag/rfid/#",
];

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  topics.forEach(topic => {
    client.subscribe(topic);
  });
});

client.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString());

    // Handle heartbeat messages
    if (topic.includes('/heartbeat/')) {
      dataStore.heartbeats.push({
        ...data,
        timestamp: new Date(data.time || Date.now())
      });

      // Keep only last N heartbeats
      if (dataStore.heartbeats.length > dataStore.maxHeartbeats) {
        dataStore.heartbeats.shift();
      }

      // Update latest status
      dataStore.latestStatus = {
        battery: data.battery,
        gsm: data.gsm,
        acc: data.acc,
        time: data.time,
        satellites: data.satelites,
        speed: data.speed,
        imei: data.imei
      };

      // Broadcast to all WebSocket clients
      broadcast({ type: 'heartbeat', data: data });
    }

    // Handle WiFi messages
    if (topic.includes('/wifi/')) {
      dataStore.wifiData = data;
      broadcast({ type: 'wifi', data: data });
    }

    // Handle RFID messages
    if (topic.includes('/rfid/')) {
      dataStore.rfidData.push({
        ...data,
        timestamp: Date.now()
      });
      if (dataStore.rfidData.length > 20) {
        dataStore.rfidData.shift();
      }
      broadcast({ type: 'rfid', data: data });
    }

  } catch (err) {
    console.error('Error parsing message:', err);
  }
});

// WebSocket handling
function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');

  // Send initial data
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      heartbeats: dataStore.heartbeats,
      wifiData: dataStore.wifiData,
      latestStatus: dataStore.latestStatus,
      rfidData: dataStore.rfidData
    }
  }));

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// API endpoints
app.get('/api/status', (_req, res) => {
  res.json(dataStore.latestStatus);
});

app.get('/api/heartbeats', (_req, res) => {
  res.json(dataStore.heartbeats);
});

app.get('/api/wifi', (_req, res) => {
  res.json(dataStore.wifiData);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Dashboard server running on http://localhost:${PORT}`);
  console.log(`Open your browser to view the dashboard`);
});