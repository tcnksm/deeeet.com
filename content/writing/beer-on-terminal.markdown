---

title: 'Macのターミナルでビールが降る'
date: 2014-04-30
comments: true
categories:
---

辛いことがあったときに，どうぞ．

```bash
$ ruby -e 'C=`stty size`.scan(/\d+/)[1].to_i;S="\xf0\x9f\x8d\xba";a={};puts "\033[2J";loop{a[rand(C)]=0;a.each{|x,o|;a[x]+=1;print "\033[#{o};#{x}H \033[#{a[x]};#{x}H#{S} \033[0;0H"};$stdout.flush;sleep 0.01}'
```

[Gifzo](http://gifzo.net/BT5R4alWsqt)



### 参考

- [Macのターミナルで顔が降る](http://melborne.github.io/2014/04/30/let-it-smile-in-the-terminal/)
- [Let it Snow in the Terminal of Mac OS X with This Command](http://osxdaily.com/2013/12/06/snow-terminal-mac-os-x-command/)
