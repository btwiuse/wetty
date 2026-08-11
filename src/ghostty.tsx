// Copyright 2017-2022 @polkadot/app-btwiuse authors & contributors
// SPDX-License-Identifier: Apache-2.0
//
// Drop-in replacement for the old xterm.js wrapper, now backed by
// ghostty-web (NimbleMarkets fork with kitty graphics support).
// Public API matches the `Terminal` interface in ./wetty.ts so the
// WeTTY class can use this without other changes.

import {
  type IDisposable,
  type ITerminalOptions,
  FitAddon,
  Terminal,
} from "ghostty-web";

export class Ghostty {
  elem: HTMLElement;
  term: Terminal;
  fit: FitAddon;
  resizeListener: () => void;
  isMuted: boolean = false;
  onInputCallback: (input: string) => void;
  disposables: IDisposable[] = [];

  message: HTMLElement;
  messageTimeout: number;
  messageTimer?: number;
  cmd?: string[];
  env?: { [key: string]: string };

  constructor(elem: HTMLElement) {
    this.onInputCallback = () => {};
    this.elem = elem;

    const options: ITerminalOptions = {
      fontFamily:
        "DejaVu Sans Mono, Everson Mono, FreeMono, Menlo, Terminal, monospace, Apple Symbols",
      allowTransparency: true,
      cursorStyle: "underline",
      cursorBlink: true,
      // kitty graphics decoder + canvas storage handled automatically by
      // NimbleMarkets' ghostty-web fork (default 64 MB image storage limit).
    };
    this.term = new Terminal(options);

    this.message = elem.ownerDocument.createElement("div");
    this.message.className = "xterm-overlay";
    this.messageTimeout = 2000;

    this.fit = new FitAddon();
    this.term.loadAddon(this.fit);
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
      viewport.addEventListener("resize", () => {
        console.log(viewport.height);
      });
    }

    // onopen
    this.resizeListener();

    // Native unicode handling in Ghostty — no Unicode11Addon needed.
    // (xterm.js required `term.unicode.activeVersion = "11"`; ghostty-web's
    //  IUnicodeVersionProvider.activeVersion is readonly and unused.)

    this.term.onSelectionChange(() => {
      if (!this.term.getSelection()) return;
      console.log("onSelectionChange:", this.term.getSelection());
      navigator.clipboard.writeText(this.term.getSelection()).then(() => {
        this.showMessage("Copied", this.messageTimeout);
        console.log(
          this.term.getSelection().length + "bytes copied to clipboard",
        );
      });
    });

    this.term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      console.log("Key event:", {
        type: event.type,
        key: event.key,
        code: event.code,
        keyCode: event.keyCode,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
      });
      if (event.type === "keydown" && event.ctrlKey && event.key === "c") {
        event.preventDefault();
        // Send ETX (ASCII 3) instead of CR (ASCII 13)
        // console.log("sending ctrl-c");
        this.onInputCallback("\x03");
        return false;
      }
      return true; // let all events pass through
    });
  }

  info(): { cols: number; rows: number } {
    return { cols: this.term.cols, rows: this.term.rows };
  }

  output(data: string) {
    // ghostty-web's GhosttyTerminal.write() does a single
    //   ptr = alloc(bytes.length)
    //   memory.set(bytes, ptr)
    // and throws `RangeError: offset is out of bounds` if the WASM
    // linear memory's current page count can't fit the allocation
    // (the allocator doesn't grow memory on demand). Chunking into
    // small UTF-8-sized pieces keeps every individual alloc well
    // inside the live buffer. If a chunk still fails, we halve and
    // recurse so we degrade gracefully down to a single byte.
    const tryWrite = (s: string): void => {
      try {
        this.term.write(s);
      } catch (err) {
        if (s.length <= 1) {
          console.error(
            "ghostty-web write failed on 1-byte chunk; dropping:",
            err,
          );
          return;
        }
        const mid = s.length >> 1;
        tryWrite(s.slice(0, mid));
        tryWrite(s.slice(mid));
      }
    };

    const CHUNK = 4096;
    for (let i = 0; i < data.length; i += CHUNK) {
      tryWrite(data.slice(i, i + CHUNK));
    }
  }

  focus() {
    this.term.focus();
  }

  showMessage(message: string, timeout: number) {
    if (this.isMuted) return;
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
    this.onInputCallback = callback;
    this.disposables.push(
      this.term.onData((data) => {
        callback(data);
      }),
    );
  }

  onResize(callback: (cols: number, rows: number) => void) {
    this.disposables.push(
      this.term.onResize((data) => {
        callback(data.cols, data.rows);
      }),
    );
  }

  deactivate(): void {
    this.term.blur();
    while (this.disposables.length > 0) {
      this.disposables.pop()!.dispose();
    }
  }

  activate(): void {
    this.term.focus();
    while (this.disposables.length > 0) {
      this.disposables.pop()!.dispose();
    }
  }

  reset(): void {
    this.removeMessage();
    this.term.clear();
  }

  setCmd(c: string[]): void {
    this.cmd = c;
  }

  setEnv(e: { [key: string]: string }): void {
    this.env = e;
  }

  close(): void {
    window.visualViewport!.removeEventListener("resize", this.resizeListener);
    this.term.dispose();
  }

  mute(): void {
    this.isMuted = true;
  }
}
