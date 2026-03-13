
const mqtt = require("mqtt");
const client = mqtt.connect('mqtt://byte-iot.net', {
    port: 1883,
    username: "wayne123",
    password: "dispenser123"
})


const topics = [
  "/topic/#",
  "/topic/transittag/heartbeat/#",
  "/topic/transittag/wifi/#",
  "/topic/transittag/rfid/#",
]



client.on('connect', () => {
  console.log('Connected to mqtt')
  topics.forEach(topic => {
    client.subscribe(topic)
  })
})


// show any message received
client.on('message', (topic, message) => {
  console.log(topic)
  console.log(message.toString())
})
