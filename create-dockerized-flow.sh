#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Fast VS Code Docker Setup Generator${NC}"
echo "================================================"

# Default values
PASSWORD=${PASSWORD:-"changeme"}
PORT=${PORT:-"8080"}
IMAGE_NAME="vscode-fast"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --password)
            PASSWORD="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --alpine)
            USE_ALPINE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --password PASSWORD  Set VS Code password (default: changeme)"
            echo "  --port PORT         Set port (default: 8080)"
            echo "  --alpine           Use ultra-fast Alpine version"
            echo "  --help             Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

echo -e "${YELLOW}📝 Generating Docker files...${NC}"

# Generate optimized Dockerfile (default)
cat > Dockerfile << 'EOF'
# Use code-server's official image for fastest boot
FROM codercom/code-server:latest

# Switch to root for installation
USER root

# Install essential tools in a single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    wget \
    sudo \
    python3 \
    python3-pip \
    nodejs \
    openssl \
    npm \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Pre-configure code-server settings
RUN mkdir -p /home/coder/.config/code-server
COPY config.yaml /home/coder/.config/code-server/config.yaml

# Create workspace and set permissions
RUN mkdir -p /home/coder/workspace && \
    chown -R coder:coder /home/coder/.config /home/coder/workspace

RUN mkdir -p /usr/local/lib/node_modules/ && \
    chown -R root:coder /usr/local/lib/node_modules/ && \
    chmod -R 775 /usr/local/lib/node_modules/

# Install claude code
RUN npm install -g @anthropic-ai/claude-code

# Switch back to coder user
USER coder
WORKDIR /home/coder/workspace

# Install claude flow and bypass the nonempty folder error (due to sqlite3 installation)
RUN npx -y -g claude-flow@latest --version || true
RUN npx -y claude-flow@latest init --sparc || true

# Expose port
EXPOSE 8080

# Optimized startup
ENTRYPOINT ["dumb-init", "--"]
CMD ["code-server", "--bind-addr", "0.0.0.0:8080", "."]
EOF

# Generate Alpine Dockerfile if requested
if [[ "$USE_ALPINE" == "true" ]]; then
    echo -e "${YELLOW}🏔️  Using ultra-fast Alpine version...${NC}"
    IMAGE_NAME="vscode-alpine"
    
cat > Dockerfile << 'EOF'
# Ultra-lightweight Alpine-based image
FROM alpine:3.18

# Install dependencies in single layer
RUN apk add --no-cache \
    nodejs \
    npm \
    curl \
    bash \
    git \
    sudo \
    shadow \
    python3 \
    py3-pip \
    && npm install -g code-server@latest \
    && adduser -D -s /bin/bash coder \
    && echo "coder ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Switch to coder user and setup in one go
USER coder
WORKDIR /home/coder

# Create config and workspace in single layer
RUN mkdir -p .config/code-server workspace

# Copy config
COPY config.yaml .config/code-server/config.yaml

# Expose port
EXPOSE 8080

# Direct startup
CMD ["code-server", "--bind-addr", "0.0.0.0:8080", "workspace"]
EOF
fi

# Generate config.yaml
cat > config.yaml << EOF
bind-addr: 0.0.0.0:8080
auth: password
password: ${PASSWORD}
cert: false
disable-telemetry: true
disable-update-check: true
EOF

# Generate docker-compose.yml
cat > docker-compose.yml << EOF
version: '3.8'

services:
  vscode:
    build: .
    container_name: ${IMAGE_NAME}
    ports:
      - "${PORT}:8080"
    volumes:
      - .:/home/coder/workspace:cached
      - vscode_data:/home/coder/.local
      - vscode_extensions:/home/coder/.local/share/code-server
    environment:
      - PASSWORD=${PASSWORD}
    restart: unless-stopped
    networks:
      - vscode_network

volumes:
  vscode_data:
  vscode_extensions:

networks:
  vscode_network:
    driver: bridge
EOF

# Generate .dockerignore
cat > .dockerignore << 'EOF'
node_modules
.git
.gitignore
README.md
Dockerfile
.dockerignore
.env
.vscode
*.log
EOF

# Generate start script
cat > start.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting VS Code Server..."

# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1

# Build and start
docker-compose up --build -d
echo ""
echo ""
echo "✅ VS Code Server is starting up..."
echo "🌐 Access at: http://localhost:8080"
echo "🔑 Password: changeme"
echo ""
echo "📊 Container status:"
docker-compose ps

echo ""
echo "📝 Useful commands:"
echo "  Stop:    docker-compose down"
echo "  Logs:    docker-compose logs -f"
echo "  Restart: docker-compose restart"
echo ""
echo "💡 Once in, remember to run \`claude --dangerously-skip-permissions\` followed by \`npx -y claude-flow@latest sparc \"build and test my project\"\`"
EOF

# Generate stop script
cat > stop.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping VS Code Server..."
docker-compose down
echo "✅ Stopped"
EOF

# Generate quick build script
cat > quick-build.sh << 'EOF'
#!/bin/bash
set -e

export DOCKER_BUILDKIT=1
echo "⚡ Quick building VS Code image..."

# Build with cache
docker build \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --cache-from vscode-fast:latest \
  -t vscode-fast \
  .

echo "✅ Build complete!"
echo "🚀 Run with: docker run -d -p 8080:8080 -v \$(pwd):/home/coder/workspace vscode-fast"
EOF

# Make scripts executable
chmod +x start.sh stop.sh quick-build.sh

echo -e "${GREEN}✅ Files generated successfully!${NC}"
echo ""
echo -e "${BLUE}📁 Generated files:${NC}"
echo "  - Dockerfile ($(if [[ "$USE_ALPINE" == "true" ]]; then echo "Alpine"; else echo "Official"; fi) base)"
echo "  - config.yaml"
echo "  - docker-compose.yml"
echo "  - .dockerignore"
echo "  - start.sh"
echo "  - stop.sh"
echo "  - quick-build.sh"
echo ""
echo -e "${YELLOW}🚀 Quick Start:${NC}"
echo "  ./start.sh"
echo ""
echo -e "${YELLOW}⚡ Alternative (direct Docker):${NC}"
echo "  ./quick-build.sh"
echo "  docker run -d -p ${PORT}:8080 -v \$(pwd):/home/coder/workspace ${IMAGE_NAME}"
echo ""
echo -e "${BLUE}🌐 Access VS Code at:${NC} http://localhost:${PORT}"
echo -e "${BLUE}🔑 Password:${NC} ${PASSWORD}"
echo ""
echo -e "${GREEN}💡 Tips:${NC}"
echo "  - Change password: export PASSWORD=mypass && ./start.sh"
echo "  - Change port: export PORT=3000 && ./start.sh"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop server: ./stop.sh"

if [[ "$USE_ALPINE" == "true" ]]; then
    echo ""
    echo -e "${YELLOW}⚠️  Alpine Notice:${NC}"
    echo "  Using ultra-fast Alpine version (~300MB, 2-3s boot)"
    echo "  Some VS Code extensions may have compatibility issues"
fi

echo ""
echo -e "${GREEN}🎉 Ready to start coding!${NC}"
