#!/usr/bin/env bash
# Despliega el Monitor IMSS Bienestar: crea/actualiza la infraestructura, construye la app y la publica.
# Uso:   export VITE_..._CSV_URL=...   (ver DEPLOY.md)   y luego   ./scripts/deploy.sh [-y]
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PILA="${PILA:-imss-monitor}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
SIN_PREGUNTAR=0
[[ "${1:-}" == "-y" ]] && SIN_PREGUNTAR=1

fallar() { echo "ERROR: $*" >&2; exit 1; }

command -v aws  >/dev/null || fallar "falta la CLI de AWS (https://aws.amazon.com/cli/)"
command -v node >/dev/null || fallar "falta Node.js 20 o superior"
command -v npm  >/dev/null || fallar "falta npm"

# Las hojas de datos son obligatorias: sin ellas el Directorio no tiene datos de respaldo (los CSV con
# datos personales no se versionan).
FALTAN=()
for variable in VITE_ENTIDADES_CSV_URL VITE_METRICAS_CSV_URL VITE_AVANCE_CSV_URL VITE_SEPOCT_CSV_URL \
                VITE_NOVDIC_CSV_URL VITE_HOSPITALES_CSV_URL VITE_CONTACTOS_CSV_URL; do
  [[ -n "${!variable:-}" ]] || FALTAN+=("$variable")
done
((${#FALTAN[@]} == 0)) || fallar "faltan variables de entorno: ${FALTAN[*]}"

CUENTA="$(aws sts get-caller-identity --query Account --output text --region "$REGION")" \
  || fallar "no hay credenciales de AWS válidas (aws configure / aws sso login)"

echo "Cuenta: $CUENTA   Región: $REGION   Pila: $PILA"
if ((SIN_PREGUNTAR == 0)); then
  read -r -p "¿Desplegar aquí? [s/N] " respuesta
  [[ "$respuesta" =~ ^[sS]$ ]] || fallar "cancelado"
fi

PARAMETROS=()
[[ -n "${POOL_EXISTENTE_ID:-}" ]]        && PARAMETROS+=("PoolExistenteId=$POOL_EXISTENTE_ID")
[[ -n "${POOL_EXISTENTE_CLIENT_ID:-}" ]] && PARAMETROS+=("PoolExistenteClientId=$POOL_EXISTENTE_CLIENT_ID")
[[ -n "${POOL_EXISTENTE_DOMINIO:-}" ]]   && PARAMETROS+=("PoolExistenteDominio=$POOL_EXISTENTE_DOMINIO")
[[ -n "${MFA_COGNITO:-}" ]]              && PARAMETROS+=("MfaCognito=$MFA_COGNITO")

echo "==> 1/4 Infraestructura (CloudFormation)"
aws cloudformation deploy \
  --region "$REGION" --stack-name "$PILA" \
  --template-file "$RAIZ/infra/template.yaml" \
  --no-fail-on-empty-changeset \
  ${PARAMETROS[@]+--parameter-overrides "${PARAMETROS[@]}"}

salida() {
  aws cloudformation describe-stacks --region "$REGION" --stack-name "$PILA" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue | [0]" --output text
}
URL_APP="$(salida UrlApp)"
BUCKET="$(salida Bucket)"
DISTRIBUCION="$(salida DistribucionId)"

echo "==> 2/4 Construyendo la app"
cd "$RAIZ/web"
npm ci --no-audit --no-fund
# Estas variables salen de la pila: son identificadores públicos de Cognito, no secretos.
VITE_COGNITO_DOMINIO="$(salida CognitoDominio)" \
VITE_COGNITO_CLIENT_ID="$(salida CognitoClientId)" \
VITE_COGNITO_USER_POOL_ID="$(salida CognitoUserPoolId)" \
  npm run build

echo "==> 3/4 Publicando en s3://$BUCKET"
# Lo que lleva hash en el nombre no cambia nunca: se puede cachear un año. Lo demás (index.html, tema-inicial.js,
# datos de respaldo) se revalida siempre, para que un despliegue nuevo se vea de inmediato.
aws s3 sync dist/assets "s3://$BUCKET/assets" --region "$REGION" --delete \
  --cache-control "public,max-age=31536000,immutable"
aws s3 sync dist "s3://$BUCKET" --region "$REGION" --delete --exclude "assets/*" \
  --cache-control "no-cache"

echo "==> 4/4 Invalidando la caché de CloudFront"
aws cloudfront create-invalidation --distribution-id "$DISTRIBUCION" --paths "/*" --query "Invalidation.Id" --output text

echo
echo "Listo: $URL_APP"
echo "Si es la primera vez, falta crear el primer usuario: ver DEPLOY.md, sección «Primer usuario»."
