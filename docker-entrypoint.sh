#!/bin/sh
set -e

DOMAIN="hwcs.cipps.unam.mx"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"

if [ -f "$CERT_PATH" ]; then
    echo "[entrypoint] Certificado encontrado para $DOMAIN, sirviendo HTTPS."
    cp /etc/nginx/templates/nginx.ssl.conf /etc/nginx/conf.d/default.conf
else
    echo "[entrypoint] Sin certificado todavia para $DOMAIN, sirviendo solo HTTP."
    cp /etc/nginx/templates/nginx.http.conf /etc/nginx/conf.d/default.conf
fi

exec nginx -g "daemon off;"
