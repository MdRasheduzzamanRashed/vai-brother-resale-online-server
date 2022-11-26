const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.2shkdfm.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const laptopsCollection = client.db("vaiBrother").collection("laptops");
    const brandsCollection = client.db("vaiBrother").collection("brands");
    const usersCollection = client.db("vaiBrother").collection("users");

    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    app.get("/check-user", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    app.post("/users", async (req, res) => {
      const laptop = req.body;
      const result = await usersCollection.insertOne(laptop);
      res.send(result);
    });

    app.get("/laptops", async (req, res) => {
      const query = {};
      const users = await laptopsCollection.find(query).toArray();
      res.send(users);
    });

    app.post("/laptops", async (req, res) => {
      const laptop = req.body;
      const result = await laptopsCollection.insertOne(laptop);
      res.send(result);
    });

    app.get("/my-laptops", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const myLaptops = await laptopsCollection.find(query).toArray();
      res.send(myLaptops);
    });

    app.get("/brands", async (req, res) => {
      const query = {};
      const brands = await brandsCollection.find(query).toArray();
      res.send(brands);
    });

    app.get("/laptops/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: ObjectId(id) };
      const laptopDetails = await laptopsCollection.findOne(query);
      res.send(laptopDetails);
    });

    app.get("/brand", async (req, res) => {
      const brand = req.query.brand;
      const query = { brand: brand };
      const brandWise = await laptopsCollection.find(query).toArray();
      res.send(brandWise);
    });
  } finally {
  }
}
run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("Vai Brother Resale Online server is running");
});

app.listen(port, () =>
  console.log(`Vai Brother Resale Online running on port: ${port}`)
);
