#!/usr/bin/env bash
# Drive a Unity project headlessly with verbs that fail loudly. Copy into the project
# (for example tools/unity/run.sh) and set the variables below, or export them.
#
#   run.sh import          resolve packages, then compile; fails on any `error CS`
#   run.sh test-editmode   EditMode tests for the assemblies in EDITMODE_ASSEMBLIES
#   run.sh test-playmode   PlayMode tests for PLAYMODE_ASSEMBLIES (no GPU, -nographics)
#   run.sh shot            PlayMode tests tagged [Category("Screenshot")], WITH a GPU,
#                          so a test can render a camera to a PNG under Logs/
#
# Each Unity launch redirects stdout/stderr to files and reads /dev/null: batchmode
# helpers inherit the caller's pipes and can keep a piped command open forever.
set -u
UNITY="${UNITY:?path to Unity.exe}"
PROJ="${PROJ:?path to the Unity project folder}"
EDITMODE_ASSEMBLIES="${EDITMODE_ASSEMBLIES:?semicolon list, e.g. MyGame.Tests}"
PLAYMODE_ASSEMBLIES="${PLAYMODE_ASSEMBLIES:-}"
PROJ_WIN=$(cygpath -w "$PROJ" 2>/dev/null || echo "$PROJ")
LOGS="$PROJ/Logs"; mkdir -p "$LOGS"

compile_errors() { grep -E "error CS[0-9]+" "$1" | sed 's/^.*Assets/Assets/' | sort -u | head -12; }

summarize_tests() {
  local xml="$1" line total passed failed result
  [ -f "$xml" ] || { echo "TEST FAIL: no results file at $xml"; return 1; }
  line=$(grep -oE '<test-run [^>]*>' "$xml" | head -1)
  total=$(echo "$line" | grep -oE 'total="[0-9]+"' | grep -oE '[0-9]+')
  passed=$(echo "$line" | grep -oE 'passed="[0-9]+"' | grep -oE '[0-9]+')
  failed=$(echo "$line" | grep -oE 'failed="[0-9]+"' | grep -oE '[0-9]+')
  result=$(echo "$line" | grep -oE 'result="[^"]+"' | grep -oE '"[^"]+"' | tr -d '"')
  echo "TESTS: result=$result total=$total passed=$passed failed=$failed"
  [ "${failed:-1}" = "0" ] && [ "$result" = "Passed" ] && return 0
  grep -oE '<test-case [^>]*result="Failed"[^>]*>' "$xml" | grep -oE 'fullname="[^"]+"' | head -10
  return 1
}

run_tests() { # platform assemblies [extra unity args...]
  local platform="$1" assemblies="$2"; shift 2
  # A results file left by an earlier run is reported as this run's outcome when
  # compilation fails and no test executes. Delete it first, then fail on `error CS`.
  rm -f "$LOGS/$platform.xml"
  "$UNITY" -batchmode "$@" -projectPath "$PROJ_WIN" -runTests -testPlatform "$platform" \
    -assemblyNames "$assemblies" -testResults "$PROJ_WIN\Logs\$platform.xml" \
    -logFile "$LOGS/$platform.log" >"$LOGS/$platform.stdout" 2>&1 </dev/null
  local errs; errs=$(compile_errors "$LOGS/$platform.log")
  [ -n "$errs" ] && { echo "$errs"; echo "TEST FAIL: compile errors, no tests ran"; return 1; }
  return 0
}

case "${1:-}" in
  import)
    "$UNITY" -batchmode -nographics -quit -projectPath "$PROJ_WIN" -logFile "$LOGS/import.log" >"$LOGS/import.stdout" 2>&1 </dev/null
    compile_errors "$LOGS/import.log"
    grep -q "error CS" "$LOGS/import.log" && { echo "IMPORT FAIL"; exit 1; } || echo "IMPORT OK" ;;
  test-editmode) run_tests EditMode "$EDITMODE_ASSEMBLIES" -nographics || exit 1; summarize_tests "$LOGS/EditMode.xml" ;;
  test-playmode) run_tests PlayMode "$PLAYMODE_ASSEMBLIES" -nographics || exit 1; summarize_tests "$LOGS/PlayMode.xml" ;;
  shot)
    rm -f "$LOGS"/shot_*.png
    run_tests PlayMode "$PLAYMODE_ASSEMBLIES" -testCategory Screenshot || exit 1
    ls "$LOGS"/shot_*.png 2>/dev/null || { summarize_tests "$LOGS/PlayMode.xml"; echo "SHOT FAIL: no images"; exit 1; } ;;
  *) sed -n '2,12p' "$0"; exit 2 ;;
esac
