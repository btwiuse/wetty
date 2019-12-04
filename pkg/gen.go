//go:generate protoc --go_out=plugins=grpc:. --proto_path=. msg/types.proto
//go:generate goimports -w .

package pkg
