OUTPUT_DIR = ./builds

client: main.go client/*.go 
	goimports -w .
	go install .
	go build -o wetty-client

wetty: main.go pkg/* Makefile
	go install .

.PHONY: asset
asset: bindata/static/js/wetty-bundle.js bindata/static/index.html bindata/static/favicon.ico bindata/static/css/index.css bindata/static/css/xterm.css bindata/static/css/xterm_customize.css
	# go-bindata -prefix bindata -pkg server -ignore=\\.gitkeep -o server/asset.go bindata/...
	# gofmt -w server/asset.go
	assets -d ./bindata/static -package assets -o ./pkg/assets/assets.go -map Assets

.PHONY: all client wetty
all: asset wetty client
	goimports -w .

bindata:
	mkdir bindata

bindata/static: bindata
	mkdir bindata/static

bindata/static/index.html: bindata/static resources/index.html
	cp resources/index.html bindata/static/index.html

bindata/static/favicon.ico: bindata/static resources/favicon.ico
	cp resources/favicon.ico bindata/static/favicon.ico

bindata/static/js: bindata/static
	mkdir -p bindata/static/js


bindata/static/js/wetty-bundle.js: bindata/static/js js/dist/wetty-bundle.js
	cp js/dist/wetty-bundle.js bindata/static/js/wetty-bundle.js

bindata/static/css: bindata/static
	mkdir -p bindata/static/css

bindata/static/css/index.css: bindata/static/css resources/index.css
	cp resources/index.css bindata/static/css/index.css

bindata/static/css/xterm_customize.css: bindata/static/css resources/xterm_customize.css
	cp resources/xterm_customize.css bindata/static/css/xterm_customize.css

bindata/static/css/xterm.css: bindata/static/css js/node_modules/xterm/css/xterm.css
	cp js/node_modules/xterm/css/xterm.css bindata/static/css/xterm.css

js/node_modules/xterm/css/xterm.css:
	cd js && \
	npm install

js/dist/wetty-bundle.js: js/src/* js/node_modules/webpack
	cd js && \
	`npm bin`/webpack

js/node_modules/webpack:
	cd js && \
	npm install

tools:
	go get github.com/mitchellh/gox
	go get github.com/tcnksm/ghr
	go get modernc.org/assets

test:
	if [ `go fmt $(go list ./... | grep -v /vendor/) | wc -l` -gt 0 ]; then echo "go fmt error"; exit 1; fi

cross_compile:
	GOARM=5 gox -os="darwin linux freebsd netbsd openbsd" -arch="386 amd64 arm" -osarch="!darwin/arm" -output "${OUTPUT_DIR}/pkg/{{.OS}}_{{.Arch}}/{{.Dir}}"

targz:
	mkdir -p ${OUTPUT_DIR}/dist
	cd ${OUTPUT_DIR}/pkg/; for osarch in *; do (cd $$osarch; tar zcvf ../../dist/wetty_${VERSION}_$$osarch.tar.gz ./*); done;

shasums:
	cd ${OUTPUT_DIR}/dist; sha256sum * > ./SHA256SUMS

release:
	ghr -c ${GIT_COMMIT} --delete --prerelease -u yudai -r wetty pre-release ${OUTPUT_DIR}/dist
