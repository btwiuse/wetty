package main

import (
	"log"
	"os"
	"strings"

	// "github.com/btwiuse/wetty/client"
	"github.com/btwiuse/wetty/pkg/server"
)

func main() {
	// client mode

	//exe, err := os.Executable()
	//if err != nil {
	//	log.Fatalln(err)
	//}
	//if strings.HasSuffix(exe, "client") {
	//	if err := client.New("ws://localhost:8080/ws").Run(); err != nil {
	//		log.Fatalln(err)
	//	}
	//	os.Exit(0)
	//}

	// server mode

	args := os.Args[1:]
	if len(args) == 0 {
		log.Fatalln("usage: wetty [command] [args]...")
	}

	log.Printf("GoTTY is starting with command: %s", strings.Join(args, " "))
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)
	log.Fatalln(server.New(args).Run())
}
