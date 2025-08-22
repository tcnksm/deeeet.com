---
title: "Practices as a Platform Engineer"
date: 2020-06-16T00:41:49+09:00
en: true
---

I’ve been working as a platform engineer (platformer) for almost 5 years. In the previous company, I worked on the internal PaaS based on[ Cloud Foundry](https://www.cloudfoundry.org/) and, in the current company, I’ve been working on the[ microservices platform](https://speakerdeck.com/tcnksm/microservices-platform-on-kubernetes-at-mercari) based on[ Kubernetes](https://kubernetes.io/).

Since it's been 5 years, I have some practices which I use for daily decision-making as a platform engineer. In this post, I introduce some of them. The things I listed below are not special and you’ve heard or seen some of these things somewhere. These come from my daily inputs or experiences with the team I’ve been working.

Since they are just practices, you won’t be able to use them for 5 or 10 years and they should be updated when the trend or the world changes. This is just a record of 2020.

# Immutable Infrastructure

To provide a better product to customers faster, Continuous Delivery is one of the most important factors. A big part of making Continuous Delivery practice successful is to be able to push new changes without fear. The immutable infrastructure allows us to do deterministic deployment (safely rollouts and rollbacks). For successful continuous delivery and reliable delivery, all our components must be immutable. We don’t SSH to modify things in production. This practice must be also applied to configuration management or application source code as well.

# Environmental Parity

We must keep the development and production of environmental parity as much as possible. We must enable developers (even us) to reproduce production issues in the development environment. Always test on development before production and grow confidence in production. And we must treat the development environment as production. If we break the development environment, it blocks the developer in testing and stalls agility.

# Declarative Configuration

All infrastructure state or application state must be defined in “infrastructure as code” way. We should not do or depend on manual operations in production (and even in development). It leads to implicit knowledge and human errors. Infrastructure as code allows us to review the operation and automate it in CI. And the code must be declarative, not imperative. The declarative way enables us to build self-healing or autonomous components. It reduces our operation cost a lot. We should build tools based on “Infrastructure as data” way. We should not mix programmatic logic and data but clearly separate. The computation must be done by real programing language.

# Documentation as a Product

Documentation is the minimum variable product of the platform. We must handle documentation as one of our products. This means the documentation must be always reviewed and maintained when something changes. When we release something new, we must provide the documentation together.

# Simple, Consistent, and Predictable

Developer experience (DX) we provide and operation workflows we prepare for our component should be simple, consistent, and predictable. How to work with component should be as simple to learn as possible and consistent across the multiple components (action to component A should be the same as component B). And action to the components should be always predictable. This means changes are always expected and visible before execution. The catastrophic changes should be always blocked or notified.

# Smart Default but Configurable

The tool we provide should be well abstracted and hide complex configuration (and underline complex infrastructure) as possible. Instead of asking developers to configure all but provide smart default which covers 80% of usage. To cover the rest of 20% of power users, open a well-designed control knob as well. We should consider both productivity and flexibility but the former should come first.

# Embrace Failure

No software or infrastructure is perfect. Failures are always there. We should be embracing failures instead of focusing on preventing them. We must expect potential failures and actively be testing availability and reliability before going to production. Once we faced an incident, we must learn a lot from it and avoid the same failure again.

# Having a Migration Strategy

We don’t introduce new features without thinking about migration strategy from the existing ecosystem. Keeping multiple ways of doing the same things leads bad DX and becomes a burden for the operation (and even more we need to have a workaround for a legacy way to make it work with the new ecosystem). We don’t evaluate just introducing new features. Instead, we evaluate how much is used by developers (adaption rate). We don’t create a separate new platform for doing a new thing. There should be only one base platform.

# A Platform for Platforms

We can not support all workloads or requirements by a single platform. We must enable and help other teams to build their own specialized platform to support their own workflow top on our platform without involving the platform team.

# Operation by Science, not by Art

As a platform, we need to operate and maintain our components. The operation workflow or tool we design should be strongly backed by science and engineering, not art or individual knowledge or experience. We must handle it as a science. And we should avoid using all the time to react to the incident or manual operations. We must proactively be fixing the issue and the workflow and building tools. The time for proactive and reactive should be balanced well.

# Avoiding Reinventing the Wheel

Cloud providers provide great services (by using lots of costs and resources). The OSS ecosystem (especially cloud-native ecosystem) provides great software. We must utilize them first. We must be a good curator of them and utilize it for our platform. We must avoid reinventing someone else work (when reinventing we must balance the cost and benefit and resources we have). We must build something new, something special for our use cases, and something no one has worked before. And we must open to our jobs to the ecosystem as well.

# Standing on the Shoulders of Giants

As a microservices platform or microservices world, we are far behind from the giants. We must learn aggressively learn from what they succeeded or failed and the latest trends or research results (from conferences, papers, or meeting them). Our proposal and design must be based on these learnings. The originality must be on top of the existing knowledge. Then becoming the next giant and provide our knowledge to the world to support them.
