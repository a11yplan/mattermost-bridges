#!/bin/bash

# Test runner script for Mattermost Bridges
# Usage: ./run-tests.sh [base_url] [webhook_url] [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
BASE_URL="https://mattermost-bridges.accounts-411.workers.dev"
WEBHOOK_URL=""
VERBOSE=false
QUICK=false
TAIL_LOGS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -u|--url)
      BASE_URL="$2"
      shift 2
      ;;
    -w|--webhook)
      WEBHOOK_URL="$2"
      shift 2
      ;;
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    -q|--quick)
      QUICK=true
      shift
      ;;
    -l|--logs)
      TAIL_LOGS=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  -u, --url URL        Base URL of the bridge service"
      echo "  -w, --webhook URL    Mattermost webhook URL for integration tests"
      echo "  -v, --verbose        Enable verbose output"
      echo "  -q, --quick          Run only essential tests"
      echo "  -l, --logs          Tail wrangler logs during tests"
      echo "  -h, --help          Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                                    # Run basic tests"
      echo "  $0 -w https://mattermost.com/hook/id  # Run with webhook integration"
      echo "  $0 -v -l                             # Verbose mode with log tailing"
      exit 0
      ;;
    *)
      if [[ -z "$BASE_URL" && "$1" != -* ]]; then
        BASE_URL="$1"
      elif [[ -z "$WEBHOOK_URL" && "$1" != -* ]]; then
        WEBHOOK_URL="$1"
      fi
      shift
      ;;
  esac
done

# Check if deno is available
if ! command -v deno &> /dev/null; then
    echo -e "${RED}❌ Deno is not installed. Please install Deno first.${NC}"
    echo "   Visit: https://deno.com/install"
    exit 1
fi

# Check if wrangler is available for log tailing
if [[ "$TAIL_LOGS" == true ]] && ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}⚠️  Wrangler not found. Log tailing disabled.${NC}"
    TAIL_LOGS=false
fi

echo -e "${BLUE}🚀 Mattermost Bridges Test Suite${NC}"
echo -e "${BLUE}═══════════════════════════════════${NC}"
echo -e "📡 Base URL: ${BASE_URL}"
echo -e "🔗 Webhook URL: ${WEBHOOK_URL:-"Not configured"}"
echo -e "🔍 Verbose: ${VERBOSE}"
echo -e "⚡ Quick mode: ${QUICK}"
echo -e "📄 Log tailing: ${TAIL_LOGS}"
echo ""

# Start log tailing if requested
LOG_PID=""
if [[ "$TAIL_LOGS" == true ]]; then
    echo -e "${YELLOW}📄 Starting log tail...${NC}"
    wrangler tail --env="" &
    LOG_PID=$!
    sleep 2
fi

# Function to cleanup on exit
cleanup() {
    if [[ -n "$LOG_PID" ]]; then
        echo -e "\n${YELLOW}🛑 Stopping log tail...${NC}"
        kill $LOG_PID 2>/dev/null || true
    fi
}
trap cleanup EXIT

# Build test arguments
TEST_ARGS=""
if [[ "$VERBOSE" == true ]]; then
    TEST_ARGS="$TEST_ARGS --verbose"
fi

# Function to run a test script
run_test() {
    local script_name="$1"
    local description="$2"
    
    echo -e "\n${GREEN}🧪 Running $description${NC}"
    echo -e "${GREEN}─────────────────────────────────────${NC}"
    
    if [[ -f "test/$script_name" ]]; then
        if deno run --allow-net --allow-env "test/$script_name" "$BASE_URL" "$WEBHOOK_URL" $TEST_ARGS; then
            echo -e "${GREEN}✅ $description completed successfully${NC}"
        else
            echo -e "${RED}❌ $description failed${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Test script test/$script_name not found${NC}"
        return 1
    fi
}

# Run tests based on mode
if [[ "$QUICK" == true ]]; then
    echo -e "${YELLOW}⚡ Quick test mode - running essential tests only${NC}"
    
    # Run general tests (health check + basic functionality)
    run_test "general-test.ts" "General Bridge Tests"
    
else
    echo -e "${BLUE}🔬 Full test suite mode${NC}"
    
    # Run all test suites
    run_test "general-test.ts" "General Bridge Tests"
    run_test "discord-test.ts" "Discord Bridge Tests"
    run_test "vercel-test.ts" "Vercel Bridge Tests"
fi

echo -e "\n${GREEN}🎉 All tests completed!${NC}"

# Additional tips
echo -e "\n${BLUE}💡 Tips:${NC}"
echo -e "   • Use -w flag to test with real Mattermost webhook"
echo -e "   • Use -l flag to monitor logs during testing"
echo -e "   • Use -v flag for detailed output"
echo -e "   • Check Cloudflare dashboard for metrics and logs"

if [[ "$TAIL_LOGS" == true ]]; then
    echo -e "\n${YELLOW}📄 Log tail is still running. Press Ctrl+C to stop.${NC}"
    wait $LOG_PID
fi