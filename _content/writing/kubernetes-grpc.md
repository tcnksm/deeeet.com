---
title: "Kubernetes上でgRPCサービスを動かす"
date: 2018-03-30T01:21:28+09:00
---

Kubernetes上でgRPCサービスを動かすことが多くなってきている．が適切にロードバランスをする，リクエストを落とさずサービスをデプロイするためにいくつか注意することがあるので簡単にまとめておく．

以下の2つを意識する．

- [Kubernetes Service](https://kubernetes.io/docs/concepts/services-networking/service/)はL4のLoad balancer（LB）であること
- gRPCはコネクションを使いまわすこと

KubernetesのPodは死んだり作られたりを繰り返す．KubernetesのPodにはそれぞれ内部IPがアサインされるが，このIPはPodが新しく作成される度に変わる．IPが変わってもPodにアクセスするためにKubernetesではServiceをつくる．ServiceはPodを抽象化し[Virtual IP（VIP）](https://blog.openshift.com/kubernetes-services-by-example/)を提供する．VIPを使うことでPodのIPが変わってもPodにアクセスすることができる．

VIPはNetwork interfaceに接続された実際のIPではない．VIPの目的は単純にTrafficを対象のPodにforwardすることであり実体は[iptables](https://wiki.centos.org/HowTos/Network/IPTables)である（ちなみにVIPとPodsのIPのMappingは[kube-proxy](https://kubernetes.io/docs/reference/generated/kube-proxy/)が担っており継続的にKubernetes API経由でServiceの変更を検知しiptablesの設定を更新する）．これよりKubernetesのSewrviceはTCP/IPベースの，つまりL4のLoad balancer（LB）であることがわかる．

Kubernetesは内部DNSも提供しServiceに対してもDNSレコードが作られる（e.g., [my-svc.my-namespace.svc.cluster.local](my-svc.my-namespace.svc.cluste.local)）．このDNSが返すレコードは上述のVIPでありPodのIPは返さない（理由としてはTTLを無視した古いDNSライブラリなどの影響を避けるためである）．

HTTP 1.1 / RESTの場合は都度コネクションが貼られるためこの内部DNSとServiceへのリクエストは問題なくロードバランスされる．がコネクションを使いまわすHTTP2の上にのるgRPCでは問題になる．単純にやると複数のServerがあろうと全てのリクエストは1つのServerにのみ到達する（L4のLBではgRPCは適切にロードバランスできない．詳しくは[Introduction to modern network load balancing and proxying]( https://blog.envoyproxy.io/introduction-to-modern-network-load-balancing-and-proxying-a57f6ff80236)を読むと良い）．Clientを増やしても「運が良ければ」別のサービスにLBされるのみである．Clientの数がServerよりも少ないと幾つかのServerはidleになってしまう．

## Client-side LB

現状の解法としては[Headless Service](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)（内部DNS経由で各PodのIPが取得できる）+ [gRPC Client Side LB](https://github.com/grpc/grpc/blob/master/doc/load-balancing.md)を使うのが良い．Goの場合は[v1.6でDNS Resolverが入った](https://github.com/grpc/grpc-go/releases/tag/v1.6.0)のでそれを使う（今までは自分で書かないといけなかった...）．以下のようにDialする．

```
resolver, _ := naming.NewDNSResolverWithFreq(1 * time.Second)
balancer := grpc.RoundRobin(resolver)
conn, _ := grpc.DialContext(context.Background(), grpcHost,
	grpc.WithInsecure(),
	grpc.WithBalancer(balancer))
```

これによりgRPCはDNS経由でPodのIPを取得し全てのgRPC serverにコネクションを張りMethod call毎にロードバランスを行うようになる．また定期的にDNS resolveをしPodのIPに更新があればコネクションを張り直す．`Freq`はなるべく短くしておく必要がある．PodのIPは頻繁に変わるのですぐに更新される必要がある（デフォルトだと30分なので完全に死ぬ）．

MicroservicesのようにPolyglotを意識しないといけない場合はClient-side LBを言語毎に実装するのは現実的ではない（例えばPythonの場合はDNS cacheが問題になった...）ためSidecarパターンを考えるのが良い．

## Sidecar
gRPC/HTTP2を扱える+Kubernetesで動かすProxyとしては[Envoy](https://www.envoyproxy.io/)がデファクトになりつつある．[Envoy](https://www.envoyproxy.io/)は[Sidecarコンテナ](http://blog.kubernetes.io/2015/06/the-distributed-system-toolkit-patterns.html)としてClient Pod内にデプロイするようにデザインされている．ClientからServerへのリクエストをSidecar Envoy経由にすることでEnvoyが適切にgRPCリクエストのロードバランスを担ってくれるようになる．詳しくは[Using Envoy to Load Balance gRPC Traffic](https://blog.bugsnag.com/envoy)が詳しい．

Client-side LBと比較したSidecarの利点はアプリケーションコードに変更を加える必要がない点である．ただ毎回Sidecarを意識してデプロイするのは煩雑であるので[Istio](https://istio.io/docs/concepts/what-is-istio/overview.html)などを使いService Meshを構築してしまうのが今後の方向性だろう（Istioの利点はLB以外にもある）．

## Deployment

更に注意するべきはDeployment（というかRolling Upgrade）である．何も考えずにRolling upgradeを使うとPodを作り殺しが断続的におきる．接続中のコネクションはDrainされDNSが更新されるまでは新規のPodにリクエストを投げることができなくなる．

リクエストを落とさないでgRPCサーバーをデプロイするにはReplicaSetを使いBlue/Green的にDeployするのが良い．

- 新しいReplicaSetをロールアウトし
- 古いのを消さないでServiceの向き先を変え
- DNSの更新が終わったら古いReplicaSetを消す

をすればリクエストを落とすことなく新ServerをDeployできる．MercariではCDに[Spinnaker](http://tech.mercari.com/entry/2017/08/21/092743)を使っておりSpinnakerはReplicaSetによるRedBlackをサポートしてるのでそれをそのまま使っている．Pipeline的には以下のようにしている．

<img src="/images/grpc-pipeline.png" class="image">


## 参考

- [Introduction to modern network load balancing and proxying](https://blog.envoyproxy.io/introduction-to-modern-network-load-balancing-and-proxying-a57f6ff80236)
- [Bugsnag Blog - Using Envoy to Load Balance gRPC Traffic](https://blog.bugsnag.com/envoy)
- [Load balancing gRPC connections in Kubernetes with Linkerd and Istio](http://blog.effectivemessaging.com/2017/06/load-balancing-grpc-connections-in.html)

