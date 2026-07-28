# Start with a minimal Alpine Linux base
FROM alpine:latest

# Install C/C++ (gcc, g++), Bash, and Go
RUN apk add --no-cache bash gcc g++ musl-dev go

# Install Rust via rustup (requires curl)
RUN apk add --no-cache curl && \
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Set the environment path for Rust
ENV PATH="/root/.cargo/bin:${PATH}"

# Define the default command
CMD ["/bin/bash"]
