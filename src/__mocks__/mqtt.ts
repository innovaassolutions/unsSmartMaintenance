/**
 * Mock implementation for MQTT client
 */

import { EventEmitter } from 'events';

export class MockMqttClient extends EventEmitter {
  public connected = false;
  public reconnecting = false;

  connect() {
    this.connected = true;
    setTimeout(() => this.emit('connect'), 10);
    return this;
  }

  end(_force?: boolean, callback?: () => void) {
    this.connected = false;
    setTimeout(() => {
      this.emit('close');
      if (callback) callback();
    }, 10);
    return this;
  }

  publish(
    _topic: string,
    _message: string | Buffer,
    callback?: (error?: Error) => void
  ) {
    setTimeout(() => {
      if (callback) callback();
    }, 10);
    return this;
  }

  subscribe(_topic: string | string[], callback?: (error?: Error) => void) {
    setTimeout(() => {
      if (callback) callback();
    }, 10);
    return this;
  }

  unsubscribe(_topic: string | string[], callback?: (error?: Error) => void) {
    setTimeout(() => {
      if (callback) callback();
    }, 10);
    return this;
  }
}

export const mockConnect = jest.fn(() => new MockMqttClient());

// Mock the mqtt module
const mqtt = {
  connect: mockConnect,
  Client: MockMqttClient,
};

export default mqtt;
