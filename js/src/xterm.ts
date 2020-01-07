import { Terminal } from "xterm";
import { WebglAddon } from 'xterm-addon-webgl';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon } from 'xterm-addon-attach';
import { UTF8Decoder } from 'libdot';

// https://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
// the Uatob solution works well except when you receive only part of a multi-byte character
// that's why we need UTF8Decoder

export class Xterm {
    elem: HTMLElement;
    term: Terminal;
    fit: FitAddon;
    webgl: WebglAddon;
    resizeListener: (event: Event) => void;
    resizeListenerWithContext: (event: Event) => void;
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
        this.webgl = new WebglAddon(false);
        this.decoder = new UTF8Decoder();

        this.message = elem.ownerDocument.createElement("div");
        this.message.className = "xterm-overlay";
        this.messageTimeout = 2000;

        this.resizeListener = (event: Event) => {
            console.log("resize:", this.info());
            this.fit.fit();
            this.term.scrollToBottom();
            this.showMessage(String(this.term.cols) + "x" + String(this.term.rows), this.messageTimeout);
        };
        this.resizeListenerWithContext = this.resizeListener.bind(this);

        this.term.open(elem);

        this.term.loadAddon(this.webgl); // Cannot activate WebglRendererAddon before Terminal.open
        this.term.loadAddon(this.fit);

        // onopen
        // this.resizeListener();
        window.addEventListener("resize", this.resizeListenerWithContext);

        this.fit.fit();
        this.term.onSelectionChange(() => {
            console.log("onSelectionChange:", this.term.getSelection());
        });
        this.term.onResize((data) => {
            console.log("onresize", data.cols, data.rows);
            // callback(data.cols, data.rows);
        });
    };

    info(): { columns: number, rows: number } {
        return { columns: this.term.cols, rows: this.term.rows };
    };

    output(data: string) {
        this.term.write(this.decoder.decode(data));
    };

    attach(ws: WebSocket) {
        const attachAddon = new AttachAddon(ws, {bidirectional: true});
        console.log("loadAddon(attachAddon)");
        this.term.loadAddon(attachAddon);
    };

    showMessage(message: string, timeout: number) {
        this.message.textContent = message;
        this.elem.appendChild(this.message);

        if (this.messageTimer) {
            clearTimeout(this.messageTimer);
        }
        if (timeout > 0) {
            this.messageTimer = setTimeout(() => {
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

    onResize(callback: (colmuns: number, rows: number) => void) {
        this.term.onResize((data) => {
            console.log("onresize");
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
        console.log("close called on Terminal::Xterm");
        window.removeEventListener("resize", this.resizeListenerWithContext);
        // once window listener is unregistered, term won't receive any resize event
        // this.onResize((cols: number, rows: number) => {console.log(cols + rows);});
        // dispose not implemented on webgl backend
        // this.term.dispose();
    }
}
