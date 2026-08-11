// Copyright 2017-2022 @polkadot/app-utilities authors & contributors
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { useEffect } from "react";
import { init } from "ghostty-web";
import { Ghostty } from "./ghostty";
import { protocols, Terminal, WeTTY } from "./wetty";
import { TransportFactory } from "./transport";

import styled from "styled-components";
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

    if (elem == null) return;

    // https://stackoverflow.com/questions/61254372/my-react-component-is-rendering-twice-because-of-strict-mode
    // in React.StrictMode, Terminal got rendered twice on page load,
    // use this trick to maintain idempotency
    while (elem.childElementCount > 0) elem.removeChild(elem.childNodes[0]);

    let active = true;
    let term: Terminal | null = null;
    let wt: WeTTY | null = null;
    let onUnload: (() => void) | null = null;

    (async () => {
      // Load the Ghostty WASM module before constructing a Terminal.
      try {
        await init();
      } catch (err) {
        if (!active) return;
        const errEl = elem.ownerDocument.createElement("div");
        errEl.className = "xterm-overlay";
        errEl.textContent =
          "Failed to load terminal: " + (err as Error).message;
        elem.appendChild(errEl);
        return;
      }
      if (!active) return;

      // term (frontend)
      term = new Ghostty(elem);
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
      wt = new WeTTY(term, factory);
      wt.open();

      // throttle resize events
      let doit: ReturnType<typeof setTimeout>;
      window.visualViewport!.onresize = () => {
        if (doit) clearTimeout(doit);
        doit = setTimeout(() => {
          if (document.getElementById(idName)) {
            term!.fit.fit();
            console.log({
              width: window.innerWidth,
              height: window.innerHeight,
              viewportWidth: window.visualViewport!.width,
              viewportHeight: window.visualViewport!.height,
            });
          }
        }, 200);
      };

      onUnload = () => {
        wt!.close();
        term!.close();
      };
      window.addEventListener("unload", onUnload);
    })();

    return () => {
      // Anything in here is fired on component unmount.
      active = false;
      if (onUnload) {
        window.removeEventListener("unload", onUnload);
      }
      if (term) {
        term.mute();
        // Best-effort teardown: mimicks the original cleanup.
        try {
          term.close();
        } catch {
          // ignore double-dispose
        }
      }
      if (wt) {
        try {
          wt.close();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return <div id={idName} style={style}></div>;
}

export default React.memo(
  styled(Console)(({ idName = "terminal" }: Props) => `
`),
);
