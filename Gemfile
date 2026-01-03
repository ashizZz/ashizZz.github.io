# frozen_string_literal: true

source "https://rubygems.org"

# This allows Jekyll to run
gem "jekyll", "~> 4.3"

# This provides the Chirpy theme and its dependencies (including Bootstrap)
gem "jekyll-theme-chirpy", "~> 7.1"

# The original tools you had
gem "html-proofer", "~> 5.0", group: :test

# Platform specific gems
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

gem "wdm", "~> 0.1.1", :platforms => [:mingw, :x64_mingw, :mswin]
