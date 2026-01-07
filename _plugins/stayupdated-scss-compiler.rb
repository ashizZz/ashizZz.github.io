# Jekyll plugin to ensure stayupdated.scss is compiled to CSS
# Note: Jekyll's built-in SCSS processing should handle this if the file has front matter
# This plugin is kept as a fallback/verification
require 'fileutils'

Jekyll::Hooks.register :site, :post_write do |site|
  scss_file = File.join(site.source, 'assets', 'css', 'stayupdated.scss')
  css_file = File.join(site.dest, 'assets', 'css', 'stayupdated.css')
  
  if File.exist?(scss_file)
    # Jekyll should have already processed the SCSS file if it has front matter
    # This is just a verification step
    if File.exist?(css_file)
      Jekyll.logger.info "Compiled:", "stayupdated.scss -> stayupdated.css (via Jekyll)"
    else
      Jekyll.logger.warn "Warning:", "stayupdated.css not found - Jekyll may not have processed stayupdated.scss"
    end
  end
end

