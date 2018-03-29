---
title: "KubernetesでGPUを使う"
date: 2018-01-15T09:42:40+09:00
---

一般的なWebアプリケーションと比較してMachine Leaning（ML）は複雑なインフラを要求する．Data processingを行う環境やModelのTraining/Validationを行う環境，実際にサービスからModelを利用するためのServingの環境といった複数の異なる環境が必要であり，WorkloadによってはCPUだけではなくGPUも必要になる．これらを効率的に扱うためのインフラを構築・運用するのは容易でなく[Google and Uber’s Best Practices for Deep Learning](https://medium.com/intuitionmachine/google-and-ubers-best-practices-for-deep-learning-58488a8899b6)にあるようにこれまで培われてきたDevOpsの知見を結集していく必要がある．

このような複雑なMLのインフラとしてContainerとKubernetesが利用されることが多くなってきている．特に複数の環境間のPortabilityやTrainingとServingでのScalability，各種ハードウェアやCloud Providerの抽象化においてその利点を多く享受できるからである．実際[KubeCon2017感想: Kubernetes in 2018]((https://medium.com/@deeeet/kubecon2017%E6%84%9F%E6%83%B3-kubernetes-2018-7cf4280d435b))にも書いたようにKubeCon 2017ではML on kubernetesのセッションが多く見られたし，メルカリでもKubernetesを使ったMLモデルのServingを始めている（[参考](http://tech.mercari.com/entry/2017/12/02/093000)）．

ML on Kubernetesで特に気になるのはGPUをいかに使うかだろう．Kubernetesでは既にv1.6から実験的にNVIDIA GPUへのPodのスケジューリングが可能になっていた．そしてv1.8以降は新たに導入された[Device Plugin]( https://kubernetes.io/docs/concepts/cluster-administration/device-plugins/)と[Extended Resources](https://kubernetes.io/docs/concepts/configuration/manage-compute-resources-container/#extended-resources)という機構によってより容易にGPUが使えるようになっている．

ただしネット上でKubernetes GPUについて検索すると多くの試行錯誤が散らばっておりどの情報が最適な解かわからない状態になっている．本記事では現時点（2018年1月）において最適な方法を簡単に整理する．具体的にはGKEからGPUをつかう最適な方法についてまとめる．なおこの分野は今後も変化がある部分であるので定期的に更新を行う．

## KubernetesでGPUを利用するのに必要なこと

KubernetesでNVIDIA GPUを利用するには以下の3つが必要である．

- GPUを積んだインスタンスを準備する
- NVIDIA GPUのDriverを準備する
- NVIDIA Device Pluginを有効にする

以下ではこれらを順番に見ていく．

### GPUを積んだインスタンスを準備する

まずはGPUを準備しなければ何も始まらない．~~現時点（2018年1月）でGKEでGPUを積んだインスタンス（NodePool）を準備するには[Alpha cluster](https://cloud.google.com/kubernetes-engine/docs/concepts/alpha-clusters)を使う必要がある．Alpha Clusterは全てのKubernetes APIと機能が有効になった実験用のClusterであり30日間しか利用できない．つまり現時点ではGKEでGPUはProduction readyでない~~．（追記）GKE 1.9.2-gke.1よりAlphaクラスタでなくてもGPUを積んだインスタンス（NodePool）が使えるようになった．またGPUを使えるRegionは限られておりアジアだと現時点（2018年2月）で`asia-east1-a`（Taiwan）のみが利用可能である（[参考](https://cloud.google.com/compute/docs/gpus/)）．


GPUを積んだNode Poolを立てるには`--accelerator`オプションを利用する．以下の例ではNvidia Tesla k80を利用する．

```bash
gcloud alpha container node-pools create “${NODE_POOL}” \
       --cluster="${CLUSTER}" \
       --project="${PROJECT_ID}" \
       --zone="asia-east1-a" \
       --machine-type=n1-standard-2 \
       --accelerator type=nvidia-tesla-k80,count=2 
```

### NVIDIA GPUのDriverを準備する

次に各インスタンスにNVIDIA GPUのDriverを準備する必要がある．全てのインスタンスにログインしてインストールを実行するわけにはいかないので[Daemonset](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)を使う．

GKEでは[Container-Optimized OS](https://cloud.google.com/container-optimized-os/)（COS）がデフォルトのOSとして使われるがそのためのDriverのインストーラーは[GoogleCloudPlatform/cos-gpu-installer](https://github.com/GoogleCloudPlatform/cos-gpu-installer)プロジェクトにある．[GoogleCloudPlatform/container-engine-accelerators](https://github.com/GoogleCloudPlatform/container-engine-accelerators)プロジェクトで準備されているDaemonsetを使えば全NodePoolに対してDriverのインストールが行える．GKE 1.8の場合は以下を実行すれば良い．

```bash
$ kubectl create -f https://raw.githubusercontent.com/GoogleCloudPlatform/container-engine-accelerators/k8s-1.8/device-plugin-daemonset.yaml
```

GKE 1.9の場合は以下を実行する．

```bash
$ kubectl create -f https://raw.githubusercontent.com/GoogleCloudPlatform/container-engine-accelerators/k8s-1.9/daemonset.yaml
```

なおCOSだけではなく実験的にUbuntu用のDaemonsetインストーラーも準備されている（[参考](https://github.com/GoogleCloudPlatform/container-engine-accelerators/blob/master/nvidia-driver-installer/ubuntu/daemonset.yaml)）．

### NVIDIA Device Pluginを有効にする

最後にNVIDIA [Device Plugin](https://kubernetes.io/docs/concepts/cluster-administration/device-plugins/)を有効にする．Device PluginはKubernetes 1.8から導入された機能である．Device PluginによりGPUやFPGAsといったVendor specificな初期化や設定が必要なリソースをKubernetesのコアのコードを変更なしに利用できるようにする．

Daemonsetで各NodePoolにインストールするとはまずDevice Pluginは[Extended Resource](https://kubernetes.io/docs/concepts/configuration/manage-compute-resources-container/#extended-resources)（これも1.8で導入された）を利用して新しいDeviceリソースを登録・利用可能にする．例えばNvidia GPUの場合は`nvidia.com/gpu`というリソース名でそのリソースをPodから利用できるようにする．

次にDevice Pluginは各ノードのDeviceの状態を監視し変更があればKubeletに通知を行う．そしてContainerが作成されるときにはDevice specificなオペレーションを実行しContainerでそのDeviceを利用するためのステップをKubeletに通達する．例えばNvidia GPUの場合はノードにインストールされた必要なDriverのライブラリをContainerにMountする（Device Plugin以前は自分で必要なホストディレクトリをMountする必要があった）．

GKE 1.8の場合は先のDaemonsetを有効にすればDevice Pluginも同時に有効になる．GKE1.9の場合はGPUが積まれた場合にAddonとして自動で有効になる（[参考](https://github.com/GoogleCloudPlatform/container-engine-accelerators/tree/master/cmd/nvidia_gpu)）．

GCP以外の環境であればNVIDIA公式が提供するDevice Plugin．[NVIDIA/k8s-device-plugin](https://github.com/NVIDIA/k8s-device-plugin)が利用できる（これには[nvidia-docker 2.0](https://github.com/NVIDIA/nvidia-docker)が必要である）．Kubernetes 1.8の場合は以下を実行すれば良い．

```bash
$ kubectl create -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v1.8/nvidia-device-plugin.yml
```

### PodをGPUにスケジューリングする

最後に以下のようなYAMLを書けばPodをGPUにスケジューリングできる．

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cuda-vector-add
spec:
  restartPolicy: OnFailure
  containers:
    - name: cuda-vector-add
      # https://github.com/kubernetes/kubernetes/blob/v1.7.11/test/images/nvidia-cuda/Dockerfile
      image: "k8s.gcr.io/cuda-vector-add:v0.1"
      resources:
        limits:
          nvidia.com/gpu: 1 # requesting 1 GPU
```

## まとめ

本記事ではKubernetesからGPUを使う方法の現状を整理した．GKEではAlpha Clusterのみで利用可能でありProduction用途にはまだ向いていないがすぐに利用可能になるだろう．GPUを使う事自体は始まりに過ぎずこの上でどのようなWorkflowを実現していくかがSRE的に/DevOps的に重要になるだろう．

## 参考

- [Schedule GPUs | Kubernetes](https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/)
- [Using GPUs With Kubernetes](https://engineering.bitnami.com/articles/using-gpus-with-kubernetes.html)
- [Langhalsdino/Kubernetes-GPU-Guide](https://github.com/Langhalsdino/Kubernetes-GPU-Guide)
- [Kubernetes + GPUs  Tensorflow](https://medium.com/intuitionmachine/kubernetes-gpus-tensorflow-8696232862ca)
- [GPU-accelerated TensorFlow on Kubernetes](https://www.oreilly.com/ideas/gpu-accelerated-tensorflow-on-kubernetes)
- [''Hot Dogs or Not" - At Scale with Kubernetes](https://www.youtube.com/watch?v=R3dVF5wWz-g&list=PLj6h78yzYM2P-3-xqvmWaZbbI1sW-ulZb&index=175)
- [Building GPU-Accelerated Workflows with TensorFlow and Kubernetes](https://www.youtube.com/watch?v=OZSA5hmkb0o&index=174&list=PLj6h78yzYM2P-3-xqvmWaZbbI1sW-ulZb)
