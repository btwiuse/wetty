// Copyright 2017-2022 @polkadot/app-btwiuse authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { PROTOCOL_VERSION, INPUT_CHUNK_SIZE, ResizeMessage } from "./protocol";

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
  //online: (data: string) => void;
  enc: TextEncoder;

  str2ab(str: string): Uint8Array {
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
    const msg: ResizeMessage = {
      version: PROTOCOL_VERSION,
      width: cols,
      height: rows,
    };
    this.ws.send(this.str2ab(JSON.stringify(msg) + "\n"));
  }

  resizeWithCmdEnv(
    x: {
      cols: number;
      rows: number;
      cmd?: string[];
      env?: Record<string, string>;
    },
  ) {
    const msg: ResizeMessage = {
      version: PROTOCOL_VERSION,
      width: x.cols,
      height: x.rows,
    };
    if (x.cmd) msg.command = x.cmd;
    if (x.env) msg.env = x.env;
    this.ws.send(this.str2ab(JSON.stringify(msg) + "\n"));
  }

  input(data: string) {
    // https://stackoverflow.com/a/29202760/4602592
    const numChunks = Math.ceil(data.length / INPUT_CHUNK_SIZE);
    for (let i = 0, o = 0; i < numChunks; ++i, o += INPUT_CHUNK_SIZE) {
      const chunk = data.substring(o, o + INPUT_CHUNK_SIZE);
      const json = JSON.stringify([0, "i", chunk]);
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
