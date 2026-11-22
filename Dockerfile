FROM eclipse-temurin:17-jdk

WORKDIR /app

COPY src/ ./src/

RUN javac -d out src/Main.java

EXPOSE 8080

CMD ["java", "-cp", "out", "Main"]