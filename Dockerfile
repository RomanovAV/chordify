FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-jammy

WORKDIR /app
RUN useradd --system --create-home --home-dir /app appuser
COPY --from=build /workspace/target/chordstorer-0.0.1-SNAPSHOT.jar /app/chordstorer.jar
RUN mkdir -p /app/data && chown -R appuser:appuser /app

USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/chordstorer.jar"]
