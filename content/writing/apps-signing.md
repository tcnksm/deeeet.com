+++
date = "2015-03-12T23:20:39+09:00"
draft = true
title = "RocketによるACIの署名と検証"
+++

[Signing and Verification Guide](https://github.com/coreos/rocket/blob/master/Documentation/signing-and-verification-guide.md)

Appc specではイメージの署名と公開鍵をどのようにインターネット上から見つけるかは仕様として定義しているが，どの暗号化ツールを使うかはRuntimeの実装者に任せている．署名については以下のような記述がある．

- ACIはPGPを使って署名するべき(SHOULD)
- 署名の拡張子は`.aci.asc`にしなければならない(MUST)

ACIのExecutorの実装のひとつであるRocketがどのようにイメージの署名と検証を行っているかを簡単に説明する．Rocketの場合は`gpg`を使っている．ここでは`hello-0.0.1-linux-amd64.aci`というイメージの配布を例にする．

### signing keyの生成

鍵を生成する．以下のファイル（`gpg-batch`）を作成し，バッチモードで生成する．

```bash
%echo Generating a default key
Key-Type: RSA
Key-Length: 2048
Subkey-Type: RSA
Subkey-Length: 2048
Name-Real: Taichi Nakashima
Name-Comment: ACI signing key
Name-Email: sample@gmail.com
Expire-Date: 0
Passphrase: rocket
%pubring rocket.pub
%secring rocket.sec
%commit
%echo done
```

```bash
$ gpg --batch --gen-key gpg-batch
```

これで`rocket.pub`と`rocket.sec`が生成される．


### ACIへの署名

### イメージの検証

