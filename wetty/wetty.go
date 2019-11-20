// Package wetty provides a protocol and an implementation to
// control terminals thorough networks.
package wetty

import (
	"encoding/json"
	"io"
	"log"

	"github.com/gorilla/websocket"
	"github.com/kr/pty"
)

///protocol.go

const (
	Input          = iota // SlaveFactory <- Master/Server <- Client/Browser
	Output                // SlaveFactory -> Master/Server -> Client/Browser
	ResizeTerminal        // SlaveFactory <- Master/Server <- Client/Browser
	ClientDead            // SlaveFactory <- Master/Server
	SlaveDead             //                 Master/Server -> Client/Browser
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
	}
)

type (
	Client interface {
		io.Reader
		io.Writer
		io.Closer
	}

	Slave interface {
		io.Reader
		io.Writer
		io.Closer
		ResizeTerminal(*pty.Winsize) error
	}

	// WeTTY bridges a PTY slave and its PTY master.
	// To support text-based streams and side channel commands such as
	// terminal resizing, WeTTY uses an original protocol.
	CSPair struct {
		client     Client // PTY Master, which probably a connection to browser
		slave      Slave  // PTY Slave
		bufferSize int
	}
)

///wetty.go

// New creates a new instance of WeTTY.
// masterConn is a connection to the PTY master,
// typically it's a websocket connection to a client.
// slave is a PTY slave such as a local command with a PTY.
func NewCSPair(client Client, slave Slave) *CSPair {
	return &CSPair{
		client:     client,
		slave:      slave,
		bufferSize: 4096, // this means max websocket message size will be 4096 + 1(msgType)
	}
}

// when to call CSPair, who calls it?
// from the perspective of master/server
func (ms *CSPair) Pipe() error {
	errs := make(chan error, 2)
	// slave >>>{ Output }>>> master >>> client
	// partition raw output in to frames with Output header
	slave2client := func() error {
		buffer := make([]byte, ms.bufferSize)
		for {
			n, err := ms.slave.Read(buffer)
			if err != nil {
				return err
			}

			_, err = ms.client.Write(append([]byte{Output}, buffer[:n]...))
			if err != nil {
				return err
			}
		}
	}
	// slave <<<{ ClientDead }<<< master <<<{ ResizeTerminal, Input }<<< client
	client2slave := func() error {
		buffer := make([]byte, ms.bufferSize)
		for {
			n, err := ms.client.Read(buffer)
			if err != nil {
				return err
			}
			switch msgType := buffer[0]; msgType {
			case Input: // written by client
				_, err = ms.slave.Write(buffer[1:n])
				if err != nil {
					return err
				}
			case ResizeTerminal: // written by client
				sz := &pty.Winsize{}
				err = json.Unmarshal(buffer[1:n], sz)
				if err != nil {
					return err
				}
				err = ms.slave.ResizeTerminal(sz)
				if err != nil {
					return err
				}
				log.Println("new sz:", sz)
			case ClientDead: // written by server itself
				err = ms.slave.Close()
				if err != nil {
					return err
				}
				log.Println("ClientDead, kill slave")
			}
		}
	}

	// slave => buffer => client
	go func() {
		errs <- slave2client()
	}()

	// slave <= buffer <= client
	go func() {
		errs <- client2slave()
	}()

	return <-errs
}
