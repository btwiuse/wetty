import React, { useEffect, useState } from "react";
import Console from "./Console";
import "./App.css";

const Style = {
  height: "100%",
};

export function App() {
  return (
    <div className="App">
      <Console idName="btwiuse-node" style={Style} sessionId={""} />
    </div>
  );
}
