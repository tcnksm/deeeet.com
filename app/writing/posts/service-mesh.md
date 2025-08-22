---
title: "Service meshとは何か"
date: 2018-05-22T21:50:11+09:00
---

Microservicesの世界においてService meshは大きなキーワードになった．KubeCon 2017やKubeCon 2018 EUにおいても多くのセッションをService mesh（もしくはその代表格である[Istio](https://istio.io/)）が占めており注目の高さも伺える．もちろんMicroservicesを進めるMercariにおいても導入を検討しており今後重要なコンポーネントの1つになると考えている．本記事ではそもそもなぜService meshという考え方が登場したのか，なぜ重要なのか? その実装としてのIstioとは何で何ができるのか? について簡単にまとめてみる．

## 参考文献

Service meshを一番理想的な形でサービスに使い始めその考え方を広めたのは[Lyft](https://www.lyft.com/)だ（と思う）．LyftはIstioのコアのコンポーネントである[Envoy](https://www.envoyproxy.io/)を開発しそれを用いてService meshを構築し自社のMicroservices化の課題を解決してきた．Service meshの初期衝動や真価を知るにはLyftの事例を見るのが良い．Envoyの作者である[Matt Klein](https://twitter.com/mattklein123)によるKubeCon2017での発表["The mechanics of deploying Envoy at Lyft"](https://schd.ws/hosted_files/kccncna17/87/Kubecon%2012%252F17.pdf)や彼が寄稿している[Seeking SRE](http://shop.oreilly.com/product/0636920063964.do)の13章"The Service Mesh: Wrangler of Your Microservices?"などがとても参考になる．

またService meshを広めるきっかけとなったオープンソースのプロジェクトは[Istio](https://istio.io/)である．Istioはまだ登場したばかりであるが既に書籍がある．RedHatの開発者による[Introducing Istio Service Mesh for Microservices](https://developers.redhat.com/books/introducing-istio-service-mesh-microservices/)（無料!）を読むとIstioの大まかな概要を掴めると思う．

さらに（これはまだ自分が読み途中だが）[Zero Trust Networks](http://shop.oreilly.com/product/0636920052265.do)もService meshを知る上で重要な考え方の１つだと思う．


## Microservicesの現状と課題

最初にMicroservicesの世界の現状と課題について簡単にまとめる

### 言語

Microservicesおいて[Polyglot](https://en.wikipedia.org/wiki/Polyglot_(computing))は普通だ．そもそも適切なサービスで適切な技術を採用できるようにすることはMicroservicesの大きな目的の1つであり，その選択にはプログラミング言語も含まれる．特に現状では普通のAPIに関してはGoが選択されることが多いが，Machine learningのモデルのServingにはPythonをフロントエンド系にはNodeをという選択は普通に有り得る．正直そのサービスオーナーが運用や採用を含めて責任を持てるならHaskell使おうとRustを使おうと問題はない（はず）．

また言語によってはフレームワークも多彩であり，例えばPythonであればFlaskを使うこともあればDjangoを使うこともあるだろう．

### Protocol

Microservicesにおいてはサービス間はネットワーク越しにコミュニケーションを行う．そのためそのコミュニケーションに利用するProtocolも多彩になる．Mercariのように[gRPC](https://grpc.io/)を共通のProtocolとして採用することもあれば，HTTP/1.1もしくはHTTP/2でRESTを使うこともある．MessagingとしてKafkaやCloud PubSubを使ったり，CacheとしてRedisやMemcacheを使ったり，DatabaseとしてMySQLやMongoを使うこともありそれぞれProtocolは異なる．

### 分散システム

ネットワーク越しのリクエストが前提となるMicroservicesは分散システムである．[Fallacies of distributed computing](https://en.wikipedia.org/wiki/Fallacies_of_distributed_computing)（分散コンピューティングの落とし穴）にあるように「ネットワークは信頼できる」と思ってはいけない．この分野では，リクエストが失敗したときにback-offつきでRetryを行うこと，Timeoutを設定すること，適切なRate-limitをつけ異常なリクエストをブロックすること，対象のサービスが何らかの障害で死んでしまってもCircuit breakingでそれを回避することなど多くのBest practiceが養われてきた．MicroservicesはこれらのPracticeを使う必要がある．

### Observability

<blockquote style='border-left:4px solid #eee; padding-left:2em; font-size:18px; font-style: italic; margin:2em 0'>Ultimately the most critical thing is observability. As I like to say: observability, observability, observability - Matt Klein</blockquote>

上で紹介した[Seeking SRE](https://shop.oreilly.com/product/0636920063964.do)においてMatt Kleinが述べているようにMicroservicesでは可視化が全てだ．ログやメトリクス，分散Tracingを駆使してあるリクエストがどこで何が起こったのかを理解できるようにしなければならない．これをちゃんとやるにはログやメトリクスなどは一貫性のあるフォーマットに揃っている必要もある．

（KubeConとかで話しているとこれができてないところは多いらしい...）

### 認証認可

Microservicesでは各チームは自分のサービスに対して責任を持ち他のサービスについて気にしないことが理想だ．このためには[Zero Trust](https://shop.oreilly.com/product/0636920052265.do)（もしくはDon't trust each other）を前提とし，サービス間はデフォルトでmTLSもしくはRole-Based Access Control (RBAC)などによるAuthN/AuthZを行う必要がある．

## Service meshの登場

上述した機能や課題を全てアプリケーションレイヤーで実装するのは現実的ではない．**アプリケーション開発者はビジネスロジックを書き最高のサービスを書くことに集中しそれ以外のMicroservices固有の問題からは開放されないければならない**．古くからMicroservicesを実践してきた大企業，例えばNetflixやGoogle，Twitterなどは各言語向けのSDKを実装することでこれらを解決してきた．NetflixがOSSとして公開している[Hystrix](https://github.com/Netflix/Hystrix)などは有名だ．しかしこの方法には以下のような課題がある．

- 利用できる言語が限定されてしまう（例えばNetflixはJVMが前提）
- 各言語毎にSDKを準備したとしても言語間で一貫性を保つのが難しい
- SDKのアップデートを集中管理するのが難しい

これらの課題を踏まえ登場したのがService meshである．Service meshは以下の図のように全てのサービスと一緒にSidecarとしてProxyをデプロイし，サービス間のコミュニケーションをすべてこのProxy経由で実行するようにすることで*mesh*を構成する．そしてこのProxyレイヤーでTraffic controllやLB，ネットワークのResiliency、Observability，Securityなどを担保する．

![](http://philcalcado.com/img/service-mesh/6-a.png)

http://philcalcado.com/img/service-mesh/6-a.png

![](http://philcalcado.com/img/service-mesh/mesh1.png)

http://philcalcado.com/img/service-mesh/mesh1.png

## Istioとは何か

このService meshの代表的な実装として有名なのが[Istio](https://istio.io/)である（他にも[Linkerd](https://linkerd.io/)や[conduit](https://github.com/runconduit/conduit)がある）．

以下の図はIstioのアーキテクチャである．ここではIstioの各コンポーネントについて簡単にまとめる．Istioのコンポーネントは大きく分けて**Data plane**と**Control plane**に分けることができる．

![](https://istio.io/docs/concepts/what-is-istio/img/overview/arch.svg)

### Data plane

Data planeは全てのサービスのIngressとEgressリクエストをinterceptする．アプリケーションから見ると単純にリモートのサーバーに対してHTTPリクエスト，もしくはgRPC callなど発行してるだけでありその下で何が起こってるかは意識する必要がない．Data planeが多くの処理をアプリケーションの代わりに担う．

Data PlaneはService proxyとSidecar containerという2つの概念から構成される．

#### Service proxy

アプリケーションはService proxyを経由して外部のサービスとのやりとりを行う．このProxyが，リクエストのRetryやTimeout，Circuit breaking，Service discovery，Securityなどを担う．IstioではデフォルトでこのProxyに[Envoy](https://www.envoyproxy.io/)を利用している．

EnvoyはC++で書かれた[L7 Proxy](https://en.wikipedia.org/wiki/OSI_model)でありLyftで開発された．Lyftの大規模なリクエストを捌いているという実績があり，HTTP/1.1やHTTP/2，gRPCのロードバランシング，リクエストレベルのメトリクスやTracing span，active/passiveのhealth checkなどの多くの機能を持つ．Istioの多くの機能はEnvoyがあってこそ実現されている．

ではIstioはどのようにEnvoyをService Proxyとしてデプロイしているか? Sidecar container patternを使う．

#### Sidecar container

Kubernetesの世界では複数のContainerをまとめてPodという単位でデプロイを行う（[Kubernetes: Understanding Pods vs. Containers by Tim Hockin](https://speakerdeck.com/thockin/kubernetes-understanding-pods-vs-containers)）．同じPodに属するContainerは同じNodeにデプロイされ協調して動くことで１つのサービスや機能を提供する．Sidecar containerはメインとなるアプリケーションContainerと一緒にPodとしてデプロイされ補助的な役割を担うContainerである．

Istioにおいては，このSidecar containerはIstio-proxyと呼ばれアプリケーションcontainerと一緒にデプロイされそこからのIngressとEgressのリクエストを受けるようになる．Sidecar containerのデプロイは手動でInjectすることもできるしHookとして自動でInjectすることもできる（完全なmeshを構築する場合は後者の手法を用いるのが良い）．

### Control plane

Control planeはData planeのBrain的な役割を担う．Control planeはPilotとMixerとAuthの3つのコンポーネントから構成される．

#### Pilot

PilotはMicroservicesが最新のNetwork topologyやRouting tableを持っていることを保証する．Service discoveryに加えてA/B testsやCanary deploymentのようなTraffic controllやリクエストのTimeouts，Retries，Circuit breakeringのようなネットワークのResiliencyの機能を提供する．Pilotはこれらの機能のための専用の設定をEnvory specificな設定に変換し配下のService proxyにそれを伝搬させる．具体的に専用の設定には`RouteRule`と`DestinationPolicy`がある．

![](https://istio.io/docs/concepts/traffic-management/img/pilot/TrafficManagementOverview.svg)

#### Mixer

Mixerはアクセスコントールの施行やService proxyからのTelemetry dataの収集を担う．MixerによりACL（Precondition Checking）やリクエストのRate-limit（Quota Management）の設定をしたり共通のメトリクスの収集（Telemetry Reporting）を行うことができる．MixerはPluggableであり，Adaptersを実装することでloggingやmonitoringやACLの機能をインフラに合わせて拡張していくことができる．Mixerは`rule`やAdapterごとの設定ファイルをもつ．

![](https://istio.io/docs/concepts/policy-and-control/img/mixer-config/machine.svg)

ちなみにMixerがSPOFになるのでは?と思ったら[Mixer and the SPOF Myth](https://istio.io/blog/2017/mixer-spof-myth.html)を読むと良い（まとめるとStatelessでありむしろスケールしやすいアーキテクチャ）．

#### Auth

Authはx509証明書のIssue，RevokeやRotationを行う．Authは全てのMicroservicesに証明書を発行しサービス間のmTLSによるAuthNを実現する．アプリケーションからUnencriptedなリクエストを投げてもService Proxy間，Mesh内ではEncryptedな通信へと透過的にUpgradeする．

![](https://istio.io/docs/concepts/security/img/mutual-tls/auth.svg)

## IstioのConfiguration

IstioのConfigurationとして主に我々がコントールするのはTraffic ManagementやSecurityになる．ここでは具体的な設定例を見てみる．

## Traffic Management

Traffic Mamagementを主に担うのはPilotだ．Pilotの設定には大きく`RouteRule`と`DestinationPolicy`がある．

`RouteRule`はService mesh内でリクエストをどのようにRoutingするかを決定する．RoutingのルールにはHTTP headerを使ったり複数バージョンごとに重みを設定することもできる．例えばv1とv2という複数のバージョンを同時にデプロイし以下のような設定ファイルを適用するとv2に25%，v1に75%の割合でリクエストをRoutingすることができる．またリクエストのRetryやTimeoutの設定も`RouteRule`で実現できる．

```yaml
apiVersion: config.istio.io/v1alpha2
kind: RouteRule
metadata:
  name: reviews-v2-rollout
spec:
  destination:
    name: reviews
  route:
  - labels:
      version: v2
    weight: 25
  - labels:
      version: v1
    weight: 75
```

ちなみに`RouteRule`を使うことでリクエストにFaultをInjectすることもできる．例えば以下のルールを適用すると10%の割合でリクエストに5sのDelayを付加することができる．他にも特定の割合で任意のHTTP Statusコードを返すなどもできる．これにより例えば開発環境で依存するサービスに問題があっても自身のサービスを問題なく動かし続けることができるかをテストすることができる（Chaos testingには[Gremlin](https://www.gremlin.com/)のような専用のSaaSを使うという手もある）．

```yaml
apiVersion: config.istio.io/v1alpha2
kind: RouteRule
metadata:
  name: ratings-delay
spec:
  destination:
    name: reviews
  route:
  - labels:
      version: v1
  httpFault:
    delay:
      percent: 10
      fixedDelay: 5s
```

`DestinationPolicy`により特定のBackendやサービスに対するLoad-balancingのアルゴリズムやCircuit BreakingやHealth checkの設定を行うことができる．例えば以下の設定ファイルを適用するとreviewサービスのv2からratingサービスのv1に対して`ROUND_ROBIN`によるLoad-balancingが行われるようになる．

```yaml
apiVersion: config.istio.io/v1alpha2
kind: DestinationPolicy
metadata:
  name: ratings-lb-policy
spec:
  source:
    name: reviews
    labels:
      version: v2
  destination:
    name: ratings
    labels:
      version: v1
  loadBalancing:
    name: ROUND_ROBIN
```

`RouteRule`と`DestinationPolicy`の違いはリクエストベースの設定か特定のBackendベースの設定かの違いである．どちらかを使えば良いわけではなく例えばネットワークのResiliencyの設定は`RouteRule`のTimeoutとRetryと`DestinationPolicy`のCircuit Breakingを組み合わせることで実現する．

### Security

Securityで主に関わるコンポーネントはIstio-AuthとMixerだ．Istio-AuthでmTLSをMixerでACLを実現することができる．

例えば以下はMixerのPrecondition Checkingの機構を使いBlacklistを実現する例である．`reviews`サービスのv3からのリクエストを全て禁止している．

```yaml
apiVersion: "config.istio.io/v1alpha2"
kind: denier
metadata:
  name: denyreviewsv3handler
spec:
  status:
    code: 7
    message: Not allowed
---
apiVersion: "config.istio.io/v1alpha2"
kind: checknothing
metadata:
  name: denyreviewsv3request
spec:
---
apiVersion: "config.istio.io/v1alpha2"
kind: rule
metadata:
  name: denyreviewsv3
spec:
  match: destination.labels["app"] == "ratings" && source.labels["app"]=="reviews" && source.labels["version"] == "v3"
  actions:
  - handler: denyreviewsv3handler.denier
    instances: [ denyreviewsv3request.checknothing ]
```

## まとめ

Service meshとは何でなぜ必要なのか?からその実装例としてのIstioの概観をまとめた．

現在実際にサービスに導入することを考えているが，（Istio自体の安定性やPerformanceは改善されるとして）大きく2つの悩みがある．まず[Kubernetes YAMLの壁](https://deeeet.com/writing/2018/01/10/kubernetes-yaml/)で書いたのと同様のYAML問題．KubernetesでさえYAML問題を抱えているのに更にそれを増やすか...Kubernetesのそれに対する解答として登場したHelmやKsonnetのIstio版，つまりより抽象化された設定などが必要であると感じている．またFault InjectionやAB testingなどはGUIでちゃちゃっとやっても良いのではないかと思っている．

次に誰がYAMLを管理するか問題．基本的には開発者がIstioの設定などに悩むことなくデフォルトで安全なネットワークを提供するのがベストだと考えている．その上で要求に合わせて設定を変えていくという方式，集中管理から適宜移譲していくのが良いのかなあ? ただABテストなどを集中管理してもなあ．Precedenceなどをうまく使うか... この辺りの解はそのうち会社のBlogで．
