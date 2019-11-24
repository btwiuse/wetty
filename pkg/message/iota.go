package message

const (
	ClientInput   = iota // SlaveFactory <- Master/Server <- Client/Browser
	SessionOutput        // SlaveFactory -> Master/Server -> Client/Browser
	SessionResize        // SlaveFactory <- Master/Server <- Client/Browser
	SessionClose         // SlaveFactory <- Master/Server <- Client/Browser
	ClientClose          //                 Master/Server -> Client/Browser
)

func ToString(t byte) string {
	m := map[byte]string{
		ClientInput:   "ClientInput",
		SessionOutput: "SessionOutput",
		SessionResize: "SessionResize",
		SessionClose:  "SessionClose",
		ClientClose:   "ClientClose",
	}
	return m[t]
}
