FROM maven:3.8.4-openjdk-17 AS server-build
WORKDIR /server
COPY server/pom.xml .
RUN mvn dependency:go-offline
COPY server/ ./
RUN mvn clean package -DskipTests

FROM node:18-alpine AS client-build
WORKDIR /client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

FROM openjdk:17-jdk-slim AS runtime
WORKDIR /app

COPY --from=server-build /server/target/*.jar ./server.jar

COPY --from=client-build /client/build ./client/build

EXPOSE 8080

CMD ["java", "-jar", "server.jar"]
