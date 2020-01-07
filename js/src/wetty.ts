import { Type } from "../msg/types_pb"
export const protocols = ["wetty"];

export interface Terminal {
    info(): { columns: number, rows: number };
    output(data: string): void;
    attach(ws: WebSocket): void;
    showMessage(message: string, timeout: number): void;
    removeMessage(): void;
    onInput(callback: (input: string) => void): void;
    onResize(callback: (colmuns: number, rows: number) => void): void;
    reset(): void;
    deactivate(): void;
    close(): void;
}

export interface Connection {
    ws: WebSocket;
    open(): void;
    close(): void;
    send(msgType: number, data: string): void;
    isOpen(): boolean;
    onOpen(callback: () => void): void;
    onReceive(callback: (data: string) => void): void;
    onClose(callback: () => void): void;
}

export interface ConnectionFactory {
    create(): Connection;
}

export class WeTTY {
    term: Terminal;
    connectionFactory: ConnectionFactory;

    constructor(term: Terminal, connectionFactory: ConnectionFactory) {
        this.term = term;
        this.connectionFactory = connectionFactory;
    };

    open() {
        let connection = this.connectionFactory.create();
        let pingTimer: number;

        const setup = () => {
            connection.onOpen(() => {
                const termInfo = this.term.info();

                const resizeHandler = (columns: number, rows: number) => {
                    console.log(columns, rows);
                    connection.send(Type.SESSION_RESIZE,
                        JSON.stringify(
                            {
                                "Cols": columns,
                                "Rows": rows
                            }
                        )
                    );
                };

                // this.term.onResize(resizeHandler);
                resizeHandler(termInfo.columns, termInfo.rows);

                /*
                this.term.onInput(
                    (input: string) => {
                        connection.send(Type.CLIENT_INPUT, input);
                    }
                );
                */
            });

//          connection.onReceive((data) => {
//              // const payload = data.slice(1);
//              switch (data[0].charCodeAt(0)) {
//                  /*
//                  case Type.SESSION_OUTPUT:
//      		this.term.output(payload);
//                      break;
//                  */
//                  case Type.CLIENT_CLOSE:
//                      console.log("received CLIENT_CLOSE");
//      		connection.close();
//                      this.term.close();
//                      break;
//              }
//          });

            connection.onClose(() => {
                clearInterval(pingTimer);
                this.term.deactivate();
                this.term.showMessage("Connection Closed", 0);
                this.term.close();
            });

            connection.open();
            this.term.attach(connection.ws);
        }

        setup();
        return () => {
            connection.close();
            this.term.close();
        }
    };
};
