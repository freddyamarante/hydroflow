import mqtt, { MqttClient } from 'mqtt';
import { config } from '../config/index.js';

let client: MqttClient | null = null;
const messageHandlers: Array<(topic: string, payload: Buffer) => void> = [];

export function connectMqtt(): void {
  const options: mqtt.IClientOptions = {
    reconnectPeriod: 5000,
    connectTimeout: 5000,
  };

  if (config.MQTT_USERNAME) {
    options.username = config.MQTT_USERNAME;
  }
  if (config.MQTT_PASSWORD) {
    options.password = config.MQTT_PASSWORD;
  }

  console.log(`[MQTT] Connecting to ${config.MQTT_BROKER_URL}...`);
  client = mqtt.connect(config.MQTT_BROKER_URL, options);

  client.on('connect', () => {
    console.log(`[MQTT] Connected to ${config.MQTT_BROKER_URL}`);

    client!.subscribe('hydroflow/#', (err) => {
      if (err) {
        console.error('[MQTT] Subscription error:', err);
      } else {
        console.log('[MQTT] Subscribed to hydroflow/#');
      }
    });
  });

  client.on('message', (topic, payload) => {
    for (const handler of messageHandlers) {
      try {
        handler(topic, payload);
      } catch (err) {
        console.error('[MQTT] Handler error:', err);
      }
    }
  });

  client.on('error', () => {
    // Suppress error logging — reconnect handles it
  });

  client.on('reconnect', () => {
    console.log('[MQTT] Reconnecting...');
  });

  client.on('offline', () => {
    console.log('[MQTT] Broker offline, will retry automatically');
  });
}

export function disconnectMqtt(): Promise<void> {
  return new Promise((resolve) => {
    if (client) {
      client.end(false, () => {
        console.log('[MQTT] Disconnected');
        client = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export function getMqttClient(): MqttClient | null {
  return client;
}

export function onMqttMessage(handler: (topic: string, payload: Buffer) => void): void {
  messageHandlers.push(handler);
}
