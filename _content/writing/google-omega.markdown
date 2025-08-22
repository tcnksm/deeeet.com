+++
date = "2015-03-17T13:53:10+09:00"
draft = true
title = "Google omega"
+++


## The problem

- Data lake
- Multiple frameworks
- Duplicate data
- Cluster utilization


## Types of Schedulers

- Static partitioning
- Monolithic
    - Single Resource Manger and Scheduler
    - Stable, been around since 1990s
    - e.g., Google Borg
    - Issues
        - Scalability is limited
        - Head of lin blocking ?
        - multi Path scheduling addresses some of these problems
- Two Level
    - Single Resource management and mutiple scheduler
    - Resource manager dynamically partitions a cluster
    - Resources presented to partitions as "offers"
    - Partitions request resrouce as needed
    - e.g., Mesos
    - Issues,
        - Pessimistic locking is used during allocation
        - Not suitable for "long running" jobs
        - Gang scheduling?? (e.g., MPI) can cause deadlocks
        - Each scheduler has no idea about any other scheduler, pre-emption (先取権) is tricky
- Shared state
    - Multiple schedulers with access to all resources
    - No external resource manager        
    - Each sheduler has full access to cluster
    - Optimistic concurrency controll
        - Updates are made automatically in a transaction
        - Only one commit will succeed
        - Failed transactions will try again
    - Gang scheduling, will not result in resource hoarding (買いだめ/仮囲い)
    - Each scheduler, free to choose a policy
    - Requires a common understanding of, Resources and Precedence (優先権)
    - Relies on post-facto enforcement?
    - Results in high utilization and efficiency
    - e.g., Google Omega

## Types of scheculers

- Monilithic, no concurrency
    - スケジューリングのロジックをもつサーバーにクラスタのリソース状態も集まる
- Two-level, pessimistic concurrency (offers)
    - クラスタのリソース状態はmasterに集まる
    - スケジューリングのロジックはフレームワークとして複数存在する
    - フレームワークは全リソース状態のサブセットのみをもつ
        - なぜサブセット..?
        - ACL的にリソースに制限を加えるため..?
- Shared state, optimistic concurrency (transactions)
    - クラスタの状態を管理するmasterは存在しない
    - スケジューリングのロジックはフレームワークとして複数存在する
    - フレームワーク間で全リソースの状態を共有する

## Schedullers

- YARN
    - Architecture
        - Resource Manager
            - Schduler
            - Application manager (Allocate app master
        - Node Manager (Send resources availability, container management        
        - Application master (Request resources, Application execution
        - Container
    - Advantages
        - Scale
        - Data locality ?
        - Easy to port a new framework ?
    - Drawbacks
        - Failure recovery
        - High latency ?
        - Network overload ?
    - Performance
- Mesos
    - Architecture
        - Mesos slave (Send resource availability, Get task
        - Mesos master 
        - Framework
            - Framework Schduler (Get resource availability, Ask task     
    - Advantages
        - Flexible
        - Extensible
        - Fault tolerance
            - Backup master node
            - Recreate master using communication
            - Use checkpoints for the slaves
    - Drawbacks
        - Complex to port a framework ?
        - Intensive (激しい) communication
        - Revocation (廃止/撤回/取り消し) might be dangerous
        - **Not suitable for long running jobs**
    - Performance    
- Omega
    - Architecture
    - Advantages
    - Drawbacks
    - Performance


## References

- k8s's scheduller
- Flynn's scheduller
- Fleet's scheduller
- [Omega: flexible, scalable schedulers for large compute clusters](http://research.google.com/pubs/pub41684.html)
- [Scheduling on large clusters - Google's Borg and Omega, YARN, Mesos](http://www.slideshare.net/sameertiwari33/scheduling-on-large-clusters)
