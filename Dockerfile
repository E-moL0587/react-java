# 1. Client Build Stage
FROM node:18-alpine AS client-build

# 作業ディレクトリの設定
WORKDIR /app/client

# package.jsonとpackage-lock.jsonをコピーして依存関係をインストール
COPY client/package*.json ./
RUN npm install

# Reactのプロジェクトをビルド
COPY client/. ./
RUN npm run build

# 2. Server Build Stage
FROM maven:3.8.4-openjdk-17 AS server-build

# 作業ディレクトリの設定
WORKDIR /app/server

# Mavenの依存関係を解決するためにpom.xmlをコピー
COPY server/pom.xml ./
RUN mvn dependency:go-offline

# アプリケーションソースコードをコピーしてビルド
COPY server/. ./
RUN mvn clean package -DskipTests

# 3. Runtime Stage
FROM openjdk:17-jdk-slim AS runtime

# 作業ディレクトリの設定
WORKDIR /app

# サーバーのjarファイルをコピー
COPY --from=server-build /app/server/target/*.jar ./server.jar

# クライアントのビルド成果物をコピー
COPY --from=client-build /app/client/build ./client/build

# アプリケーションの起動
ENTRYPOINT ["java", "-jar", "./server.jar"]

# サーバーが利用するポートの設定
EXPOSE 8080
