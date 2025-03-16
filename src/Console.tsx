// Copyright 2017-2022 @polkadot/app-utilities authors & contributors
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { useEffect } from "react";
import { Xterm } from "./xterm";
import { protocols, Terminal, WeTTY } from "./wetty";
import { TransportFactory } from "./transport";

import styled from "styled-components";
import "@xterm/xterm/css/xterm.css";
import "./xterm_customize.css";

interface Props {
  sessionId?: string;
  idName?: string;
  style?: any;
}

function autoPrefix(url: string) {
  if (!URL.canParse(url)) {
    const httpsEnabled = window.location.protocol == "https:";
    const prefix = httpsEnabled ? "wss://" : "ws://";
    return prefix + url;
  }

  let parsedUrl = URL.parse(url)!;
  switch (parsedUrl.protocol) {
    case "http:":
    case "ws:":
      parsedUrl.protocol = "ws:";
      break;
    case "https:":
    case "wss:":
      parsedUrl.protocol = "wss:";
      break;
    default:
      throw new Error("Unsupported protocol: " + parsedUrl.protocol);
  }

  return parsedUrl.toString();
}

function Console({ idName = "terminal", style, sessionId }: Props) {
  useEffect(() => {
    const elem = document.getElementById(idName);

    let id = "undefined";

    if (elem == null) return;

    // https://stackoverflow.com/questions/61254372/my-react-component-is-rendering-twice-because-of-strict-mode
    // in React.StrictMode, Terminal got rendered twice on page load,
    // use this trick to maintain idempotency
    while (elem.childElementCount > 0) elem.removeChild(elem.childNodes[0]);

    // term (frontend)
    var term: Terminal;
    term = new Xterm(elem);
    term.setCmd(["bash"]);
    term.setEnv({
      "USER_AGENT": window.navigator.userAgent,
      "SESSION_ID": sessionId ?? "",
    });

    term.fit.fit();
    term.focus();

    // factory (websocket backend)
    const localUrl = new URL("/terminal", window.location.href).toString();
    const queryUrl = new URLSearchParams(window.location.search).get(
      "terminal",
    );
    const terminalUrl = autoPrefix(queryUrl || localUrl);
    const factory = new TransportFactory(terminalUrl, protocols);

    // wetty (hub)
    const wt = new WeTTY(term, factory);
    wt.open();

    // throttle resize events
    let doit: ReturnType<typeof setTimeout>;
    window.visualViewport!.onresize = () => {
      if (doit) clearTimeout(doit);
      doit = setTimeout(() => {
        if (document.getElementById(idName)) {
          term.fit.fit();
          console.log({
            width: window.innerWidth,
            height: window.innerHeight,
            viewportWidth: window.visualViewport!.width,
            viewportHeight: window.visualViewport!.height,
          });
        }
      }, 200);
    };

    window.addEventListener("unload", () => {
      wt.close();
      term.close();
    });

    return () => {
      // Anything in here is fired on component unmount.
      term.mute();
      wt.close();
    };
  }, []);

  return <div id={idName} style={style}></div>;
}

export default React.memo(
  styled(Console)(({ idName = "terminal" }: Props) => `
`),
);
