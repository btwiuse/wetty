import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { Unicode11Addon } from "xterm-addon-unicode11";
import { WebLinksAddon } from "xterm-addon-web-links";

export class Xterm {
  elem: HTMLElement;
  term: Terminal;
  fit: FitAddon;
  resizeListener: () => void;
  decoder: TextDecoder;

  message: HTMLElement;
  messageTimeout: number;
  messageTimer: number;

  constructor(elem: HTMLElement) {
    this.elem = elem;
    this.term = new Terminal({
      fontFamily:
        "DejaVu Sans Mono, Everson Mono, FreeMono, Menlo, Terminal, monospace, Apple Symbols",
      allowProposedApi: true,
      allowTransparency: true,
      cursorStyle: 'underline',
      cursorBlink: true,
    });
    this.fit = new FitAddon();
    this.decoder = new TextDecoder();

    this.message = elem.ownerDocument.createElement("div");
    this.message.className = "xterm-overlay";
    this.messageTimeout = 2000;

    this.resizeListener = () => {
      // console.log("resize:", this.info());
      this.fit.fit();
      this.term.scrollToBottom();
      this.showMessage(
        String(this.term.cols) + "x" + String(this.term.rows),
        this.messageTimeout,
      );
    };

    this.term.open(elem);
    this.term.loadAddon(new Unicode11Addon());
    this.term.loadAddon(new WebLinksAddon());
    this.term.loadAddon(this.fit);

    // onopen
    this.resizeListener();
    window.addEventListener("resize", () => {
      this.resizeListener();
    });

    this.fit.fit();
    this.term.focus();
    this.term.onSelectionChange(() => {
      console.log("onSelectionChange:", this.term.getSelection());
    });
  }

  info(): { cols: number; rows: number } {
    return { cols: this.term.cols, rows: this.term.rows };
  }

  output(data: string) {
    this.term.write(data);
  }

  showMessage(message: string, timeout: number) {
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

  close(): void {
    window.removeEventListener("resize", this.resizeListener);
    this.term.dispose();
  }
}
