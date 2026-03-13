#!/usr/bin/env python3
"""
TransitTag Dashboard Server - Python Implementation
Real-time MQTT monitoring with WebSocket support
"""

import json
import logging
from datetime import datetime
from collections import deque
from flask import Flask, send_from_directory, redirect, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import paho.mqtt.client as mqtt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Flask app setup
app = Flask(__name__, static_folder='.')
app.config['SECRET_KEY'] = 'transittag-secret-key'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Data storage
data_store = {
    'heartbeats': deque(maxlen=50),
    'wifi_data': None,
    'rfid_data': deque(maxlen=20),
    'latest_status': {
        'battery': 0,
        'gsm': 0,
        'acc': 'UNKNOWN',
        'time': None,
        'satellites': 0,
        'speed': 0,
        'imei': None
    }
}

# MQTT Configuration
MQTT_BROKER = 'byte-iot.net'
MQTT_PORT = 1883
MQTT_USERNAME = 'wayne123'
MQTT_PASSWORD = 'dispenser123'

TOPICS = [
    "/topic/#/",
    "/topic/transittag/heartbeat/#",
    "/topic/transittag/wifi/#",
    "/topic/transittag/rfid/#",
]

# MQTT Callbacks
def on_connect(client, userdata, flags, rc):
    """Callback when connected to MQTT broker"""
    if rc == 0:
        logger.info('Connected to MQTT broker')
        for topic in TOPICS:
            client.subscribe(topic)
            logger.info(f'Subscribed to {topic}')
    else:
        logger.error(f'Failed to connect to MQTT broker. Return code: {rc}')

def on_message(client, userdata, msg):
    """Callback when MQTT message is received"""
    try:
        topic = msg.topic
        payload = json.loads(msg.payload.decode('utf-8'))

        # Handle heartbeat messages
        if '/heartbeat/' in topic:
            # Add timestamp
            payload['timestamp'] = payload.get('time', datetime.now().isoformat())

            # Store heartbeat
            data_store['heartbeats'].append(payload)

            # Update latest status
            data_store['latest_status'] = {
                'battery': payload.get('battery', 0),
                'gsm': payload.get('gsm', 0),
                'acc': payload.get('acc', 'UNKNOWN'),
                'time': payload.get('time'),
                'satellites': payload.get('satelites', 0),
                'speed': payload.get('speed', 0),
                'imei': payload.get('imei')
            }

            # Broadcast to WebSocket clients
            socketio.emit('mqtt_message', {
                'type': 'heartbeat',
                'data': payload
            }, namespace='/')

        # Handle WiFi messages
        elif '/wifi/' in topic:
            data_store['wifi_data'] = payload

            # Broadcast to WebSocket clients
            socketio.emit('mqtt_message', {
                'type': 'wifi',
                'data': payload
            }, namespace='/')

        # Handle RFID messages
        elif '/rfid/' in topic:
            payload['timestamp'] = datetime.now().isoformat()
            data_store['rfid_data'].append(payload)

            # Broadcast to WebSocket clients
            socketio.emit('mqtt_message', {
                'type': 'rfid',
                'data': payload
            }, namespace='/')

    except json.JSONDecodeError as e:
        logger.error(f'Error parsing JSON message: {e}')
    except Exception as e:
        logger.error(f'Error processing message: {e}')

def on_disconnect(client, userdata, rc):
    """Callback when disconnected from MQTT broker"""
    if rc != 0:
        logger.warning(f'Unexpected MQTT disconnect. Return code: {rc}')

# Initialize MQTT Client
mqtt_client = mqtt.Client()
mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message
mqtt_client.on_disconnect = on_disconnect

# Flask Routes
@app.route('/')
def index():
    """Redirect root to dashboard"""
    return redirect('/dashboard.html')

@app.route('/dashboard.html')
def dashboard():
    """Serve dashboard HTML"""
    return send_from_directory('.', 'dashboard.html')

@app.route('/api/status')
def get_status():
    """Get latest device status"""
    return jsonify(data_store['latest_status'])

@app.route('/api/heartbeats')
def get_heartbeats():
    """Get recent heartbeats"""
    return jsonify(list(data_store['heartbeats']))

@app.route('/api/wifi')
def get_wifi():
    """Get WiFi data"""
    return jsonify(data_store['wifi_data'])

@app.route('/api/rfid')
def get_rfid():
    """Get recent RFID data"""
    return jsonify(list(data_store['rfid_data']))

# WebSocket Events
@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection"""
    logger.info('WebSocket client connected')

    # Send initial data to new client
    emit('mqtt_message', {
        'type': 'init',
        'data': {
            'heartbeats': list(data_store['heartbeats']),
            'wifiData': data_store['wifi_data'],
            'latestStatus': data_store['latest_status'],
            'rfidData': list(data_store['rfid_data'])
        }
    })

@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection"""
    logger.info('WebSocket client disconnected')

def start_mqtt():
    """Start MQTT client connection"""
    try:
        logger.info(f'Connecting to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}')
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
    except Exception as e:
        logger.error(f'Failed to connect to MQTT broker: {e}')

if __name__ == '__main__':
    # Start MQTT connection
    start_mqtt()

    # Start Flask-SocketIO server
    PORT = 3000
    logger.info(f'Dashboard server running on http://localhost:{PORT}')
    logger.info('Open your browser to view the dashboard')

    socketio.run(app, host='0.0.0.0', port=PORT, debug=False)