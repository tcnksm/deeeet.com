---

title: 'Rakefileに加えるべき7行'
date: 2014-02-15
comments: true
categories: ruby
---

[7 Lines Every Gem's Rakefile Should Have](http://erniemiller.org/2014/02/05/7-lines-every-gems-rakefile-should-have/)

必要なgemをrequireしてすぐに使えるようにしましょうと．自分はpryで．

```ruby
task :console do
  require 'pry'
  requrey 'my_gem' 
  ARGV.clear
  Pry.start
end
```

OSSだとpry使ってないひともいる可能性があるからirbでやったほうがいいかも．
