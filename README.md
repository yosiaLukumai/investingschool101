# TransitTag Live Dashboard

A real-time web dashboard for monitoring TransitTag IoT devices via MQTT.

Available in both **Node.js** and **Python** implementations using the same dashboard interface.

## Features

- **Real-time Data Visualization** - Live updates via WebSocket connection
- **Device Status Monitoring** - Battery level, GSM signal strength, ACC status
- **GPS Tracking** - Latitude, longitude, speed, and satellite count
- **WiFi Hotspot Monitor** - View connected clients and network information
- **Historical Charts** - Battery and GSM signal trends over time
- **Modern UI** - Responsive design with gradient backgrounds and smooth animations

## Installation
### Option 1: Node.js Server

1. Install dependencies:
```bash
npm install
```

### Option 2: Python Server

1. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Dashboard

### Option 1: Node.js Server

1. Start the dashboard server:
```bash
npm run dashboard
```

### Option 2: Python Server

1. Start the dashboard server:
```bash
python server.py
```

Or with Python 3:
```bash
python3 server.py
```

### Accessing the Dashboard

2. Open your browser and navigate to:
```
http://localhost:3000/
```

The dashboard will automatically:
- Detect which server type is running (Node.js or Python)
- Connect to the MQTT broker
- Start displaying real-time data

The status indicator will show which server type is connected:
- "Connected (Node.js)" - Running the Node.js server
- "Connected (Python)" - Running the Python server

## Dashboard Components

### Device Status Card
- Device IMEI
- ACC status (ON/OFF)
- Last update timestamp

### Battery Card
- Current voltage level
- Visual battery indicator with color-coded status:
  - Green: >50%
  - Yellow: 25-50%
  - Red: <25%

### GSM Signal Card
- Real-time signal strength (0-31 range)

### GPS Information Card
- Number of satellites
- Current speed
- Latitude and longitude coordinates

### Charts
- **Battery History** - Track voltage levels over time
- **GSM Signal History** - Monitor signal strength trends

### WiFi Hotspot Card
- WiFi SSID and configuration
- Connected clients table with:
  - Device names
  - MAC addresses
  - IP addresses

## MQTT Topics

The dashboard subscribes to:
- `/topic/transittag/heartbeat/#` - Device heartbeat messages
- `/topic/transittag/wifi/#` - WiFi hotspot information
- `/topic/transittag/rfid/#` - RFID events

## Data Retention

- Stores last 50 heartbeat messages
- Keeps last 20 RFID events
- Charts display last 20 data points

## Browser Compatibility

Works with all modern browsers that support:
- WebSocket API
- ES6 JavaScript
- CSS Grid and Flexbox

## Server Implementations

### Node.js Server (`server.js`)
- Uses Express for HTTP server
- Uses `ws` library for WebSocket connections
- Uses `mqtt` package for MQTT broker connection
- Lightweight and fast

### Python Server (`server.py`)
- Uses Flask for HTTP server
- Uses Flask-SocketIO for WebSocket connections
- Uses paho-mqtt for MQTT broker connection
- Easy to extend with Python libraries

Both servers:
- Share the same `dashboard.html` file
- Provide identical functionality
- Connect to the same MQTT broker
- Store the same data structure

## Port Configuration

Default port: `3000`

### Node.js
To change the port, set the `PORT` environment variable:
```bash
PORT=8080 npm run dashboard
```

### Python
To change the port, modify the `PORT` variable in `server.py`:
```python
PORT = 8080  # Change this line
```