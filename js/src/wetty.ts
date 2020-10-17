export const protocols = ["wetty"];

export interface Terminal {
    info(): { cols: number, rows: number };
    output(data: Uint8Array): void;
    showMessage(message: string, timeout: number): void;
    removeMessage(): void;
    onInput(callback: (input: string) => void): void;
    onResize(callback: (cols: number, rows: number) => void): void;
    reset(): void;
    deactivate(): void;
    close(): void;
}

export interface Transport {
    open(): void;
    close(): void;
    input(data: string): void;
    resize(cols: number, rows: number): void;
    onOpen(callback: (ev: Event) => void): void;
    onMessage(callback: (ev: MessageEvent) => void): void;
    onClose(callback: (ev: CloseEvent) => void): void;
}

export interface TransportFactory {
    create(): Transport;
}

export class WeTTY {
    term: Terminal;
    transport: Transport;
    transportFactory: TransportFactory;
    decoder: TextDecoder;

    constructor(term: Terminal, transportFactory: TransportFactory) {
        this.decoder = new TextDecoder();
        this.term = term;
        this.transportFactory = transportFactory;
        this.transport = this.transportFactory.create();
        this.transport.onOpen(() => {
            const termInfo = this.term.info();

            const resizeHandler = (cols: number, rows: number) => {
                this.transport.resize(cols, rows);
            };

            const inputHandler = (input: string) => {
                this.transport.input(input);
            };

            resizeHandler(termInfo.cols, termInfo.rows);

            this.term.onResize(resizeHandler);
            this.term.onInput(inputHandler);
        });

        this.transport.onMessage((event) => {
            var json = JSON.parse(this.decoder.decode(event.data));
            var payload = _base64ToUint8Array(json[2]);
            this.term.output(payload);
        });

        this.transport.onClose(() => {
            this.term.deactivate();
            this.term.showMessage("Connection Closed", 0);
        });
    };

    open() {
        this.transport.open();
    };

    close() {
        this.transport.close();
        this.term.close();
    };
};

// https://stackoverflow.com/questions/21797299/convert-base64-string-to-arraybuffer
function _base64ToUint8Array(base64) {
    var binary_string = atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}
