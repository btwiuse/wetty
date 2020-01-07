// Package wetty provides a protocol and an implementation to
// control terminals thorough networks.
package wetty

import (
	"encoding/json"
	"io"
	"net"
	"net/http"

	"github.com/btwiuse/wetty/pkg/msg"
	"github.com/gorilla/websocket"
	"github.com/kr/pty"
)

// Protocols defines the name of this protocol,
// which is supposed to be used to the subprotocol of Websockt streams.
// https://stackoverflow.com/questions/37984320/why-doesnt-golang-allow-const-maps
var (
	Protocols = []string{
		"wetty",
	}
	Dialer = &websocket.Dialer{
		Subprotocols:      Protocols,
		EnableCompression: true,
	}
	Upgrader = &websocket.Upgrader{
		Subprotocols:      Protocols,
		EnableCompression: true,
		CheckOrigin:       func(r *http.Request) bool { return true },
	}
)

type Client interface {
	io.ReadWriteCloser
	SizeChan() <-chan *struct {
		Rows int
		Cols int
	}
}

type Session interface {
	io.ReadWriteCloser
	Resize(rows, cols int) error
}

// WeTTY bridges a PTY slave and its PTY master.
// To support text-based streams and side channel commands such as
// terminal resizing, WeTTY uses an original protocol.
type ClientSessionPair struct {
	client     Client  // PTY Master, which probably a connection to browser
	session    Session // PTY Slave
	bufferSize int
}

///wetty.go

// New creates a new instance of WeTTY.
// masterConn is a connection to the PTY master,
// typically it's a websocket connection to a client.
// slave is a PTY slave such as a local command with a PTY.
func NewClientSessionPair(client Client, session Session) *ClientSessionPair {
	return &ClientSessionPair{
		client:     client,
		session:    session,
		bufferSize: 4096, // this means max websocket message size will be 4096 + 1(msgType)
	}
}

func NewClientConn(conn net.Conn) Client {
	return &clientConn{
		Conn: conn,
		sizeChan: make(chan *struct {
			Rows int
			Cols int
		}),
	}
}

type rowcol struct {
	Rows int
	Cols int
}

type clientConn struct {
	net.Conn
	sizeChan chan *struct {
		Rows int
		Cols int
	}
}

func (cc *clientConn) SizeChan() <-chan *struct {
	Rows int
	Cols int
} {
	return cc.sizeChan
}

func (cc *clientConn) Write(p []byte) (int, error) {
	n, err := cc.Conn.Write(append([]byte{byte(msg.Type_SESSION_OUTPUT)}, p...))
	if err != nil {
		return n - 1, err
	}
	return n - 1, nil
}

// p should be at least 4096 bytes
func (cc *clientConn) Read(p []byte) (int, error) {
	limit := 4096
	buf := make([]byte, limit+1)
	n, err := cc.Conn.Read(buf)
	if err != nil {
		return 0, err
	}
	switch msgType := msg.Type(buf[0]); msgType {
	case msg.Type_CLIENT_INPUT: // written by client
		// p = buf[1:n]
		copy(p, buf[1:n])
		return n - 1, nil
	case msg.Type_SESSION_RESIZE: // written by client
		go func() {
			sz := &pty.Winsize{}
			err = json.Unmarshal(buf[1:n], sz)
			if err != nil {
				// log error
				return
			}
			cc.sizeChan <- &struct {
				Rows int
				Cols int
			}{
				int(sz.Rows),
				int(sz.Cols),
			}
		}()
		break
	case msg.Type_SESSION_CLOSE: // written by client
		/* ignore for now
		err = session.Close()
		if err != nil {
			return err
		}
		log.Println("Close, kill session")
		*/
		break
	}
	return 0, nil
}

func (cc *clientConn) Close() error {
	close(cc.sizeChan)
	return cc.Conn.Close()
}

// when to call CSPair, who calls it?
// from the perspective of master/server
func (ms *ClientSessionPair) Pipe() error {
	errs := make(chan error, 2)
	go func() {
		buf := make([]byte, ms.bufferSize)
		// r := strings.NewReader("navigaid")
		_, err := io.CopyBuffer(ms.client, ms.session, buf)
		// _, err := io.CopyBuffer(ms.client, r, buf)
		errs <- err
	}()

	go func() {
		buf := make([]byte, ms.bufferSize)
		_, err := io.CopyBuffer(ms.session, ms.client, buf)
		errs <- err
	}()

	go func() {
		for {
			size := <-ms.client.SizeChan()
			if size == nil {
				return
			}
			err := ms.session.Resize(size.Rows, size.Cols)
			if err != nil {
				errs <- err
			}
		}
	}()

	return <-errs
}
