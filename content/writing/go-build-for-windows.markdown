---

title: 'GoをWindows実行形式でコンパイル'
date: 2013-12-12
comments: true
categories: golang
---

I don't know why still we need to compile it for windows.

```
GOOS=windows GOARCH=386 go build -o hello.exe hello.go
```

参考:

- on Mac, [Goはクロスコンパイルが簡単 - unknownplace.org](http://unknownplace.org/archives/golang-cross-compiling.html)
- on Linux, [Building windows go programs on linux](https://code.google.com/p/go-wiki/wiki/WindowsCrossCompiling)



