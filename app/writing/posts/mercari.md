+++
date = "2017-02-13T09:47:24+09:00"
title = "SREとしてMercariに入社した"
+++

1月16日より[Mercari](https://www.mercari.com/)にてSRE/BSE（[Backend System Engineer](https://www.mercari.com/jp/jobs/backend/)）として働いてる．

これまではとある会社で社内向けのPaaSエンジニアとして働いてきた（ref. [PaaSエンジニアになった](http://deeeet.com/writing/2014/11/14/work-as-paas-engineer/)）．PaaSの目標である「アプリケーション開発者の効率を最大化」を突き詰めながら少人数のチームでいかにScalableなプラットフォームを構築するかに注力してきた．[Cloud Foundry](https://www.cloudfoundry.org/)やDockerといったインフラの最前線とも言える技術やアーキテクチャに触れ，かつその中で自分の技術的な柱である自動化に取り組むことができたのは非常に刺激的で自分に大きなプラスになった．

その一方でPaaSというプラットフォームはその性質上サービスそのものからは中立的になることが避けられない（だからこそScalabilityを実現できるのだが）．よりサービスに近い部分，サービスの成長に直結する部分で開発がしたい，それを支えるインフラに関わりたいと思うようになった．

Mercariという選択は，サービスやその可能性/成長，働いているひと，使っている技術といった視点から行った．が一番の大きな理由は日本発のサービスとしてグローバルな市場を本気で獲りに行っているところだ．UberやAirbnb，Netflixを見ていても今後Webサービスはグローバルで闘えることが必須になるだろうし技術的に一番チャレンジングかつ面白いものそこにあると思う．自分が身に付けたいと思う技術もそこにある（実際早くもそれに関わる仕事ができた）．

[Site Reliability Engineering (SRE)](https://landing.google.com/sre/book.html)はGoogleが提唱し多くの企業で採用され始めている職種である．その初期衝動はソフトウェアエンジニアリング的にいかにインフラを設計するかにあり，Error Budgedという現実的な指標をもってInnovationの促進とReliabilityの担保というトレードオフを解決しているところが大きな特徴であると言える．これらの思想をもとに各社が独自の実装をしているのが現状だと思う．

Mercariは早くからこのSREという名前を採用している（ref. [インフラチーム改め Site Reliability Engineering (SRE) チームになりました](http://tech.mercari.com/entry/2015/11/18/153421)）．メンバーの各人がそれぞれの得意分野をもちAvailabilityやPerformance，Security，Deploy Automationに取り組んでる．まだチームに入って1ヶ月程度だが皆がどんどん問題を解決してるのをみて圧倒されている．自分に足りない部分は吸収しつつPaaSの世界で培ってきた考え方や技術で貢献していきたいと思う．また自分なりにSREとは何ぞやというもの考え行動していきたい．

[Backend System Engineer (BSE)](https://www.mercari.com/jp/jobs/backend/)という職種はMercariのSREの中でもソフトウェア開発に重点を置いている職種である．開発言語にGolangを使いアプリのPush基盤やAPI gateway，Proxyサーバーといったミドルウェアを開発している．近年一番自分が使い込んできたGolangという技術を一番理想的な形で使えるのも非常に楽しみだ（とりあえずGo1.8対応はした[gaurun#57](https://github.com/mercari/gaurun/pull/57)，[widebullet#10](https://github.com/mercari/widebullet/pull/10)）．

これからよろしくお願いします🙇

（とりあえず席は[@kazeburo](https://twitter.com/kazeburo)さんと[@bokko](https://twitter.com/cubicdaiya)さんに挟まれていて緊張感がある...！）
