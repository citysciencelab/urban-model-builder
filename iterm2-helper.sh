function ttab() {
  local cmd=""
  local cdto="$PWD"
  local args="$@"
  local title=""

  if [ -d "$1" ]; then
      cdto=`cd "$1"; pwd`
      args="${@:2}"
  fi

  if [[ "$args" == *" --title "* ]]; then
    title=$(echo "$args" | sed -n 's/.* --title \([^ ]*\).*/\1/p')
    args=$(echo "$args" | sed 's/ --title [^ ]*//')
  fi

  if [ -n "$args" ]; then
    cmd="; $args"
    osascript -i <<EOF
      tell application "iTerm2"
        tell current window
          create tab with default profile
          tell the current session
            write text "cd \"$cdto\"$cmd"
            if "$title" is not "" then
              set name to "$title"
            end if
          end tell
        end tell
      end tell
EOF
  else
    open -a iTerm $cdto
  fi
}

ttab "dsa && dcu --title Docker"
ttab "cd hcu-urban-model-builder-backend && npm run dev --title BackendServer"
ttab "cd hcu-urban-model-builder-backend --title BackendCLI"
ttab "cd hcu-urban-model-builder-client && ember s --title ClientServer"
ttab "cd hcu-urban-model-builder-client --title ClientCLI"
echo -e "\033];Docker CLI\007"