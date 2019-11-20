// Package wetty provides a protocol and an implementation to
// control terminals thorough networks.
package wetty

import (
	"encoding/json"
	"io"
	"log"
	"sync"

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
	Master interface {
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

	// todo: maybe move the locks to utils.WsWrapper package to tidy things up?
	/* http://www.gorillatoolkit.org/pkg/websocket
	Connections support one concurrent reader and one concurrent writer.

	Applications are responsible for ensuring that no more than one goroutine calls the write methods (NextWriter, SetWriteDeadline, WriteMessage, WriteJSON, EnableWriteCompression, SetCompressionLevel) concurrently and that no more than one goroutine calls the read methods (NextReader, SetReadDeadline, ReadMessage, ReadJSON, SetPongHandler, SetPingHandler) concurrently.
	*/
	MSPair struct {
		mu         sync.Mutex // guards writes to master
		mu2        sync.Mutex // guards writes to slave
		master     Master     // PTY Master, which probably a connection to browser
		slave      Slave      // PTY Slave
		bufferSize int
	}
)

// here master and slave are connected via network
func Pipe(master, slave io.ReadWriteCloser) error {
	errs := make(chan error, 2)
	closeall := func() {
		master.Close()
		slave.Close()
	}

	go func() {
		log.Println("Pipe: master <= slave")
		defer closeall()
		_, err := io.Copy(master, slave)
		errs <- err
		// if you set it to 400, master will receive 399- bytes on each read
		// this value should at least MSPair.bufferSize + 1
		// otherwise some messages may be partially sent
	}()

	go func() {
		log.Println("Pipe: master => slave")
		defer closeall()
		_, err := io.Copy(slave, master)
		errs <- err
	}()

	return <-errs
}

///wetty.go

// New creates a new instance of WeTTY.
// masterConn is a connection to the PTY master,
// typically it's a websocket connection to a client.
// slave is a PTY slave such as a local command with a PTY.
func NewMSPair(master Master, slave Slave) *MSPair {
	return &MSPair{
		master:     master,
		slave:      slave,
		bufferSize: 4096, // this means max websocket message size will be 4096 + 1(msgType)
	}
}

// when to call MSPair, who calls it?
// from the perspective of master/server
func (ms *MSPair) Pipe() error {
	errs := make(chan error, 2)
	// slave >>>{ Output }>>> master >>> client
	// partition raw output in to frames with Output header
	slave2master := func() error {
		buffer := make([]byte, ms.bufferSize)
		for {
			n, err := ms.slave.Read(buffer)
			if err != nil {
				return err
			}

			err = ms.masterSafeWrite(append([]byte{Output}, buffer[:n]...))
			if err != nil {
				return err
			}
		}
	}
	// slave <<<{ ClientDead }<<< master <<<{ ResizeTerminal, Input }<<< client
	master2slave := func() error {
		buffer := make([]byte, ms.bufferSize)
		for {
			n, err := ms.master.Read(buffer)
			if err != nil {
				return err
			}
			switch msgType := buffer[0]; msgType {
			case Input: // written by client
				err = ms.slaveSafeWrite(buffer[1:n])
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
			case ClientDead: // written by master itself
				err = ms.slave.Close()
				if err != nil {
					return err
				}
				log.Println("ClientDead, kill slave")
			}
		}
	}

	// slave => buffer => master
	go func() {
		errs <- slave2master()
	}()

	// slave <= buffer <= master
	go func() {
		errs <- master2slave()
	}()

	return <-errs
}

func (ms *MSPair) masterSafeWrite(data []byte) error {
	ms.mu.Lock()
	defer ms.mu.Unlock()
	_, err := ms.master.Write(data)
	return err
}

func (ms *MSPair) slaveSafeWrite(data []byte) error {
	ms.mu2.Lock()
	defer ms.mu2.Unlock()
	_, err := ms.slave.Write(data)
	return err
}
