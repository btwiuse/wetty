export class ConnectionFactory {
    url: string;
    protocols: string[];

    constructor(url: string, protocols: string[]) {
        this.url = url;
        this.protocols = protocols;
    };

    create(): Connection {
        return new Connection(this.url, this.protocols);
    };
}

export class Connection {
    ws: WebSocket;

    constructor(url: string, protocols: string[]) {
        this.ws = new WebSocket(url, protocols);
    }

    open() {
        // nothing todo for websocket
	console.log("binaryType = ", this.ws.binaryType);
    };

    close() {
        this.ws.close();
    };

    send(data: string) {
        this.ws.send(data);
    };

    isOpen(): boolean {
        if (this.ws.readyState == WebSocket.CONNECTING ||
            this.ws.readyState == WebSocket.OPEN) {
            return true
        }
        return false
    }

    onOpen(callback: () => void) {
        this.ws.onopen = (event) => {
            callback();
        }
    };

    onReceive(callback: (data: string) => void) {
        this.ws.onmessage = (event) => {
            callback(event.data);
        }
    };

    onClose(callback: () => void) {
        this.ws.onclose = (event) => {
            callback();
        };
    };
}
