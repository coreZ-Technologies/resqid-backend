// src/modules/share/notification/notification.eventBus.js
import EventEmitter from 'events';
import { logger } from '#config/logger.js';

class NotificationEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  emit(event, payload) {
    logger.debug({ event, payload }, 'EventBus emit');
    return super.emit(event, payload);
  }

  on(event, handler) {
    super.on(event, handler);
  }

  once(event, handler) {
    super.once(event, handler);
  }

  off(event, handler) {
    super.off(event, handler);
  }
}

export const eventBus = new NotificationEventBus();