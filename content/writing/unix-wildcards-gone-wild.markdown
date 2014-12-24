---

title: 'UNIXのワイルドカードがワイルド'
date: 2014-08-18
comments: true
categories:
---

[Back To The Future: Unix Wildcards Gone Wild](http://www.defensecode.com/public/DefenseCode_Unix_WildCards_Gone_Wild.txt)

面白かったので．また気をつけようと思ったので．

## ワイルドな実例

例えば，以下のようなファイルとディレクトリがあるとする．

```bash
$ ls -al
total 0
drwxr-xr-x  9 taichi  staff  306  8 18 22:31 .
drwxr-xr-x  6 taichi  staff  204  8 18 22:27 ..
drwxr-xr-x  2 taichi  staff   68  8 18 22:26 DIR1
drwxr-xr-x  2 taichi  staff   68  8 18 22:26 DIR2
drwxr-xr-x  2 taichi  staff   68  8 18 22:26 DIR3
-rw-r--r--  1 taichi  staff    0  8 18 22:26 file1
-rw-r--r--  1 taichi  staff    0  8 18 22:26 file2
-rw-r--r--  1 taichi  staff    0  8 18 22:26 file3
-rw-r--r--  1 taichi  staff    0  8 18 22:30 -rf
```

ここで，以下のようにワイルドカードでファイル指定しファイル削除を実行する．

```bash
$ rm *
```

オプションを指定していないので，ディレクトリは消えないはずが，ディレクトリまで消えてしまう．

```bash
$ ls -al
total 0
-rw-r--r--  1 taichi  staff    0  8 18 22:30 -rf
drwxr-xr-x  3 taichi  staff  102  8 18 22:32 .
drwxr-xr-x  4 taichi  staff  136  8 18 22:32 ..
```

これは`-rf`というファイルが原因．ワイルドカードが展開されると，`rm`はそれをオプションとして認識してしまい，ディレクトリも消してしまう．すごい野性的．

## どう避けるのか

そもそも`-`で始まるファイル名が存在することがおかしいし，センスを疑うが，ありえないとは言い切れない．

まず，`--`を使う方法．`--`を使うとオプションの終了位置を明示的に指定でき，それ以後`-`で始まるファイルが現れてもそれをファイルとして扱うようになる．

```bash
$ rm -- *
```

でも，すべてのコマンドをこれで実行するわけにはいかないし，いつか忘れる．また全てのコマンドが`--`をサポートしているわけではない．

良さげなのは，`./`を使う方法．というか，ワイルドカードで始まるファイル指定をしない．

```bash
$ rm ./*
```

## まとめ

軽い話題のつもりが良い教訓になった．

ワイルドカードを使ったファイルglobはシェルスクリプトではよく使う（例えば`for`でループするときなど）．**ワイルドカードで始まるファイル指定をしない**ように気をつけること．

## さらに学ぶには

以下の素敵な記事に目を通すのが良さそう．

[Filenames and Pathnames in Shell (bash, dash, ash, ksh, and so on): How to do it Correctly](http://www.dwheeler.com/essays/filenames-in-shell.html)
