---

title: 'HamlでAngular.js'
date: 2013-12-23
comments: true
categories: angular.js
---

この記事は[AngularJS Startup Advent Calendar 2013](http://qiita.com/advent-calendar/2013/angularjs-startup)の23日目の記事です．

いきなりですが，参加させていただきました．文脈が全然違ったらすいません．とてもシンプルな記事です．

最近，Angular.jsを触っている．ただ，もう今更HTMLを0から打つのはやってられないと思う．[Haml](http://haml.info/)で手軽に書く．

インストール

```bash
$ gem install haml
```

index.haml

```haml
!!! 5
%html{"ng-app" => true}
  %head
    %title Sample
    %meta{charset: 'utf-8'}
    %script{src: "http://ajax.googleapis.com/ajax/libs/angularjs/1.0.3/angular.js"}

  %body
    %input{type: "text", "ng-model" => "name"}
    %p Hello, {% raw %} {{ name }} {% endraw %}
```

htmlに整形

```bash
$ haml index.haml index.html
```

index.html

```html
<!DOCTYPE html>
<html ng-app>
  <head>
    <title>Sample</title>
    <meta charset='utf-8'>
    <script src='http://ajax.googleapis.com/ajax/libs/angularjs/1.0.3/angular.js'></script>
  </head>
  <body>
    <input ng-model='name' type='text'>
    <p>Hello, {% raw %} {{ name }} {% endraw %}</p>
  </body>
</html>
```

以上．
