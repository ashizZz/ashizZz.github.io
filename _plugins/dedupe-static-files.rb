# frozen_string_literal: true

# Jekyll can register the same static file twice (relative vs absolute path),
# which triggers a false "destination is shared by multiple files" warning.
# See: https://github.com/jekyll/jekyll/discussions/9479
Jekyll::Hooks.register :site, :post_read do |site|
  next if site.static_files.size < 2

  by_destination = {}

  site.static_files.each do |file|
    dest = file.destination(site.dest)
    existing = by_destination[dest]

    if existing.nil?
      by_destination[dest] = file
      next
    end

    by_destination[dest] = prefer_static_file(existing, file)
  end

  site.static_files.replace(by_destination.values)
end

def prefer_static_file(a, b)
  score = lambda do |file|
    path = file.relative_path.to_s.tr('\\', '/')
    s = 0
    s += 100 if path.match?(%r{\A[A-Za-z]:/}) # absolute Windows path
    s += path.length
    s
  end

  score.call(a) <= score.call(b) ? a : b
end
