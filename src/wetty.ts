// Copyright 2017-2022 @polkadot/app-btwiuse authors & contributors
// SPDX-License-Identifier: Apache-2.0

export const protocols = [];

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
  cmd?: string[];
  env?: { [key: string]: string };
  setCmd(c: string[]): void;
  setEnv(c: { [key: string]: string }): void;
  fit: { fit: () => void };
  mute(): void;
  focus(): void;
}

export interface Transport {
  open(): void;
  close(): void;
  input(data: string): void;
  resize(cols: number, rows: number): void;
  onOpen(callback: (ev: Event) => void): void;
  onMessage(callback: (ev: MessageEvent) => void): void;
  onClose(callback: (ev: CloseEvent) => void): void;
  resizeWithCmdEnv(x: {
    cols: number;
    rows: number;
    cmd?: string[];
    env?: { [key: string]: string };
  }): void;
}

export interface TransportFactory {
  create(): Transport;
}

export class WeTTY {
  decoder: TextDecoder;
  term: Terminal;
  transportFactory: TransportFactory;

  constructor(term: Terminal, transportFactory: TransportFactory) {
    this.decoder = new TextDecoder();
    this.term = term;
    this.transportFactory = transportFactory;
  }

  open() {
    let transport = this.transportFactory.create();

    const setup = () => {
      transport.onOpen(() => {
        const termInfo = this.term.info();

        const resizeHandler = (cols: number, rows: number) => {
          transport.resize(cols, rows);
        };

        const inputHandler = (input: string) => {
          transport.input(input);
        };

        transport.resizeWithCmdEnv({
          cols: termInfo.cols,
          rows: termInfo.rows,
          cmd: this.term.cmd,
          env: this.term.env,
        });

        this.term.onResize(resizeHandler);
        this.term.onInput(inputHandler);
      });

      transport.onMessage((event) => {
        var json = JSON.parse(this.decoder.decode(event.data));
        this.term.output(json[2]);
      });

      transport.onClose(() => {
        this.term.deactivate();
        this.term.showMessage("Connection Closed", 0);
      });

      transport.open();
    };

    setup();
    return () => {
      console.log("transport.close");
      transport.close();
    };
  }
}
