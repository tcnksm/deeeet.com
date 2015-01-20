require "minitest/autorun"

module Blog
  class Test < MiniTest::Test
    # Extract all posts from contents/[writing|talking]/*.md
    def posts
      root = File.expand_path("../../content/", __FILE__)
      Dir.glob(File.join(root,"*","*.md"))
    end    
  end
end
