---

title: 'Image processing with Go'
date: 2013-10-21
comments: true
categories: golang
---

<img src="/images/spiral.png" class="image">

Goを始めた．今は[Tour of go](http://go-tour-jp.appspot.com)を黙々と写生している．

先日，[Intro to (images in) Go ](http://www.pheelicks.com/2013/10/intro-to-images-in-go-part-1/)という面白い記事を見つけたので書いてみた ( [tcnksm/snippets/go/canvas](https://github.com/tcnksm/snippets/tree/master/go/canvas) )．記事では，Goの標準の二次元画像ライブラリである["image"](http://blog.golang.org/go-image-package)をつかって，グラデーション画像や直線，渦巻き線を描写する方法が説明されている．上の画像はそれを使って描写した．

結構勉強になった．得に以下のようにCanvas typeを作って外部ライブラリであるimageをラップして，シンプルに記述する方法がとても勉強になった．

``` go
type Canvas struct {
        image.RGBA
}

func NewCanvas(r image.Rectangle) *Canvas {
  canvas := new(Canvas)
    canvas.RGBA = *image.NewRGBA(r)
      return canvas
}
```







