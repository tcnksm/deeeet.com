---

title: 'HerokuのAPIデザイン'
date: 2014-06-02
comments: true
categories: 
---

Herokuが自ら[実践している](https://devcenter.heroku.com/articles/platform-api-reference)APIデザインガイドをGithubに公開した．

["HTTP API Design Guide"](https://github.com/interagent/http-api-design#provide-machine-readable-json-schema)

このガイドは些細なデザイン上の議論を避けて，ビジネスロジックに集中すること目的としている．Heroku特有なものではなく，一般にも十分適用できる知見となっている．

最近は，モバイル向けにAPIをつくることも多いため，勉強もかねて抄訳した．なお内容は，HTTP+JSONのAPIについて基本的な知識があることが前提となっている．

### 適切なステータスコードを返す

それぞれのレスポンスは適切なHTTPステータスコード返すこと．例えば，"成功"を示すステータスコードは以下に従う．

- `200`: `GET`や`DELETE`，`PATCH`リクエストが成功し，同時に処理が完了した場合
- `201`: `POST`リクエストが成功し，同時に処理が完了した場合
- `202`: `POST`や`DELETE`，`PATCH`リクエストが成功し，非同期で処理が完了する場合
- `206`: `GET`のリクエストは成功したが，レスポンスがリソースに対して部分的である場合

その他のクライアントエラーやサーバエラーに関しては，[RFC 2616](http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html)を参照（日本語だと，[このサイト](http://www.asahi-net.or.jp/~ax2s-kmtn/ref/status.html)や["Webを支える技術"](http://www.amazon.co.jp/Web%E3%82%92%E6%94%AF%E3%81%88%E3%82%8B%E6%8A%80%E8%A1%93-HTTP%E3%80%81URI%E3%80%81HTML%E3%80%81%E3%81%9D%E3%81%97%E3%81%A6REST-WEB-PRESS-plus/dp/4774142042)が詳しい）．

### 可能な全てのリソースを提供する

そのレスポンスで可能な全てのリソース表現（つまり，全ての要素とそのオブジェクト）を提供すること．ステータスコードが`200`もしくは`201`のときは常に全てのリソースを提供する．これは`PUT`や`PATCH`，`DELETE`リクエストでも同様．例えば，

```bash
$ curl -X DELETE \
  https://service.com/apps/1f9b/domains/0fd4
```

```javascript
HTTP/1.1 200 OK
Content-Type: application/json;charset=utf-8
...
{
  "created_at": "2012-01-01T12:00:00Z",
  "hostname": "subdomain.example.com",
  "id": "01234567-89ab-cdef-0123-456789abcdef",
  "updated_at": "2012-01-01T12:00:00Z"
}
```

ステータスコードが`202`の場合は，完全なリソース表現は含めない．例えば，

```bash
$ curl -X DELETE \
  https://service.com/apps/1f9b/dynos/05bd
```

```javascript
HTTP/1.1 202 Accepted
Content-Type: application/json;charset=utf-8
...
{}
```

### リクエストボディ中のシリアル化されたJSONを受け入れる

フォームデータに加えて，もしくは代わりに，`PUT`や`PATCH`，`POST`のリクエストボディ中のシリアル化されたJSONを受け入れること．これにより，リクエストとレスポンスが対称になる．例えば，

```bash
$ curl -X POST https://service.com/apps \
    -H "Content-Type: application/json" \
    -d '{"name": "demoapp"}'    
```

```javascript
{
  "id": "01234567-89ab-cdef-0123-456789abcdef",
  "name": "demoapp",
  "owner": {
      "email": "username@example.com",
      "id": "01234567-89ab-cdef-0123-456789abcdef"
  },
  ...
}
```

### リソースの(UU)IDを提供する

それぞれのリソースにデフォルトでid要素を提供すること．特別な理由がない限りUUIDを使うこと．サービスの他のリソースの中で一意でないidを使わないこと．

小文字かつ`8-4-4-4-12`フォーマットを使うこと．例えば，

```javascript
"id": "01234567-89ab-cdef-0123-456789abcdef"
```

### タイムスタンプを提供する

デフォルトでリソースの`created_at`と`updated_at`のタイムスタンプを提供すること．例えば，

```javascript
{
  ...
  "created_at": "2012-01-01T12:00:00Z",
  "updated_at": "2012-01-01T13:00:00Z",
  ...
}
```

これらのタイムスタンプは，削除されうるリソースには必要ないかもしれない．

### 時刻はISO8601フォーマットのUTCを使う

時刻はUTC（協定世界時）のみを返答する，もしくは受け入れること．[ISO 8601](http://ja.wikipedia.org/wiki/ISO_8601)フォーマットを用いること．例えば，

```javascript
"finished_at": "2012-01-01T12:00:00Z"
```

### 一貫したパス名を使う

**リソース名**：リソース名には複数形を使う．ただし，要求されるリソースがシステム全体でシングルトンである場合は，単数形を使う（例えば，ほとんどのシステムではユーザはただ1つのアカウントのみを持つ）．これにより，リソースへの参照方法に一貫性を持たせることができる．

**アクション名**：パスの末尾にリソースに対する特別なアクションを必要としないのが望ましい．必要な場合は，それを明確にするため，以下のようにアクション名を`actions`の後に続けて記述できるようにする．

```
/resources/:resource/actions/:action
```

例えば，

```
/runs/{run_id}/actions/stop
```

### パス名と要素名には小文字を使う

ホスト名に合わせて，パス名には小文字，区切り文字には`-`を使うこと．例えば，

```
service-api.com/users
service-api.com/app-setups
```

同様に要素名にも小文字を使うこと．Javascriptで使うことを考慮して，区切り文字には`_`を使うこと．例えば，

```javascript
"service_class": "first"
```

### 外部キーの参照はネストする

外部キーによる一連の参照はネストして記述する．例えば，

```javascript
{
  "name": "service-production",
  "owner_id": "5d8201b0...",
  ...
}
```

とするのではなく，以下のようにする．

```javascript
{
  "name": "service-production",
  "owner": {
      "id": "5d8201b0..."
  },
  ...
}
```

これにより，レスポンスの構造を変更したり，トップレベルのフィールドを追加することなく，関連した情報を含めることができる．例えば，

```javascript
{
  "name": "service-production",
  "owner": {
      "id": "5d8201b0...",
      "name": "Alice",
      "email": "alice@heroku.com"
  },
  ...
}
```

### id以外の参照方法をサポートする

ユーザにとってリソースの特定にidを使うのが不便な場合がある．例えば，ユーザはHerokuアプリケーションをUUIDではなく，名前で見分けているかもしれない．このような場合を考慮して，idと名前の両方でリソースにアクセスできるとよい．例えば，

```bash
$ curl https://service.com/apps/{app_id_or_name}
$ curl https://service.com/apps/97addcf0-c182
$ curl https://service.com/apps/www-prod
```

ただし，名前のみでしかアクセスできないといったことは避ける．

### 構造的なエラーを生成する

エラーの際は，一貫した構造的なレスポンスを生成すること．レスポンスには，コンピュータが解釈しやすいエラー`id`と，ユーザが理解しやすいエラー`message`を含めること．さらに，エラーとその解決方法を示すさらなる情報への`url`も含めるとよい．例えば，

```
HTTP/1.1 429 Too Many Requests
```

```javascript
{
  "id":      "rate_limit",
  "message": "Account reached its API rate limit.",
  "url":     "https://docs.service.com/rate-limits"
}
```

エラーのフォーマットと，`id`のドキュメントを作成すること．

### Etagによるキャッシュをサポートする

返答するリソースのバージョンを示す，[`ETag`](http://ja.wikipedia.org/wiki/HTTP_ETag)ヘッダを含めること．クライアントは[`If-None-Match`](http://ja.wikipedia.org/wiki/HTTP_ETag)ヘッダで，キャッシュが最新であるかをチェックできるようにするべき．

### Request-Idでリクエストを追跡する

UUIDによる`Request-Id`ヘッダをそれぞれのAPIのレスポンスに含めること．サーバとクライアント両方でその値のログをとれば，リクエストのデバッグの際に有用になる．

### Content-Rangeでレスポンスを分割する

データ量が大きくなりそうな場合は，レスポンスを分割すること．`Content-Range`ヘッダを使って，コンテンツの範囲を指定できるようにする．リクエストとレスポンスのヘッダ，ステータスコードなどは["Heroku Platform API on Ranges"](https://devcenter.heroku.com/articles/platform-api-reference#ranges)の例に従うこと．

### 制限の状態を示す

クライアントからのリクエストを制限することで，サービスが不安定になることを防ぐこと．リクエストの制限には[トークンバケットアルゴリズム](http://ja.wikipedia.org/wiki/%E3%83%88%E3%83%BC%E3%82%AF%E3%83%B3%E3%83%90%E3%82%B1%E3%83%83%E3%83%88)が使える．

`RateLimit-Remaining`ヘッダを使って，リクエストトークンの残量を返答すること．

### Acceptsヘッダーでバージョニングする

始めからAPIをバージョニングすること．`Accepts`ヘッダーを使ってバージョンを指定する．例えば，

```
Accept: application/vnd.heroku+json; version=3
```

デフォルトのバージョンを持たないほうがよい．クライアントに対して特定のバージョンを指定することを明示的に指示する．

### パスのネストを最小限にする

ネストした親子関係をもつリソースのデータモデルでは，パスは深くネストすることになる．例えば，

```
/orgs/{org_id}/apps/{app_id}/dynos/{dyno_id}
```

ルートパスにリソースを配置するようにパスのネストの深さを制限すること．ネストをある特定の範囲の集合を示すために使うこと．例えば，上の例では，1つのdynoは1つのappに属し，1つのappは1つのorgに属する，

```
/orgs/{org_id}
/orgs/{org_id}/apps
/apps/{app_id}
/apps/{app_id}/dynos
/dynos/{dyno_id}
```

### コンピュータが理解しやすいJSONスキーマを提供する

コンピュータが理解しやすいJSONスキーマを提供すること．[prmd](https://github.com/interagent/prmd)を使ってスキーマを管理し，`prmd varify`でそれを評価すること．

### ユーザが理解しやすいドキュメントを準備する

クライアントの開発者がAPIを理解できるように読みやすいドキュメントを準備すること．

[prmd](https://github.com/interagent/prmd)を使ってスキーマを作成したなら，`prmd doc`で簡単にmarkdown形式のドキュメントを生成できる．

これに加えて，以下のようなドキュメントを準備すること．

- 認証方法．認証トークンの取得方法
- APIの安定性とバージョン．望ましいバージョンの選択方法
- 共通のリクエスト/レスポンスヘッダ
- エラーのフォーマット
- 様々な言語によるAPIの利用例

### 実行可能な実例を提供する

ユーザがターミナルからAPIの動作を確認できるように，実行可能な実例を提供すること．APIを試すための手順をできる限り最小限にする．例えば，

```bash
$ export TOKEN=... # acquire from dashboard
$ curl -is https://$TOKEN@service.com/users
```

[prmd](https://github.com/interagent/prmd)markdownのドキュメントを生成していれば，例も同時に得られる．

### 安定性を説明する

APIの安定性を説明すること．例えば，プロトタイプか，開発中か，プロダクションレベルかを示す．

プロダクションで利用可能である，もしくは安定であることを宣言したら，そのバージョンで後方互換を崩すような変更を加えないこと．後方互換を崩す場合は，バーションを上げること．

詳細は[Heroku API compatibility policy](https://devcenter.heroku.com/articles/api-compatibility-policy)を参考に．

### SSLを必須にする

APIへのアクセスはSSLを必須にすること．いつSSLを使い，いつ使わないかではなく，だた常にSSLを必須にする．


### デフォルトでJSONを整形する

ユーザが初めてAPIを使うときは，おそらくコマンドラインから`curl`を使う．コマンドライン上でレスポンスが整形されていれば，ユーザはAPIをより理解しやすくなる．例えば，

```javascript
{"beta":false,"email":"alice@heroku.com","id":"01234567-89ab-cdef-0123-456789abcdef","last_login":"2012-01-01T12:00:00Z", "created_at":"2012-01-01T12:00:00Z","updated_at":"2012-01-01T12:00:00Z"}
```

ではなく，以下のようにレスポンスを出力する．

```javascript
{
  "beta": false,
  "email": "alice@heroku.com",
  "id": "01234567-89ab-cdef-0123-456789abcdef",
  "last_login": "2012-01-01T12:00:00Z",
  "created_at": "2012-01-01T12:00:00Z",
  "updated_at": "2012-01-01T12:00:00Z"
}
```

[Licence](https://github.com/interagent/http-api-design/blob/master/LICENSE.md)
