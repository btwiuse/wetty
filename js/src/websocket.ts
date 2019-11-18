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

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

export class Connection {
    ws: WebSocket;

    constructor(url: string, protocols: string[]) {
        this.ws = new WebSocket(url, protocols);
        this.ws.binaryType = 'arraybuffer';
    }

    open() {
        // nothing todo for websocket
    };

    close() {
        this.ws.close();
    };

    send(msgType: number, data: string) {
        this.ws.send(new TextEncoder().encode(String.fromCharCode(msgType)+data));
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
            callback(ab2str(event.data));
        }
    };

    onClose(callback: () => void) {
        this.ws.onclose = (event) => {
            callback();
        };
    };
}
