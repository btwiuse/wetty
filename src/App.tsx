import React, {useEffect, useState} from "react";
import term from "./term.svg";
import "./App.css";

// https://github.com/rrostt/use-datetime
export function useNow() {
  const [now, setNow] = useState(`${new Date()}`)
  useEffect(()=>{
    setInterval(()=>{
      setNow(`${new Date()}`)
    }, 1000)
  })
  return {now}
}

export function useDate() {
  const {now} = useNow()
  return {date: now}
}

export function App() {
  const {date} = useDate();
  return (
    <div className="App">
      <header className="App-header">
        <img src={term} className="App-term" alt="term" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload. {date}
        </p>
        <a
          className="App-link"
          href="https://github.com/btwiuse/react-esbuild-starter"
          target="_blank"
          rel="noopener noreferrer"
        >
          btwiuse/react-esbuild-starter
        </a>
      </header>
    </div>
  );
}
