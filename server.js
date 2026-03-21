const mqtt = require("mqtt");
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.json());
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
  maxHeartbeats: 50,
  // Command center data
  connectedDevices: {},      // { imei: { imei, type, lastSeen } }
  commandHistory: [],        // sent commands with optional responses
  cmdResponses: [],          // raw cmd responses feed
  maxCommandHistory: 100,
  maxCmdResponses: 50
};

// MQTT Connection
const mqttClient = mqtt.connect('mqtt://byte-iot.net', {
  port: 1883,
  username: "wayne123",
  password: "dispenser123"
});

const topics = ["/topic/#"];

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  topics.forEach(topic => {
    mqttClient.subscribe(topic);
  });
});

mqttClient.on('message', (topic, message) => {
  const rawMessage = message.toString();
  const topicParts = topic.split('/');
  const imei = topicParts[topicParts.length - 1];
  const isTracker = topic.includes('/tracker/');
  const isTransittag = topic.includes('/transittag/');
  const deviceType = isTracker ? 'tracker' : isTransittag ? 'transittag' : 'unknown';

  // Handle login (plain text payload = IMEI)
  if (topic.includes('/login/')) {
    dataStore.connectedDevices[imei] = {
      imei,
      type: deviceType,
      lastSeen: new Date().toISOString()
    };
    broadcast({ type: 'device_login', data: { imei, deviceType, timestamp: new Date().toISOString() } });
    return;
  }

  // Handle cmd response (plain text, multi-line)
  if (topic.match(/\/cmd\/[^/]+$/) && !topic.includes('/heartbeat/') && !topic.includes('/wifi/') && !topic.includes('/rfid/')) {
    // Only treat as cmd if it's not a JSON-type topic
    const looksLikeText = !rawMessage.trim().startsWith('{');
    if (looksLikeText) {
      const response = {
        imei,
        deviceType,
        response: rawMessage,
        timestamp: new Date().toISOString()
      };
      dataStore.cmdResponses.unshift(response);
      if (dataStore.cmdResponses.length > dataStore.maxCmdResponses) dataStore.cmdResponses.pop();

      // Match to most recent pending command for this device
      const pending = dataStore.commandHistory.find(
        c => c.imei === imei && c.deviceType === deviceType && !c.response
      );
      if (pending) {
        pending.response = rawMessage;
        pending.respondedAt = new Date().toISOString();
        broadcast({ type: 'command_response_matched', data: { id: pending.id, response: rawMessage, respondedAt: pending.respondedAt } });
      }
      broadcast({ type: 'cmd_response', data: response });
      return;
    }
  }

  // JSON-based messages: heartbeat, wifi, rfid
  try {
    const data = JSON.parse(rawMessage);

    if (topic.includes('/heartbeat/')) {
      dataStore.heartbeats.push({
        ...data,
        timestamp: new Date(data.time || Date.now())
      });
      if (dataStore.heartbeats.length > dataStore.maxHeartbeats) {
        dataStore.heartbeats.shift();
      }
      dataStore.latestStatus = {
        battery: data.battery,
        gsm: data.gsm,
        acc: data.acc,
        time: data.time,
        satellites: data.satelites,
        speed: data.speed,
        imei: data.imei,
        latitude: data.latitude,
        longitude: data.longitude
      };
      broadcast({ type: 'heartbeat', data: data });
    }

    if (topic.includes('/wifi/')) {
      dataStore.wifiData = data;
      broadcast({ type: 'wifi', data: data });
    }

    if (topic.includes('/rfid/')) {
      dataStore.rfidData.push({ ...data, timestamp: Date.now() });
      if (dataStore.rfidData.length > 20) dataStore.rfidData.shift();
      broadcast({ type: 'rfid', data: data });
    }

  } catch (_err) {
    // Not JSON — ignore (already handled plain text above)
  }
});

// WebSocket handling
function broadcast(message) {
  wss.clients.forEach(wsClient => {
    if (wsClient.readyState === WebSocket.OPEN) {
      wsClient.send(JSON.stringify(message));
    }
  });
}

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      heartbeats: dataStore.heartbeats,
      wifiData: dataStore.wifiData,
      latestStatus: dataStore.latestStatus,
      rfidData: dataStore.rfidData,
      connectedDevices: Object.values(dataStore.connectedDevices),
      commandHistory: dataStore.commandHistory,
      cmdResponses: dataStore.cmdResponses
    }
  }));
  ws.on('close', () => console.log('WebSocket client disconnected'));
});

// API endpoints
app.get('/api/status', (_req, res) => res.json(dataStore.latestStatus));
app.get('/api/heartbeats', (_req, res) => res.json(dataStore.heartbeats));
app.get('/api/wifi', (_req, res) => res.json(dataStore.wifiData));
app.get('/api/devices', (_req, res) => res.json(Object.values(dataStore.connectedDevices)));
app.get('/api/commands', (_req, res) => res.json(dataStore.commandHistory));

// Send command to device
app.post('/api/command', (req, res) => {
  const { deviceType, imei, command } = req.body;
  if (!deviceType || !imei || !command) {
    return res.status(400).json({ error: 'deviceType, imei, and command are required' });
  }
  const topic = `/topic/${deviceType}/${imei}`;
  const entry = {
    id: Date.now(),
    deviceType,
    imei,
    command,
    topic,
    sentAt: new Date().toISOString(),
    response: null,
    respondedAt: null
  };
  mqttClient.publish(topic, command, { qos: 1 }, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    dataStore.commandHistory.unshift(entry);
    if (dataStore.commandHistory.length > dataStore.maxCommandHistory) dataStore.commandHistory.pop();
    broadcast({ type: 'command_sent', data: entry });
    res.json({ success: true, entry });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Dashboard server running on http://localhost:${PORT}`);
  console.log(`Command Center: http://localhost:${PORT}/command-center.html`);
});