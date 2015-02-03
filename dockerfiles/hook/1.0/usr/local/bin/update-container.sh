#!/bin/bash
# This script is used for rolling update docker container.
# Just run fleet stop & start one by one.
PORTS=( "8901" "8902" )
for p in "${PORTS[@]}"; do
    SERVICE="deeeet-com@${p}.service"
    echo "Restart ${SERVICE}"
    fleetctl stop ${SERVICE} 2>/dev/null
    fleetctl start ${SERVICE} 2>/dev/null

    # fleet doesn't wait but starts after `launched`
    # We need to wait for zero-downtime. 
    until [ "`fleetctl list-units 2>/dev/null | grep ${SERVICE} | cut -f 6`" = "running" ]; do
        echo "Wainting for starting ${SERVICE}...."
        sleep 5s
    done    
    echo "${SERVICE} is running"
    sleep 20s
done


