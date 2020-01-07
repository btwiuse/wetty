import { Xterm } from "./xterm";
import { Terminal, WeTTY, protocols } from "./wetty";
import { ConnectionFactory } from "./websocket";
// import { ConnectionFactory } from "./grpc";

const elem = document.getElementById("terminal")

if (elem !== null) {
    console.log(window.location.hash)

    // term (frontend)
    var term : Terminal = new Xterm(elem);

    // factory (websocket backend)
    const url = (window.location.protocol == "https:" ? 'wss://' : 'ws://') + window.location.host + window.location.pathname + 'ws';
    const factory = new ConnectionFactory(url, protocols);

    // factory (grpc backend)
    /*
    const url = '//localhost:9090';
    const factory = new ConnectionFactory(url, Api.HtopStreamRequest);
    */

    // wetty (hub)
    const wetty = new WeTTY(term, factory);
    const closer = wetty.open();

    window.addEventListener("unload", () => {
        closer();
        term.close();
    });
};
