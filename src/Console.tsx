// Copyright 2017-2022 @polkadot/app-utilities authors & contributors
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { useEffect } from "react";
import { Xterm } from "./xterm";
import { protocols, Terminal, WeTTY } from "./wetty";
import { TransportFactory } from "./transport";

import styled from "styled-components";
import "xterm/css/xterm.css";
import "./xterm_customize.css";

interface Props {
  sessionId?: string;
  idName?: string;
  style?: any;
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
      'USER_AGENT': window.navigator.userAgent,
      'SESSION_ID': sessionId ?? '',
    })

    term.fit.fit();
    term.focus();

    // factory (websocket backend)
    // const httpsEnabled = window.location.protocol == "https:";
    const url = `${window.origin.replace(/^http/, 'ws')}/terminal`;
    const factory = new TransportFactory(url, protocols);

    // wetty (hub)
    const wt = new WeTTY(term, factory);
    const closer = wt.open();

    // throttle resize events
    let doit: ReturnType<typeof setTimeout>;
    window.onresize = () => {
      if (doit) clearTimeout(doit);
      doit = setTimeout(()=>{
	if (document.getElementById(idName)) {
	  term.fit.fit()
	  console.log({
	    width: window.innerWidth,
	    height: window.innerHeight,
	  })
	}
      }, 200)
    };

    window.addEventListener("unload", () => {
      closer();
      term.close();
    });

    return () => {
      // Anything in here is fired on component unmount.
      term.mute()
      closer()
    }
  }, []);

  return (
    <div id={idName} style={style}></div>
  );
}

export default React.memo(
  styled(Console)(({ idName = "terminal" }: Props) => `
`),
);
