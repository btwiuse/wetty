client: main.go client/*.go 
	goimports -w .
	go install .
	go build -o wetty-client

wetty: main.go pkg/* Makefile
	go install .

.PHONY: asset
asset: js/dist/static
	assets -d ./js/dist/static -package assets -o ./pkg/assets/assets.go -map Assets

.PHONY: all client wetty
all: asset wetty client
	goimports -w .

js/dist/static: js/dist/wetty-bundle.js
	mkdir -p js/dist/static
	mkdir -p js/dist/static/js
	mkdir -p js/dist/static/css
	cp static/index.html js/dist/static/index.html
	cp static/favicon.ico js/dist/static/favicon.ico
	cp js/dist/wetty-bundle.js js/dist/static/js/wetty-bundle.js
	cp static/index.css js/dist/static/css/index.css
	cp static/xterm_customize.css js/dist/static/css/xterm_customize.css
	cp js/node_modules/xterm/css/xterm.css js/dist/static/css/xterm.css

js:
	cd js && npm install

js/dist/wetty-bundle.js: js js/src/* js/node_modules/webpack
	cd js && `npm bin`/webpack

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
