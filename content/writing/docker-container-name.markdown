---

title: 'Dockerコンテナのおもしろい名前'
date: 2014-07-15
comments: true
categories: docker
---

Dockerコンテナを立ち上げるときに，`--name`オプションで名前を指定しないと勝手に名前がつけられる．

```bash
$ docker run -d dockerfile/nginx
```

```bash
$ docker ps
CONTAINER ID        IMAGE                     COMMAND             CREATED             STATUS              PORTS               NAMES
1f29f753eaf6        dockerfile/nginx:latest   nginx               2 days ago          Up 11 hours         80/tcp, 443/tcp     elegant_feynma
```

例えば，上では`elegant_feynma`という名前がつけられている．

で，これどうやってやってるのかなーと思ってソースを眺めていると，[docker/pkg/namesgenerator](https://github.com/dotcloud/docker/tree/master/pkg/namesgenerator)というパッケージが名前を生成していた．

名前の生成方法はとても単純で，49個の形容詞と68名の著名な科学者もしくはハッカーの名前をランダムに組み合せているだけ．ソースを見ると，科学者もしくはハッカーの名前と簡単な紹介文，wikipediaへのリンクがコメントに書かれている．

以下が，生成部分の実装．注意深くみると，異変に気づく．

```go
func GetRandomName(retry int) string {
    rand.Seed(time.Now().UnixNano())

begin:
    name := fmt.Sprintf("%s_%s", left[rand.Intn(len(left))], right[rand.Intn(len(right))])
    if name == "boring_wozniak" /* Steve Wozniak is not boring */ {
        goto begin
    }

    if retry > 0 {
        name = fmt.Sprintf("%s%d", name, rand.Intn(10))
    }
    return name
}
```

この実装のIssueは[ここ](https://github.com/dotcloud/docker/pull/4902)にある．まあ，LGTMである．

このnamegeneratorパッケージはDocker以外でも使えるようになっている．例えば以下のように使う．

```go
package main

import (
    "fmt"
    "github.com/dotcloud/docker/pkg/namesgenerator"
)

func main() {
    fmt.Println(namesgenerator.GetRandomName(0))
}    
```

便利ー．

### 参考

- [What is the best comment in source code you have ever encountered?](http://stackoverflow.com/questions/184618/what-is-the-best-comment-in-source-code-you-have-ever-encountered)
