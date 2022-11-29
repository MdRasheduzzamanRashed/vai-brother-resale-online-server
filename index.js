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
      return res.status(403).send({
        message: "forbidden access 403",
        token: { token },
        error: err,
      });
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
    const blogsCollection = client.db("vaiBrother").collection("blogs");
    const adsCollection = client.db("vaiBrother").collection("ads");

    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.status !== "Admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "24h",
        });
        return res.send({ accessToken: token });
      }
      res.status(401).send({ accessToken: "" });
    });

    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/blogs", async (req, res) => {
      const query = {};
      const blogs = await blogsCollection.find(query).toArray();
      res.send(blogs);
    });

    app.post("/blogs", verifyJWT, async (req, res) => {
      const blog = req.body;
      const result = await blogsCollection.insertOne(blog);
      res.send(result);
    });

    app.get("/ads", async (req, res) => {
      const query = {};
      const result = await adsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/ads", verifyJWT, async (req, res) => {
      let ad = req.body;
      ad.ads = true;
      const result = await adsCollection.insertOne(ad);
      res.send(result);
    });

    app.put("/adsItemSold/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const laptop = await laptopsCollection.findOne(filter);
      laptop.status = "Sold";
      laptop.ads = false;
      const result = await adsCollection.replaceOne(filter, laptop);
      res.send(result);
    });

    app.get("/laptops", async (req, res) => {
      const query = {};
      const users = await laptopsCollection.find(query).toArray();
      res.send(users);
    });
    app.get("/laptopsPage", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const query = {};
      const cursor = laptopsCollection.find(query);
      const laptops = await cursor
        .skip(page * size)
        .limit(size)
        .toArray();
      const count = await laptopsCollection.estimatedDocumentCount();
      res.send({ count, laptops });
    });

    app.post("/laptops", async (req, res) => {
      const laptop = req.body;
      const result = await laptopsCollection.insertOne(laptop);
      res.send(result);
    });

    app.get("/my-laptops", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.query.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const myLaptops = await laptopsCollection.find(query).toArray();
      res.send(myLaptops);
    });

    app.get("/brands", async (req, res) => {
      const query = {};
      const brands = await brandsCollection.find(query).toArray();
      res.send(brands);
    });

    app.post("/brands", verifyJWT, verifyAdmin, async (req, res) => {
      const brand = req.body;
      const result = await brandsCollection.insertOne(brand);
      res.send(result);
    });

    app.get("/laptops/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const laptopDetails = await laptopsCollection.findOne(query);
      res.send(laptopDetails);
    });

    app.get("/categories/:category", async (req, res) => {
      const str = req.params.category;
      const category = str.charAt(0).toUpperCase() + str.slice(1);
      const query = { category: category };
      const laptops = await laptopsCollection.find(query).toArray();
      res.send(laptops);
    });

    app.get("/brand", async (req, res) => {
      const brand = req.query.brand;
      const query = { brand: brand };
      const brandWise = await laptopsCollection.find(query).toArray();
      res.send(brandWise);
    });

    app.get("/users/member/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isMember: user?.status === "Member" });
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.status === "Admin" });
    });

    app.put("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };

      const updatedDoc = {
        $set: {
          status: "Admin",
        },
      };

      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.put("/laptops/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };

      const updatedDoc = {
        $set: {
          status: "Sold",
          ads: false,
        },
      };

      const result = await laptopsCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    app.put("/laptopsAds/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };

      const updatedDoc = {
        $set: {
          ads: true,
          status: "Available",
        },
      };

      const result = await laptopsCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.delete("/laptops/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await laptopsCollection.deleteOne(filter);
      res.send(result);
    });

    app.delete("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
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
