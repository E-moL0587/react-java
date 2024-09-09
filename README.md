## client
npx create-react-app client --template typescript

cd client
npm install axios

## server
https://start.spring.io
Maven/Java/3.3.3/com.example.server/Jar/17

## local
\react-java\client>
npm start

\react-java\server>
mvn clean package -DskipTests
java -jar target/server-0.0.1-SNAPSHOT.jar

## docker
docker build -t react-java .
docker run -p 8080:8080 react-java

## git push
git init
git add .
git commit -m "update"
git remote add origin https://github.com/E-moL0587/react-java.git
git push origin master
