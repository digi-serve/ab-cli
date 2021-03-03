#!/bin/bash
Service=$1
if [ -z "$Service" ]
then
	# echo ""
	# echo " cli.sh [service]  "
	# echo "            --> provide the container ref to use"
	# echo "                [ mongo, controller, nginx, etc... ]"
	# echo ""
	Service="<%= stack %>_api_sails"
fi

ID_Service=`docker ps | grep $Service | awk '{ print $1 }'`
if [ -z "$ID_Service" ]
then
	echo ""
	echo "couldn't find process matching '$Service' "
	echo ""
	echo "current processes :"
	docker ps
	echo ""
else
	docker exec -it $ID_Service /bin/bash
fi
	
