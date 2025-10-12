export class EventEmitter {
    listeners: any[] = [];

    constructor() {
        this.listeners = [];
    }

    addListener(listener: () => void) {
        this.listeners.push(listener);
    }

    removeListener(listenerToRemove: () => void) {
        this.listeners = this.listeners.filter(listener => listenerToRemove !== listener);
    }

    notify() {
        this.listeners.forEach(listener => listener());
    }

    getListeners() {
        return this.listeners;
    }
}