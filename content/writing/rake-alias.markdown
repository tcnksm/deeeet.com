---

title: 'Rakeのtask名にaliasを設定する'
date: 2014-03-05
comments: true
categories: ruby
---

[The alias of task name in rake](http://stackoverflow.com/questions/7656541/the-alias-of-task-name-in-rake)

シンプルなやり方．

```ruby
# Rakefile
namespace :db do
    task :table do
        puts "table"
    end
end
  
task :t => ["db:table"]
```

```bash
$ rake t
# -> "table"
```

複数のタスクを一気に登録したい場合は，以下のようなメソッドを準備する．

```ruby
# Rakefile
def alias_tasks tasks
    tasks.each do |new, old|
        task new, [*Rake.application[old].arg_names] => [old]
    end
end

namespace :db do
    task :table do
        puts "table"
    end
    
    task :schema do
        puts "schema"
    end
end

alias_tasks [
             [:dt, "db:table"],
             [:ds, "db:schema"]
             ]                                      
```

```
$ rake ds
# -> schema
```
