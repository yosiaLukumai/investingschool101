# TransitTag Live Dashboard

A real-time web dashboard for monitoring TransitTag IoT devices via MQTT.

## Features

- **Real-time Data Visualization** - Live updates via WebSocket connection
- **Device Status Monitoring** - Battery level, GSM signal strength, ACC status
- **GPS Tracking** - Latitude, longitude, speed, and satellite count
- **WiFi Hotspot Monitor** - View connected clients and network information
- **Historical Charts** - Battery and GSM signal trends over time
- **Modern UI** - Responsive design with gradient backgrounds and smooth animations

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Dashboard

1. Start the dashboard server:
```bash
npm run dashboard
```

2. Open your browser and navigate to:
```
http://localhost:3000/dashboard.html
```

The dashboard will automatically connect to the MQTT broker and start displaying real-time data.

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

## Port Configuration

Default port: `3000`

To change the port, set the `PORT` environment variable:
```bash
PORT=8080 npm run dashboard
```