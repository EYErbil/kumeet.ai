#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting KuMeet system setup...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check for NVIDIA Docker support
if ! docker info | grep -i nvidia > /dev/null; then
    echo -e "${YELLOW}WARNING: NVIDIA Docker support not detected. GPU acceleration might not be available.${NC}"
    echo -e "${YELLOW}To enable GPU support, install the NVIDIA Container Toolkit:${NC}"
    echo -e "${YELLOW}https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html${NC}"
    echo -e "${YELLOW}Continuing with CPU-only mode...${NC}"
    sleep 3
fi

# Create directories for shared volume if they don't exist
echo -e "${YELLOW}Creating directories for shared volume...${NC}"
mkdir -p ./shared_data/uploads
mkdir -p ./shared_data/results

# Build the Docker images
echo -e "${YELLOW}Building Docker images...${NC}"
docker-compose build

# Start the services
echo -e "${YELLOW}Starting services...${NC}"
docker-compose up -d

# Wait for services to start
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Check if services are running
echo -e "${YELLOW}Checking services status...${NC}"
docker-compose ps

echo -e "${GREEN}KuMeet system is now running!${NC}"
echo -e "${GREEN}Access the frontend at: http://localhost:3000${NC}"
echo -e "${GREEN}Access the backend API at: http://localhost:8000${NC}"
echo -e "${YELLOW}To stop the system, run: docker-compose down${NC}" 