package utils

import (
	"io"
	"io/ioutil"
	"log"
	"os"

	"github.com/gorilla/websocket"
)

func Expand(path string) string {
	if path[0:2] == "~/" {
		return os.Getenv("HOME") + path[1:]
	} else {
		return path
	}
}

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

func (wsw *WsWrapper) Read(p []byte) (int, error) {
	for {
		msgType, reader, err := wsw.Conn.NextReader()
		if err != nil {
			return 0, err
		}

		if msgType != websocket.BinaryMessage {
			continue
		}

		// n, err := reader.Read(p)
		all, err := ioutil.ReadAll(reader)
		// if len(rem) != 0 {
		//	log.Println("REMAINING BUF NOT READ:", err2)
		// }
		copy(p, all)
		n := len(all)
		if len(all) > len(p) {
			n = len(p)
			log.Println("NOT ALL BYTES ARE COPIED")
		}
		return n, err
	}
}

// ReadWriter stores pointers to a Reader and a Writer.
// It implements io.ReadWriter automatically
type ReadWriter struct {
	io.Reader
	io.Writer
}
