import { lib } from "libapps";
import { Xterm } from "./xterm";
import { Hterm } from "./hterm";
import { Terminal, WeTTY, protocols } from "./wetty";
import { ConnectionFactory } from "./websocket";
// import { ConnectionFactory } from "./grpc";

const elem = document.getElementById("terminal")

if (elem !== null) {
    console.log(window.location.hash)

    // term (frontend)
    var term: Terminal;
    if (window.location.hash == '#hterm') {
        console.log("before lib.init");
        var onInit = ()=>{console.log("lib.init")};
        (<any>lib).init(onInit);
        console.log("after lib.init");
        term = new Hterm(elem);
    } else {
        term = new Xterm(elem);
    }
    console.log("after new Xterm/Hterm");

    // factory (websocket backend)
    const httpsEnabled = window.location.protocol == "https:";
    const url = (httpsEnabled ? 'wss://' : 'ws://') + window.location.host + window.location.pathname + 'ws';
    const factory = new ConnectionFactory(url, protocols);

    // factory (grpc backend)
    /*
    const url = '//localhost:9090';
    const factory = new ConnectionFactory(url, Api.HtopStreamRequest);
    */

    // wetty (hub)
    const wt = new WeTTY(term, factory);
    const closer = wt.open();

    window.addEventListener("unload", () => {
        closer();
        term.close();
    });
};
