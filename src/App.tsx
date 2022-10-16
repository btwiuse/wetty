import React, {useEffect, useState} from "react";
import Console from "./Console";

const Style = {
  left: '0',
  right: '0',
  buttom: '0',
  top: '0',
  width: '100%',
  height: '100%',
  position: 'absolute',
};

export function App() {
  return (
    <div className="App">
      <Console idName="btwiuse-node" style={Style} sessionId={''}/>
    </div>
  );
}
