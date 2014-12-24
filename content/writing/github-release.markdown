---

title: 'シェルスクリプトでGo言語のツールをクロスコンパイルしてGithubにリリースする'
date: 2014-07-23
comments: true
categories: golang
---

[@motemen]()さんの["Wercker で Go のプロジェクトをクロスコンパイルし、GitHub にリリースする - 詩と創作・思索のひろば (Poetry, Writing and Contemplation)"](http://motemen.hatenablog.com/entry/2014/06/27/xcompile-go-and-release-to-github-with-wercker)を手元からやる．

[Wercker](http://wercker.com/)からリリース良いと思うけど，自分はリリースは手元で管理したい．その辺は毎回同じスクリプトでやってるのでまとめておく．なお，コードは全て[tcnksm/go-distribution-scripts](https://github.com/tcnksm/go-distribution-scripts)にある．

## クロスコンパイル

基本は[Hashicorp](https://github.com/hashicorp)のやり方を真似してる．

まず，クロスコンパイルは[mitchellh/gox](https://github.com/mitchellh/gox)を使う．goxは複数プラットフォームの並列コンパイルと出力先の設定の自由度が気に入ってずっと使ってる．何よりシンプルで良い．以下のようなスクリプトを書いている．

```bash
# compile.sh
gox \
    -os="darwin linux windows" \
    -arch="386 amd64" \
    -output "{%raw%} pkg/{{.OS}}_{{.Arch}}/{{.Dir}} {%endraw%}"
```

あとは，これらをzipでアーカイブする（[package.sh](https://github.com/tcnksm/go-compile-scripts/blob/master/package.sh)）．

## Githubへのリリース

[Github API](https://developer.github.com/v3/repos/releases/)を使ってリリースの作成，ファイルのアップロードを行う．werkcerはこれらをstepとしてGithubに公開しているのでそれを簡略化して使っている．

- [wercker/step-github-create-release](https://github.com/wercker/step-github-create-release)
- [wercker/step-github-upload-asset](https://github.com/wercker/step-github-upload-asset)

まず，リリースの作成．以下のようなスクリプトを準備する．

```bash
# github-create-release.sh
INPUT="
{
    \"tag_name\": \"${VERSION}\",
    \"target_commitish\": \"master\",
    \"draft\": false,
    \"prerelease\": false
}"

RELEASE_RESPONSE=$(
    curl --fail -X POST https://api.github.com/repos/${OWNER}/${REPO}/releases \
        -H "Accept: application/vnd.github.v3+json" \
        -H  "Authorization: token ${GITHUB_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "${INPUT}")
```

`$OWNER`はGithubのユーザ名，`$REPO`はレポジトリ名，`$GITHUB_TOKEN`はGithub APIのAPI Token（[ここ](https://github.com/settings/applications)から取得できる）を指定する．

これで`$VERSION`のリリースが作られる．

バイナリのアップロードを行う際にリリースのIDが必要になる．これはリリースを作成した際のレスポンスから得られる．

```bash
echo $RELEASE_RESPONSE | jq ".id" 
```

あとは，作成したリリースにファイルをぶっ込んでいく．

```bash
# github-upload-asset.sh
ARCHIVE_NAME=$(basename ${ARCHIVE})
CONTENT_TYPE=$(file --mime-type -b ${ARCHIVE})

curl --fail -X POST https://uploads.github.com/repos/${OWNER}/${REPO}/releases/${RELEASE_ID}/assets?name=${ARCHIVE_NAME} \
    -H "Accept: application/vnd.github.v3+json" \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Content-Type: ${CONTENT_TYPE}" \
    --data-binary @"${ARCHIVE}"
```

`$ARCHIVE`はアップロードしたいファイルのパスを指定する．for文でリリースしたいファイルを回せばよい．
