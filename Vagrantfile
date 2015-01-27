require "yaml"

# Replace discovery url with new one
def set_new_discovery(path, discovery)
  cloud_config = YAML.load_file(path)
  cloud_config["coreos"]["etcd"]["discovery"] = discovery
  
  # Write to temp file
  tmp_path = File.join("/tmp",File.basename(path)) 
  File.open(tmp_path,"w") do |f|
    f.puts "#cloud-config"
    f.puts cloud_config.to_yaml.gsub(/^---\n/,"")
  end
  return tmp_path
end

# Use same cloud-config.yml which terraform uses for creating droplet on DigitalOcean.
cloud_config_lb_path = File.join(File.dirname(__FILE__), "cloud-configs/lb.yml")
cloud_config_web_path = File.join(File.dirname(__FILE__), "cloud-configs/web.yml")

# Generate new discovery url
discovery=`curl -w "\n" https://discovery.etcd.io/new 2>/dev/null`.strip()
cloud_config_lb_path= set_new_discovery(cloud_config_lb_path,discovery)
cloud_config_web_path= set_new_discovery(cloud_config_web_path,discovery)

# Vagrant settings
Vagrant.configure("2") do |config|
  # always use Vagrants insecure key
  # To use fleet from local environment, exec ssh-add ~/.vagrant.d/insecure_private_key
  config.ssh.insert_key = false

  # Setup box URL to use
  config.vm.box = "coreos-alpha"
  config.vm.box_version = ">= 308.0.1"
  config.vm.box_url = "http://alpha.release.core-os.net/amd64-usr/current/coreos_production_vagrant.json"

  config.vm.provider :virtualbox do |v|
    # On VirtualBox, we don't have guest additions or a functional vboxsf
    # in CoreOS, so tell Vagrant that so it can be smarter.
    v.check_guest_additions = false
    v.functional_vboxsf     = false
  end

  config.vm.define vm_name = "deeeet-com-lb1" do |config|
    config.vm.hostname = vm_name

    # Change Memory and CPU
    # It should be same as DigitalOcean droplet
    config.vm.provider :virtualbox do |vb|
      vb.gui = false
      vb.memory = 512
      vb.cpus = 1
    end

    config.vm.network :private_network, ip: "172.20.20.101"

    # Place cloud-config on CoreOS
    config.vm.provision :file, :source => "#{cloud_config_lb_path}", :destination => "/tmp/vagrantfile-user-data"
    config.vm.provision :shell, :inline => "mv /tmp/vagrantfile-user-data /var/lib/coreos-vagrant/", :privileged => true
  end

  config.vm.define vm_name = "deeeet-com-web1" do |config|
    config.vm.hostname = vm_name

    # Change Memory and CPU
    # It should be same as DigitalOcean droplet
    config.vm.provider :virtualbox do |vb|
      vb.gui = false
      vb.memory = 512
      vb.cpus = 1
    end

    config.vm.network :private_network, ip: "172.20.20.102"

    # Place cloud-config on CoreOS
    config.vm.provision :file, :source => "#{cloud_config_web_path}", :destination => "/tmp/vagrantfile-user-data"
    config.vm.provision :shell, :inline => "mv /tmp/vagrantfile-user-data /var/lib/coreos-vagrant/", :privileged => true
  end  
end
