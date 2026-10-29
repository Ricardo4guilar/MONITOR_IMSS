# Despliegue en AWS

Guía para quien despliega. Crea un sitio privado en S3 servido por CloudFront (HTTPS) con acceso por Amazon Cognito.
**No hace falta tocar el código**: son una plantilla de CloudFormation (`infra/template.yaml`) y un script (`scripts/deploy.sh`).

## Qué necesitas

- Una cuenta de AWS y credenciales con permiso para CloudFormation, S3, CloudFront y Cognito (`aws configure` o `aws sso login`).
- CLI de AWS v2, Node.js 20 o superior y npm.
- Las 7 URLs de las hojas de Google («Archivo → Compartir → Publicar en la web», formato CSV). Te las pasa quien administra los datos.

## Despliegue (cuatro pasos)

```bash
# 1. Variables con las URLs de las hojas (ver web/.env.example para saber cuál es cuál)
export VITE_ENTIDADES_CSV_URL='...'
export VITE_METRICAS_CSV_URL='...'
export VITE_AVANCE_CSV_URL='...'
export VITE_SEPOCT_CSV_URL='...'
export VITE_NOVDIC_CSV_URL='...'
export VITE_HOSPITALES_CSV_URL='...'
export VITE_CONTACTOS_CSV_URL='...'

# 2. (opcional) otra región o nombre de pila; por defecto us-east-1 e imss-monitor
export AWS_REGION=us-east-1

# 3. Desplegar. Muestra la cuenta y pide confirmación; con -y no pregunta.
./scripts/deploy.sh

# 4. Crear el primer usuario (sección siguiente)
```

El script hace, en orden: crea o actualiza la infraestructura, construye la app con los datos de Cognito que salen de
la pila, sube el sitio a S3 y borra la caché de CloudFront. Es seguro repetirlo: cada ejecución es una actualización.
Al terminar imprime la dirección (`https://xxxx.cloudfront.net`).

> **No copies ningún archivo `.env.local`.** Es de desarrollo y puede traer una contraseña de prueba. El script no lo necesita.

## Primer usuario

Nadie puede registrarse solo: un administrador da de alta a cada persona. Cognito le envía por correo una contraseña
temporal; en su primer ingreso la app le pide cambiarla y, si el MFA está activo, configurar una app autenticadora
(Google Authenticator, Authy, 1Password…).

```bash
POOL=$(aws cloudformation describe-stacks --stack-name imss-monitor \
  --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolId'].OutputValue" --output text)

aws cognito-idp admin-create-user --user-pool-id "$POOL" \
  --username persona@imssbienestar.gob.mx \
  --user-attributes Name=email,Value=persona@imssbienestar.gob.mx Name=email_verified,Value=true \
  --desired-delivery-mediums EMAIL
```

Para dar de baja: `aws cognito-idp admin-disable-user --user-pool-id "$POOL" --username <correo>`.

## Si ya existe un grupo de usuarios de Cognito

Si el equipo ya tiene un pool, **no se crea otro**. Antes de desplegar:

1. En ese pool, crea un cliente de aplicación **sin secreto** (un cliente con secreto no sirve en un navegador),
   con «Authorization code grant», ámbitos `openid` y `email`, e identity provider Cognito.
2. Exporta:
   ```bash
   export POOL_EXISTENTE_ID=us-east-1_AbCdEf123
   export POOL_EXISTENTE_CLIENT_ID=<id del cliente>
   export POOL_EXISTENTE_DOMINIO=<prefijo>.auth.us-east-1.amazoncognito.com   # sin https://
   ```
3. Despliega. Al terminar, registra en ese cliente las dos URLs que imprime la pila (`UrlDeRetorno` y `UrlDeCierre`):
   ```bash
   aws cloudformation describe-stacks --stack-name imss-monitor --query "Stacks[0].Outputs"
   ```
   Deben coincidir exactamente, con `https`, sin barra final y sin mayúsculas distintas (si no, Cognito responde `redirect_mismatch`).

Si entran con la cuenta corporativa (SAML, Azure AD, Google), se configura en Cognito y la página de acceso lo ofrece sola; la app no cambia.

## Opciones

| Variable | Para qué |
|---|---|
| `PILA` | Nombre de la pila (por defecto `imss-monitor`). |
| `AWS_REGION` | Región (por defecto `us-east-1`). |
| `MFA_COGNITO` | `ON` (por defecto, obligatorio), `OPTIONAL` u `OFF`. Con `OPTIONAL` la página **no** invita a activarlo. |

Un dominio propio (por ejemplo `monitor.imssbienestar.gob.mx`) necesita un certificado de ACM en `us-east-1` y un
registro DNS. No está en la plantilla; se añade después sin tocar la app (hay que registrar el nuevo `…/auth/callback` en el cliente de Cognito).

## Qué crea (y qué no borra)

- Bucket S3 privado (cifrado, con versiones; solo CloudFront puede leerlo, solo por HTTPS).
- CloudFront con HTTPS, cabeceras de seguridad (HSTS, CSP, no-embed…) y recarga de rutas internas (`/mapa`, `/directorios`).
- Cognito: pool sin registro público, contraseña de 12+ caracteres, MFA por TOTP, dominio de acceso y su estilo.
- **Al borrar la pila se conservan** el bucket y el pool de usuarios (para no perder usuarios ni archivos por accidente);
  el pool además tiene protección contra borrado. Se eliminan a mano si de verdad se quieren quitar.

## Límites conocidos (decisiones pendientes)

- **El login protege la aplicación, no los datos.** Las hojas de Google están «publicadas en la web» y sus URLs viajan
  en el JavaScript de la app, que CloudFront entrega a cualquiera. Quien las conozca puede leerlas sin pasar por Cognito.
  Para cerrar eso hay que mover los datos detrás de un API que valide el token de Cognito (API Gateway + Lambda).
  Mientras tanto, la información del directorio (nombres, teléfonos y correos) es tan pública como hoy.
- La sesión dura 8 horas (lo que dura el ID token); después hay que volver a entrar.
- Correos de Cognito: con el remitente por defecto hay un tope de ~50 mensajes al día; basta para dar de alta a pocas personas.

## Problemas frecuentes

| Síntoma | Causa y arreglo |
|---|---|
| `redirect_mismatch` al iniciar sesión | La URL de retorno no está registrada tal cual en el cliente de Cognito (ver arriba). |
| Pantalla en blanco o «No se pudo cargar…» en los datos | Falta o está mal alguna `VITE_*_CSV_URL` al construir, o la hoja dejó de estar publicada. |
| El botón «Continuar» no hace nada | Faltan las variables de Cognito en el build. `deploy.sh` las toma de la pila; si se construye a mano hay que pasarlas. |
| Cambié algo y sigo viendo la versión vieja | La caché se invalida en cada `deploy.sh`; si se sube a mano: `aws cloudfront create-invalidation --distribution-id <id> --paths '/*'`. |
