export class TransportFactory {
  url: string;
  protocols: string[];

  constructor(url: string, protocols: string[]) {
    this.url = url;
    this.protocols = protocols;
  }

  create(): Transport {
    return new Transport(this.url, this.protocols);
  }
}

export class Transport {
  ws: WebSocket;
  online: (data: string) => void;
  enc: TextEncoder;

  str2ab(str: string): ArrayBuffer {
    return this.enc.encode(str);
  }

  constructor(url: string, protocols: string[]) {
    this.ws = new WebSocket(url, protocols);
    this.ws.binaryType = "arraybuffer";
    this.enc = new TextEncoder();
  }

  open() {
    // nothing todo for websocket
  }

  close() {
    this.ws.close();
  }

  resize(cols: number, rows: number) {
    var json = JSON.stringify({
      "version": 2,
      "width": cols,
      "height": rows,
    });
    this.ws.send(this.str2ab(json + "\n"));
  }

  input(data: string) {
    // https://stackoverflow.com/a/29202760/4602592
    var size = 4000;
    var numChunks = Math.ceil(data.length / size);
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      var chunk = data.substr(o, size);
      var json = JSON.stringify([0, "i", chunk]);
      this.ws.send(this.str2ab(json + "\n"));
    }
  }

  onOpen(callback: (ev: Event) => void) {
    this.ws.onopen = callback;
  }

  onMessage(callback: (ev: MessageEvent) => void) {
    this.ws.onmessage = callback;
  }

  onClose(callback: (ev: CloseEvent) => void) {
    this.ws.onclose = callback;
  }
}
