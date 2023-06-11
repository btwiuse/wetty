// Copyright 2017-2022 @polkadot/app-btwiuse authors & contributors
// SPDX-License-Identifier: Apache-2.0

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
    let json = JSON.stringify({
      "version": 2,
      "width": cols,
      "height": rows,
    });
    this.ws.send(this.str2ab(json + "\n"));
  }

  resizeWithCmdEnv(
    x: {
      cols: number;
      rows: number;
      cmd?: string[];
      env?: { [key: string]: string };
    },
  ) {
    let y: any = {
      "version": 2,
      "width": x.cols,
      "height": x.rows,
    };
    if (x.cmd) y.command = x.cmd;
    if (x.env) y.env = x.env;
    let json = JSON.stringify(y);
    this.ws.send(this.str2ab(json + "\n"));
  }

  input(data: string) {
    // https://stackoverflow.com/a/29202760/4602592
    let size = 4000;
    let numChunks = Math.ceil(data.length / size);
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      let chunk = data.substr(o, size);
      let json = JSON.stringify([0, "i", chunk]);
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
