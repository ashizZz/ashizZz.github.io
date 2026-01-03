# Jekyll plugin to compile stayupdated.scss to CSS after site write
require 'fileutils'

Jekyll::Hooks.register :site, :post_write do |site|
  scss_file = File.join(site.source, 'assets', 'css', 'stayupdated.scss')
  css_file = File.join(site.dest, 'assets', 'css', 'stayupdated.css')
  
  if File.exist?(scss_file)
    begin
      # Use sass command line tool
      css_dir = File.dirname(css_file)
      FileUtils.mkdir_p(css_dir) unless File.directory?(css_dir)
      
      # Compile using sass command
      system("bundle exec sass \"#{scss_file}\" \"#{css_file}\" --style=compressed")
      
      if File.exist?(css_file)
        Jekyll.logger.info "Compiled:", "stayupdated.scss -> stayupdated.css"
      else
        Jekyll.logger.warn "Warning:", "Failed to compile stayupdated.scss"
      end
    rescue => e
      Jekyll.logger.error "Error:", "Failed to compile stayupdated.scss: #{e.message}"
    end
  end
end

