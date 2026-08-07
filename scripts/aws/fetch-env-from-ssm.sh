#!/usr/bin/env bash
# Run this on the EC2 instance (repo root) before `docker compose -f docker-compose.aws.yml up`.
# Pulls every secret this app needs out of SSM Parameter Store (see AWS_DEPLOYMENT.md step 6)
# and writes them into a local .env — so no secret is ever hand-typed onto the instance or
# committed to the repo. Requires the instance role to have the ssm:GetParameter* permissions
# from AWS_DEPLOYMENT.md step 2; the AWS CLI already picks those up automatically via the
# instance metadata service, no credentials needed on the box itself.
set -euo pipefail

REGION="${AWS_DEFAULT_REGION:-ap-south-1}"
PREFIX="/hexamed"

get() {
  aws ssm get-parameter --name "$PREFIX/$1" --with-decryption --region "$REGION" \
    --query 'Parameter.Value' --output text
}

cat > .env <<EOF
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(get postgres-password)
POSTGRES_DB=hexamed_db

JWT_SECRET=$(get jwt-secret)

GEMINI_API_KEY=$(get gemini-api-key)
NVIDIA_NIM_API_KEY=$(get nvidia-nim-api-key)
CUSTOM_LLM_BASE_URL=$(get custom-llm-base-url)
TAVILY_API_KEY=$(get tavily-api-key)

S3_ENDPOINT=https://s3.$REGION.amazonaws.com
S3_ACCESS_KEY=$(get s3-access-key)
S3_SECRET_KEY=$(get s3-secret-key)
S3_DOCUMENTS_BUCKET=$(get s3-documents-bucket)

CORS_EXTRA_ORIGIN=$(get cors-extra-origin)

AWS_DEFAULT_REGION=$REGION
EOF

chmod 600 .env
echo ".env written from SSM Parameter Store ($PREFIX/*, region $REGION)."
