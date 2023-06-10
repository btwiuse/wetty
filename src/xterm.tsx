// Copyright 2017-2022 @polkadot/app-btwiuse authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { Unicode11Addon } from "xterm-addon-unicode11";
import { WebLinksAddon } from "xterm-addon-web-links";
import { WebFontsAddon } from "xterm-addon-web-fonts";

export class Xterm {
  elem: HTMLElement;
  term: Terminal;
  fit: FitAddon;
  resizeListener: () => void;
  isMuted: boolean = false;

  message: HTMLElement;
  messageTimeout: number;
  messageTimer?: number;
  cmd?: string[];
  env?: {[key: string]: string};

  constructor(elem: HTMLElement) {
    this.elem = elem;
    this.term = new Terminal({
      fontFamily:
        "DejaVu Sans Mono, Everson Mono, FreeMono, Menlo, Terminal, monospace, Apple Symbols",
      allowTransparency: true,
      allowProposedApi: true,
      cursorStyle: 'underline',
      cursorBlink: true,
    });

    this.message = elem.ownerDocument.createElement("div");
    this.message.className = "xterm-overlay";
    this.messageTimeout = 2000;

    this.fit = new FitAddon();
    this.term.loadAddon(this.fit);
    this.term.loadAddon(new Unicode11Addon());
    this.term.loadAddon(new WebLinksAddon());
    this.term.loadAddon(new WebFontsAddon());
    this.term.open(elem);

    this.resizeListener = () => {
      console.log("resize:", this.info());
      this.fit.fit();
      this.term.scrollToBottom();
      this.showMessage(
        String(this.term.cols) + "x" + String(this.term.rows),
        this.messageTimeout,
      );
    };

    window.visualViewport!.addEventListener("resize", this.resizeListener);

    if (window.visualViewport) {
      const viewport = window.visualViewport;
      viewport.addEventListener('resize', ()=>{
        console.log(viewport.height);
      });
    }

    // onopen
    this.resizeListener();

    this.term.unicode.activeVersion = "11";
    this.term.onSelectionChange(() => {
      if (!this.term.getSelection()) return;
      console.log("onSelectionChange:", this.term.getSelection());
      navigator.clipboard.writeText(this.term.getSelection()).then((x) => {
        this.showMessage("Copied", this.messageTimeout);
        console.log(
          this.term.getSelection().length + "bytes copied to clipboard",
          this.messageTimeout,
        );
      });
    });
  }

  info(): { cols: number; rows: number } {
    return { cols: this.term.cols, rows: this.term.rows };
  }

  output(data: string) {
    this.term.write(data);
  }

  focus() {
    this.term.focus();
  }

  showMessage(message: string, timeout: number) {
    if (this.isMuted) return
    this.message.textContent = message;
    this.elem.appendChild(this.message);

    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
    }
    if (timeout > 0) {
      this.messageTimer = window.setTimeout(() => {
        this.elem.removeChild(this.message);
      }, timeout);
    }
  }

  removeMessage(): void {
    if (this.message.parentNode == this.elem) {
      this.elem.removeChild(this.message);
    }
  }

  onInput(callback: (input: string) => void) {
    this.term.onData((data) => {
      callback(data);
    });
  }

  onResize(callback: (cols: number, rows: number) => void) {
    this.term.onResize((data) => {
      // console.log("onresize");
      callback(data.cols, data.rows);
    });
  }

  deactivate(): void {
    // this.term.off("data", (...args: any[]) => {});
    // this.term.off("resize", (...args: any[]) => {});
    this.term.blur();
  }

  reset(): void {
    this.removeMessage();
    this.term.clear();
  }

  setCmd(c: string[]): void {
    this.cmd = c
  }

  setEnv(e: {[key: string]: string}): void {
    this.env = e
  }

  close(): void {
    window.visualViewport!.removeEventListener("resize", this.resizeListener);
    this.term.dispose();
  }

  mute(): void {
    this.isMuted = true;
  }
}
