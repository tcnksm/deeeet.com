# coding: utf-8
require_relative "test_helper"

class CharacterTest < Blog::Test

  # Don't use '。' or '．'. 
  def test_conma_period
    posts.each do |post|
      content = File.read(post)
      content.split("\n").each_with_index do |line,index|
        refute line.match(/。|、/), "Use '．' or '，' at line #{index} in #{post} "
      end
    end
  end
end
