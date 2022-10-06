export const protocols = ["wetty"];

export interface Terminal {
  info(): { cols: number; rows: number };
  output(data: string): void;
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
  transportFactory: TransportFactory;

  constructor(term: Terminal, transportFactory: TransportFactory) {
    this.term = term;
    this.transportFactory = transportFactory;
  }

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
        const ab2str: (buf: Uint8Array) => string = (buf) => {
          return String.fromCharCode.apply(null, new Uint8Array(buf));
        };
        var json = JSON.parse(ab2str(event.data));
        this.term.output(json[2]);
      });

      transport.onClose(() => {
        clearInterval(pingTimer);
        this.term.deactivate();
        this.term.showMessage("Connection Closed", 0);
      });

      transport.open();
    };

    setup();
    return () => {
      transport.close();
    };
  }
}
