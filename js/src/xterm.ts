import { Terminal } from "xterm";
import { WebglAddon } from 'xterm-addon-webgl';
import { FitAddon } from 'xterm-addon-fit';
import { UTF8Decoder } from 'libdot';

// https://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
// the Uatob solution works well except when you receive only part of a multi-byte character
// that's why we need UTF8Decoder

export class Xterm {
    elem: HTMLElement;
    term: Terminal;
    fit: FitAddon;
    webgl: WebglAddon;
    resizeListener: () => void;
    decoder: UTF8Decoder;

    message: HTMLElement;
    messageTimeout: number;
    messageTimer: number;

    constructor(elem: HTMLElement) {
        this.elem = elem;
        this.term = new Terminal({
            fontFamily: 'DejaVu Sans Mono, Everson Mono, FreeMono, Menlo, Terminal, monospace, Apple Symbols',
            allowTransparency: true
        });
        this.fit = new FitAddon();
        this.webgl = new WebglAddon();
        this.decoder = new UTF8Decoder();

        this.message = elem.ownerDocument.createElement("div");
        this.message.className = "xterm-overlay";
        this.messageTimeout = 2000;

        this.resizeListener = () => {
            // console.log("resize:", this.info());
            this.fit.fit();
            this.term.scrollToBottom();
            this.showMessage(String(this.term.cols) + "x" + String(this.term.rows), this.messageTimeout);
        };

        this.term.open(elem);

        this.term.loadAddon(this.webgl); // Cannot activate WebglRendererAddon before Terminal.open
        this.term.loadAddon(this.fit);

        // onopen
        this.resizeListener();
        window.addEventListener("resize", () => { this.resizeListener(); });

        this.fit.fit();
        this.term.onSelectionChange(() => {
            console.log("onSelectionChange:", this.term.getSelection());
        });
    };

    info(): { cols: number, rows: number } {
        return { cols: this.term.cols, rows: this.term.rows };
    };

    output(data: string) {
        this.term.write(this.decoder.decode(data));
    };

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
    };

    removeMessage(): void {
        if (this.message.parentNode == this.elem) {
            this.elem.removeChild(this.message);
        }
    }

    onInput(callback: (input: string) => void) {
        this.term.onData((data) => {
            callback(data);
        });
    };

    onResize(callback: (cols: number, rows: number) => void) {
        this.term.onResize((data) => {
            // console.log("onresize");
            callback(data.cols, data.rows);
        });
    };

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
