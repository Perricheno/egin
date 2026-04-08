#!/bin/bash

echo "🚀 Начинаем установку полностью независимого Supabase для Agriplan..."

# 1. Создаем папку и качаем Supabase
mkdir -p /root/agriplan-supabase-stack
cd /root/agriplan-supabase-stack

if [ ! -d "supabase" ]; then
  git clone --depth 1 https://github.com/supabase/supabase .
else
  echo "✅ Репозиторий уже скачан, продолжаем..."
fi

cd docker

# 2. Настраиваем .env
cp .env.example .env

# Добавляем уникальное имя проекта Docker (чтобы контейнеры не слились со старым supabase)
echo "" >> .env
echo "COMPOSE_PROJECT_NAME=agriplan" >> .env

echo "🔧 Изменяем порты и прячем их на localhost (чтобы они не торчали наружу)..."
# Меняем стандартные порты в .env и вешаем на 127.0.0.1
sed -i 's/STUDIO_PORT=3000/STUDIO_PORT=3390/g' .env
sed -i 's/KONG_HTTP_PORT=8000/KONG_HTTP_PORT=8021/g' .env
sed -i 's/KONG_HTTPS_PORT=8443/KONG_HTTPS_PORT=8445/g' .env
sed -i 's/POSTGRES_PORT=5432/POSTGRES_PORT=5435/g' .env
sed -i 's/POOLER_PORT=6543/POOLER_PORT=6544/g' .env
sed -i 's|SUPABASE_PUBLIC_URL=http://localhost:8000|SUPABASE_PUBLIC_URL=http://agriplan-kong:8000|g' .env

echo "🔑 Изменяем пароли (Security)..."
sed -i 's/POSTGRES_PASSWORD=your-super-secret-and-long-postgres-password/POSTGRES_PASSWORD=agriplan-db-strong-pass-2026/g' .env

echo "🏷️ Защищаем имена контейнеров от конфликта (переименовываем supabase-* в agriplan-*)..."
# Чтобы 100% не было конфликтов с container_name в docker-compose
sed -i 's/container_name: supabase-/container_name: agriplan-/g' docker-compose.yml
# Ищем все внутренние ссылки:
sed -i 's/supabase-db/agriplan-db/g' docker-compose.yml
sed -i 's/supabase-gotrue/agriplan-gotrue/g' docker-compose.yml
sed -i 's/supabase-rest/agriplan-rest/g' docker-compose.yml
sed -i 's/supabase-realtime/agriplan-realtime/g' docker-compose.yml
sed -i 's/supabase-storage/agriplan-storage/g' docker-compose.yml
sed -i 's/supabase-kong/agriplan-kong/g' docker-compose.yml
sed -i 's/supabase-studio/agriplan-studio/g' docker-compose.yml
sed -i 's/supabase-pgbouncer/agriplan-pgbouncer/g' docker-compose.yml

# Конфиг kong.yml тоже ссылается на контейнеры по имени
sed -i 's/supabase-studio/agriplan-studio/g' volumes/api/kong.yml
sed -i 's/supabase-gotrue/agriplan-gotrue/g' volumes/api/kong.yml
sed -i 's/supabase-rest/agriplan-rest/g' volumes/api/kong.yml
sed -i 's/supabase-realtime/agriplan-realtime/g' volumes/api/kong.yml
sed -i 's/supabase-storage/agriplan-storage/g' volumes/api/kong.yml

echo "🚀 Запускаем!"
docker compose pull
docker compose up -d

echo ""
echo "========================================================="
echo "🎉 Готово! Новый инстанс Supabase полностью развернут."
echo "🔗 Studio UI (доступ только изнутри сервера): http://127.0.0.1:3390"
echo "☁️ Для Cloudflare Tunnel (если он в Docker в сети agriplan_default):"
echo "   - База: tcp://agriplan-db:5432"
echo "   - Studio: http://agriplan-studio:3000"
echo "   - API: http://agriplan-kong:8000"
echo ""
echo "Копируй это в свой GitHub Secrets/Env (подключение через Docker сеть напрямую):"
echo "DATABASE_URL: postgres://postgres:agriplan-db-strong-pass-2026@agriplan-db:5432/postgres"
echo "PROD_ENV_FILE:"
echo "DATABASE_URL=\"postgres://postgres:agriplan-db-strong-pass-2026@agriplan-db:5432/postgres\""
echo "DB_SSL=\"false\""
echo "========================================================="
