package utils

import (
	"io"
	"io/ioutil"

	"github.com/gorilla/websocket"
)

// WsWrapper makes a io.ReadWriter from websocket.Conn, implementing the wetty.Master interface
// it is fed to wetty.New to create a WeTTY, bridging the websocket.Conn and local command
type WsWrapper struct {
	*websocket.Conn
}

func (wsw *WsWrapper) Write(p []byte) (n int, err error) {
	writer, err := wsw.Conn.NextWriter(websocket.BinaryMessage)
	if err != nil {
		return 0, err
	}
	defer writer.Close()
	return writer.Write(p)
}

func (wsw *WsWrapper) Read(buf []byte) (int, error) {
	_, reader, err := wsw.Conn.NextReader()
	if err != nil {
		return 0, err
	}

	msg, err := ioutil.ReadAll(reader)
	if err != nil {
		return 0, err
	}

	copy(buf, msg)

	n := len(msg)
	if n > len(buf) {
		n = len(buf)
	}

	return n, nil
}

// ReadWriter stores pointers to a Reader and a Writer.
// It implements io.ReadWriter automatically
type ReadWriter struct {
	io.Reader
	io.Writer
}
