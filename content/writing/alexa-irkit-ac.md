+++
date = "2016-08-30T09:56:39+09:00"
title = "GolangでAmazon EchoのSmart Home Skillを書く"
+++

[Amazon Echo](https://www.amazon.com/dp/B00X4WHP5E)（以下Alexa）はAmazonが開発・販売している音声アシスタント+Bluetoothスマートスピーカーである．音楽を流す，今日の天気やニュースを聞く，Googleカレンダーの予定を聞く，TODOを追加する，家電を操作するなどなど... といった多くのことを全て音声を通じて実行することができる（[こちらの動画](https://www.youtube.com/watch?v=KkOCeAtKHIc)がわかりやすい）．

現時点（2016年8月）では音声認識は英語のみで対応地域もUSのみとなっている（例えば天気を聞くと地域を指定しない限りUSの天気が返ってくる）．また連携できるサービスも日本で使えるものは少ない．ただ発表当時から「これは完全に買いだ」と思っており先日[GopherCon2016で渡米したとき](http://deeeet.com/writing/2016/07/12/gophercon2016-lt/)にいきおいで購入した（自分は音声アシスタントはSiriなどのスマートフォンに搭載されているものよりも据え置き型のものに未来を感じている．実は大学院では[会話ロボットの研究](http://link.springer.com/chapter/10.1007%2F978-1-4614-8280-2_14)をしていたのでこの分野には思うことはたくさんある．がそれは別途書く）．

Alexaをしばらく使った感想としてはとにかく音声認識がすごい！ Living roomに置いているがどこから話しても認識してくれる（最悪玄関から「Turn-off AC」と叫んでも認識してくれる）．音声認識の研究をしていた身からして一番驚いたのはAlexaのスピーカーから音楽を流していても認識がまともに働くこと．音楽のシグナルと言葉のシグナルを分離する的な研究はあったがここまで実用的になっているのは正直驚いた．また自分は対話システムにおけるバージイン（割り込み）を研究テーマにしていたことがあるがそちらも完璧に実用的である．Alexaの上に乗るアプリケーションにはもちろん感動するが音声対話システムとしての基礎がものすごくしっかりしていることにとても感動した．

さてAlexaは音楽を流す，天気を聞くといったBuilt-inのSkillに加えてサードパーティが提供するSkillを有効にして機能拡張することができる．そしてSkillは自分で開発することもできる．Skillは[AWS Lambda](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)のFunctionとして実装するので現状はLambdaが対応するPython，Node.jsもしくはJavaでの開発が前提となる．がGolangの場合はシングルバイナリをデプロイしてNode.jsから実行するという方法が使えるためGolangも開発の選択肢になる．

今回Golangを使い実用的なAlexa Skillを書いた．本記事ではその実装方法を簡単に紹介する．なおコードは全て [https://github.com/tcnksm/alexa-irkit-ac](https://github.com/tcnksm/alexa-irkit-ac) に公開している．

## デモ

以下は今回作成したAlexa Skillのデモ動画．自宅のエアコンのON/OFFを行う．ON/OFFのシグナルの送信には[IRKit](http://getirkit.com/)を使っている．

<iframe src="https://player.vimeo.com/video/179021210" width="640" height="360" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
<p><a href="https://vimeo.com/179021210">Turn on/off air conditioner by Amazon Echo and IRKit</a> from <a href="https://vimeo.com/user5121880">deeeet</a> on <a href="https://vimeo.com">Vimeo</a>.</p>

## 実装の概要

Alexaの独自Skillの開発には[Alexa Skill Kit](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/getting-started-guide)を用いる．Skill Kitには以下の2種類がある．

- [Custom Skill](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/overviews/understanding-custom-skills)
- [Smart Home Skill](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/overviews/understanding-the-smart-home-skill-api)

Custom SkillはよりGeneralなリクエストを受けるのに利用する．例えばWeb Seriviceに情報を問い合わせるやピザを注文するなど．若干冗長な言い回しをしないといけないが自由なワードを認識させる事ができる．Smart Home Skillは家電操作に特化したリクエストを受けるのに利用する．受け付ける言い回しは限定されているがより自然な命令ができる．今回はエアコンの操作なのでSmart Home Skillを利用した（Custom Skillを使ったNode.jsの実装はIRKitの作者の[@maaash](https://twitter.com/maaash)さんの["Amazon Alexaにエアコンをつけてもらう"](http://maaash.jp/2016/07/alexa-air-conditioner/)が参考になる）．

Smart Home Skillのリクエストの流れは以下のようになる．

![](https://developer.amazon.com/public/binaries/content/gallery/developerportalpublic/alexa_smart_home_ecosystem.png)

自分で書く必要があるのは4のLambda Functionである．Alexa Serviceからリクエストを受け家電を操作するためのAPI（この場合はIRKitのInternet HTTP API）にリクエストを投げる．

これに加えてSmart Home Skillの場合は[OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)を使った[Account Linking](https://developer.amazon.com/appsandservices/solutions/alexa/alexa-skills-kit/docs/linking-an-alexa-user-with-a-user-in-your-system)が必須になる．今回作成したSkillは完全に個人用途なのでAlexa Serviceからのリクエストを最小限でハンドルするシンプルなOAuthサーバーをGoで書いて[IBM Bluemix](https://console.ng.bluemix.net/)にPushして済ませた（実はここが一番めんどくさかった．ドキュメントが不足していたので自分でRFCを読まないといけなかった）．

コードは["Amazon Alexa Simple Account Linking Server by Golang"](https://gist.github.com/tcnksm/3ca4ad1709da91386c9173ff0d926aa8)に置いた．

## GolangでLambda Functionを書く

GolangによるLambda FunctionのデプロイとNode.jsとの連携には[apex](http://apex.run/)を利用した．この場合は以下のような`HandleFunc`を実装すればよい．

```golang
func main() {
    apex.HandleFunc(func(event json.RawMessage, ctx *apex.Context) (interface{}, error) {        

    // Handle Request...
    
    })
}
```

Alexa Skillの場合は入力の`event`はAlexa Serviceからのリクエストで，返り値の`interface{}`はAlexa Serviceへのレスポンスである．やることは非常に単純で[Smart Home Skill API Reference](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference)を参考にjsonを頑張ってパースするだけ．

今回の場合は少なくとも以下の2つのリクエストを処理できる必要がある．

- [Discovery Messages](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#Discovery Messages)
- [On/Off Messages](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#On/Off Messages)

Discovery MessageはユーザがSkillを有効にするときにリクエストされる．このレスポンスでデバイス名前やリクエスト可能なコマンド（e.g., `turnOn`と`turnOff`）などを返す．On/Off Messageは名前の通りにOn/Offのコマンドの処理を行う．今回の場合はここでIRKitへリクエストを行う．

## GolangでIRKitを操作する

IRKitには[Internet HTTP API](http://getirkit.com/en/#IRKit-Internet-API)があり[api.getirkit.com](https://api.getirkit.com)経由で自宅のIRKitを操作することができる．これは単純なHTTP Requestなので標準の`net/http`パッケージでなんとかなる．が他にもやりたいことがあったのでClientパッケージ [tcnksm/go-irkit](https://github.com/tcnksm/go-irkit) を書いた（自分が欲しいものしか書いてないので完全なClientではない）．

例えばSignalを送るには以下のようにする．

```golang
f, err := os.Open(filePath)
if err != nil {
    log.Fatalf("[ERROR] %s", err)
}

var msg irkit.Message
decoder := json.NewDecoder(f)
if err := decoder.Decode(&msg); err != nil {
    log.Fatalf("[ERROR] %s", err)
}

c := irkit.DefaultInternetClient()
err = c.SendMessages(context.Background(), key, id, &msg)
if err != nil {
    log.Fatalf("[ERROR] %s", err)
}
```

（`context`パッケージを使いモダンな感じに仕上げてある）

## まとめ

Golangを使ったAmazon EchoのSmart Home Skillの開発を紹介した．日本に上陸したときは皆GolangでSkillを書きましょう．
