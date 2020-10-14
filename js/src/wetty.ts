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
    str2ab(str: string) : ArrayBuffer;
    ab2str(buf: Uint8Array) : string;
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
    transportFactory: TransportFactory;

    constructor(term: Terminal, transportFactory: TransportFactory) {
        this.term = term;
        this.transportFactory = transportFactory;
    };

    open() {
        let transport = this.transportFactory.create();
        let pingTimer: number;

        const setup = () => {
            transport.onOpen(() => {
                const termInfo = this.term.info();

                const resizeHandler = (cols: number, rows: number) => {
                    transport.resize(cols, rows);
                };

                const inputHandler = (input: string) => {
                    transport.input(input);
                };

                resizeHandler(termInfo.cols, termInfo.rows);

                this.term.onResize(resizeHandler);
                this.term.onInput(inputHandler);
            });

            transport.onMessage((event) => {
              var json = JSON.parse(transport.ab2str(event.data));
              var payload = new Uint8Array(transport.str2ab(json[2]));
              this.term.output(payload);
            });

            transport.onClose(() => {
                clearInterval(pingTimer);
                this.term.deactivate();
                this.term.showMessage("Connection Closed", 0);
            });

            transport.open();
        }

        setup();
        return () => {
            transport.close();
        }
    };
};
