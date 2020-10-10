---
title: "How to Write A Good Terraform Module"
date: 2020-10-09T23:03:16+09:00
draft: true
en: true
---

This documentation describes how to write a good terraform module. Good, in this context means, _from the user’s point of view_, easy to use and maintain for a long period of time. This documentation is mainly about the Terraform module but you can apply this to other things like kubernetes CRD.  

# Module variable is API

The first and most important thing you need to know is the Terraform module variable is API. Once you define a `variable` in the module definition, it’s open to users (=developers) and target to modification. This means it becomes an interface between users and your module. In this sense, you can think of it as API. 

“module variable is API” means you can apply many practices that are developed for building good API (e.g., syscall or HTTP API) to module development. The following practices are mainly from these practices. 

## Module should be deep

The terraform module is an abstraction of the collection of Terraform resources. An abstraction is a simplified view of any entity, which omits unimportant details. We create a module to make it easier for us to think about and manipulate complex resources. 

The best modules are those that provide powerful functionality yet have a simple interface. In the book, [A Philosophy of Software Design](https://www.amazon.com/dp/B07N1XLQ7D) calls this “Deep module”. You can see the visualized notion of this above. “Deep” means they have lots of functionality hidden behind a simple interface. On the other hand, “Shallow module” is one whole interface is relatively complex in comparison to the functionality that provides (does not hide much complexity).


The module’s interface represents the complexity of that module imposes to the user: the smaller and simpler the interface, the less complexity that it introduces. When designing your terraform module, always think about the depth of it.

Be careful that once you open your interface and it’s used by users, you can not change or delete it easily.  And it may be used in an unexpected way (See [Hyrum's Law](https://www.hyrumslaw.com/)). So what variable to expose is really important. 

You can more learn about interface design from[ Consider the interface](https://increment.com/apis/consider-the-interface-api-redesign/). 

## Interface should be intuitive

The module interface = variable should be intuitive to use. What happens when changing the variable should be obvious and predictable to users. Don’t surprise your users. For example, avoid using the `enable_x` variable for enabling features not related to x. 

Using consistent naming and format is also important to make it intuitive. For example, if the module uses the `enable_x` variable for enabling feature x, then enabling x should be also done by the `enable_y` variable, not by `setup_y` or `use_y`.

## Module should be configured with smart default

The module variable should have a smart default value which covers 80% of users. Smart value means the best value in a limited context. The module which can be used without any configuration is the best. It also related to the upgrading strategy below. So thinking deeply about what default value it should have. 

But, at the same time, it should have configuration knobs for the power users. Normally, you have users who can not use the module like the 80% of normal users. For such users, you should prepare ways of changing the behavior of the module. This knob should be designed properly and avoid becoming a shallow interface. 

# Upgrading must be easy as possible

Upgrading is one of the most critical tasks of long-developing software. But, at the same time, it’s also the most MENDOKUSAI task. Since your new feature of the module in the latest version, if you want users to use it, you need to ask users to upgrade it. To make it works, upgrading must be easy as possible and less cost to users. 

To make it easy, _keeping backward compatibility_ is most important. In the case of the Terraform module, if there is no terraform diff when upgrading the module version, it means it keeps backward compatibility. If there is no diff, users do not need to care about anything when upgrading. So the best upgrading is no terraform diff. 

The following practices are the idea of achieving this and reducing the cost of upgrading. 


## New functionality should be off by default

If you want to introduce new functionality to the module, you should make it “off” by default. It should be explicitly “on” by the users who want to use it. 

Sometimes, you want to enforce all your users to use some features by default. Even in that case, you should do it gradually. When introducing, it should be off by default. Then you should ask users to enable it explicitly. After the feature adaption rate is increased, then you can make it “on” by default. With this, you can reduce the effect of upgrading (changes affect the small number of users).


## Diff should be less as possible

It’s not possible to make it no diff always. Sometimes you need to introduce breaking changes e.g., because of breaking changes of dependent resources or security issues needed to be patched as soon as possible.  In that case, you must think about how to reduce the cost. If diff is less, then the cost of upgrading is less. The more you include diff, the fewer chances users upgrade it. 

When introducing the breaking changes, you must tell it by the documentation. If the documentation clearly describes the changes, the cost of upgrading also decreases. For example, if you show what kind of diff is expected in the documentation and safety of it, users can upgrade it without fear. For this, you can use [CHANGELOG](https://keepachangelog.com/en/1.0.0/) or your user guides. 

