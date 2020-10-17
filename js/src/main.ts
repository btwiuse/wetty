import { Xterm } from "./xterm";
import { Terminal, WeTTY, protocols } from "./wetty";
import { TransportFactory } from "./transport";

const elem = document.getElementById("terminal")

if (elem !== null) {
    console.log(window.location.hash)

    // term (frontend)
    var term: Terminal;
    term = new Xterm(elem);

    // factory (websocket backend)
    const httpsEnabled = window.location.protocol == "https:";
    const url = (httpsEnabled ? 'wss://' : 'ws://') + window.location.host + window.location.pathname + 'terminal';
    const factory = new TransportFactory(url, protocols);

    // wetty (hub)
    const wt = new WeTTY(term, factory);
    wt.open();

    window.addEventListener("unload", () => {
        wt.close();
    });
};
