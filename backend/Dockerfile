FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -q package -DskipTests && cp target/shopet-*.jar /app.jar

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 1001 shopet && mkdir -p /app/uploads && chown -R shopet /app
WORKDIR /app
COPY --from=build /app.jar app.jar
USER shopet
ENV UPLOAD_DIR=/app/uploads
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=40s --retries=5 \
  CMD curl -fs http://localhost:8080/actuator/health/readiness || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
