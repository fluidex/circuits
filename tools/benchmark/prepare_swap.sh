#!/bin/bash
set -uex

# sudo mkswap -f /dev/xvdb
# sudo swapon /dev/xvdb

# sudo fallocate -l 1200G /data/swapfile
# sudo chmod 600 /data/swapfile
# sudo mkswap /data/swapfile
# sudo swapon /data/swapfile

# TODO: maybe increase 122880 by 94G?

# https://stackoverflow.com/questions/38558989/node-js-heap-out-of-memory/59923848#59923848
sudo sh -c 'echo "vm.max_map_count=10000000" >>/etc/sysctl.conf'
sudo sh -c 'echo 10000000 > /proc/sys/vm/max_map_count'
# sudo sh -c 'echo "vm.max_map_count=655300" >>/etc/sysctl.conf'
# sudo sh -c 'echo 655300 > /proc/sys/vm/max_map_count'
