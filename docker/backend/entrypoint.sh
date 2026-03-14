#!/bin/sh
set -e

# Services are already checked via Docker healthchecks and depends_on conditions.
# The backend has its own retry logic for DB and Redis connections.

exec "$@"
