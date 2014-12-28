# Use same cloud-config.yml which terraform
# uses for creating droplet on DigitalOcean. 
CLOUD_CONFIG_PATH = File.join(File.dirname(__FILE__), "terraform/cloud-config.yml")

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
    config.vm.provision :file, :source => "#{CLOUD_CONFIG_PATH}", :destination => "/tmp/vagrantfile-user-data"
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
    config.vm.provision :file, :source => "#{CLOUD_CONFIG_PATH}", :destination => "/tmp/vagrantfile-user-data"
    config.vm.provision :shell, :inline => "mv /tmp/vagrantfile-user-data /var/lib/coreos-vagrant/", :privileged => true
  end

  
end
