#!/bin/bash
set -e

mkdir -p /root/.ssh
chmod 700 /root/.ssh

echo "Checking SSH keys..."
ls -la /root/.ssh/

if [ ! -f /root/.ssh/known_hosts ] || [ $(wc -l < /root/.ssh/known_hosts) -eq 0 ]; then
    echo "Generating known_hosts file..."
    ssh-keyscan -t rsa,ed25519 login.kuacc.ku.edu.tr > /tmp/known_hosts
    cat /tmp/known_hosts > /root/.ssh/known_hosts 2>/dev/null || echo "Warning: Could not update known_hosts"
    rm -f /tmp/known_hosts
fi

echo "Testing SSH connection..."
ssh -v -o StrictHostKeyChecking=no eerbil20@login.kuacc.ku.edu.tr "echo SSH connection test" || echo "Warning: SSH connection test failed, but continuing anyway"

echo "SSH setup completed."

exec "$@"