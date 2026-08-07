FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

COPY mvnw .
RUN chmod +x mvnw
COPY .mvn .mvn
COPY pom.xml .
# Maven Central downloads of larger jars (Hibernate/JPA) have been observed to
# truncate mid-transfer in some Docker Desktop network setups ("Premature end
# of Content-Length"). Disabling HTTP keep-alive forces a fresh connection per
# request instead of reusing one that a NAT/MTU hiccup already corrupted, and
# we still retry the whole resolution a few times on top of that.
RUN for i in 1 2 3 4 5; do \
      ./mvnw dependency:go-offline -B \
        -Dhttp.keepAlive=false \
        -Dmaven.wagon.http.pool=false \
        -Dmaven.wagon.http.retryHandler.count=5 \
        -Dmaven.wagon.httpconnectionManager.ttlSeconds=120 \
      && break; \
      echo "Attempt $i failed, retrying..."; sleep 5; \
    done

COPY src src
RUN ./mvnw package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
