// Copyright 2017-2022 @polkadot/app-btwiuse authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { IDisposable } from "@xterm/xterm";

export const protocols = [];

export interface Terminal {
  info(): { cols: number; rows: number };
  output(data: string): void;
  showMessage(message: string, timeout: number): void;
  removeMessage(): void;
  onInput(callback: (input: string) => void): IDisposable;
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
  termIDisposable: IDisposable;
  transportFactory: TransportFactory;
  transport: Transport;

  constructor(term: Terminal, transportFactory: TransportFactory) {
    this.decoder = new TextDecoder();
    this.term = term;
    this.transportFactory = transportFactory;
    this.transport = null as unknown as Transport;
    this.termIDisposable = {
      dispose: () => {},
    };
  }

  setup(transport: Transport) {
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
      this.termOnInput(inputHandler);
    });

    transport.onMessage((event) => {
      var json = JSON.parse(this.decoder.decode(event.data));
      this.term.output(json[2]);
    });

    transport.onClose(() => {
      // this.term.deactivate();
      this.term.showMessage("Connection Closed.", 0);
      this.termOnInput((_: string) => {
        this.term.removeMessage();
        this.term.showMessage("Reconnecting...", 1000);
        this.open();
      });
    });

    transport.open();
  }

  termOnInput(callback: (input: string) => void) {
    this.termIDisposable.dispose();
    this.termIDisposable = this.term.onInput(callback);
  }

  open() {
    this.transport = this.transportFactory.create();
    this.setup(this.transport);
  }

  close() {
    console.log("transport.close");
    this.transport.close();
  }
}
