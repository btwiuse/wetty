export class TransportFactory {
    url: string;
    protocols: string[];

    constructor(url: string, protocols: string[]) {
        this.url = url;
        this.protocols = protocols;
    };

    create(): Transport {
        return new Transport(this.url, this.protocols);
    };
}

export class Transport {
    ws: WebSocket;
    online: (data: string) => void;
    enc: TextEncoder;

    /* https://stackoverflow.com/questions/6965107/converting-between-strings-and-arraybuffers
     *
     *   var arrayBufferToString = function(buffer) {
     *     return String.fromCharCode.apply(null, new Uint8Array(buffer));
     *   }
     *
     *   var stringToArrayBuffer = function(str) {
     *     return (new Uint8Array([].map.call(str,function(x){return x.charCodeAt(0)}))).buffer;
     *   }
     */

    str2ab(str: string) : Uint8Array {
      return this.enc.encode(str)
    };

    constructor(url: string, protocols: string[]) {
      this.ws = new WebSocket(url, protocols);
      this.ws.binaryType = 'arraybuffer';
      this.enc = new TextEncoder();
    };

    open() {
      // nothing todo for websocket
    };

    close() {
      this.ws.close();
    };

    resize(cols: number, rows: number) {
      var json = JSON.stringify({
        "version": 2,
        "width": cols,
        "height": rows,
      });
      this.ws.send(this.str2ab(json+"\n"));
    };

    input(data: string) {
      // https://stackoverflow.com/a/29202760/4602592
      var size = 4000;
      var numChunks = Math.ceil(data.length / size);
      for (let i = 0, o = 0; i < numChunks; ++i, o+=size) {
        var chunk = _arrayBufferToBase64(this.str2ab(data.substr(o, size)));
        var json = JSON.stringify([0, "i", chunk]);
        this.ws.send(this.str2ab(json+"\n"));
      }
    };

    onOpen(callback: (ev : Event) => void) {
      this.ws.onopen = callback;
    };

    onMessage(callback: (ev: MessageEvent) => void) {
      this.ws.onmessage = callback
    };

    onClose(callback: (ev: CloseEvent) => void) {
      this.ws.onclose = callback;
    };
}

// https://stackoverflow.com/questions/9267899/arraybuffer-to-base64-encoded-string
function _arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return btoa( binary );
}
