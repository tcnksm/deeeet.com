---
title: "A Philosophy of Software Designを読んだ"
draft: true
date: 2018-10-22T22:53:20+09:00
---

[John Ousterhout](https://twitter.com/JohnOusterhout)による["A Philosophy of Software Design"](https://www.amazon.com/dp/1732102201)を読んだ．

本書はStanford大学の[CS 190: Software Design Studio](https://web.stanford.edu/~ouster/cgi-bin/cs190-winter18/index.php)という授業が基になっている．

## 複雑さ

複雑さとは「システムを理解したり変更したりすることを困難にするソフトウェア・システムの構造に関連する全て」

本書ではソフトウェアシステムの複雑さ（Complexity）を以下の数式で表す．

<img src="/images/complexity.png" class="image">

システム全体の複雑さ（`C`）は個々の部分`p`の複雑さ`cp`に開発者がその部分に費やす時間`tp`を重みづけしたものの総計で表される．

## Design Principles

- Complexity is incremental: you have to sweat the small stuff
- Working code isn't enough
- Make continual small investments to improve system design
- Module should be deep
- Interfaces should be designed to make the most common usage as simple as possible
- It's more important for a module to have a simple interfance than a simple implementation
- General purpose modules are deeper
- Separate general purpose and special purpose code
- Different layers should have different abstraction
- Pull complexity downward
- Define erros (and special cases) out of existence
- Design it twice
- Comments should describe things that are not obvious from the code
- Software should be designed fro ease of reading, not ease of writing
- The increments of software development should be abstraction, not features

## Deep module

<img src="/images/deep-module.png" class="image">

## Define Erros Out of Existence

## Comments


## 参考

- [John Ousterhout: "A Philosophy of Software Design" | Talks at Google](https://www.youtube.com/watch?v=bmSAYlu0NcY)
- [Notes on A Philosophy of Software Design.](https://lethain.com/notes-philosophy-software-design/)

