const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const serviceAccount = require("./smart-deals-firebase-adminsdk.json");

initializeApp({
  credential: cert(serviceAccount),
});


// middleware
app.use(cors());
app.use(express.json());

const logger = (req, res, next) => {
  console.log("logger info")
  next()
}

const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({
      message: "Unauthorized access",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await getAuth().verifyIdToken(token);

    req.token_email = decoded.email;
    req.decoded = decoded;

    next();
  } catch (err) {
    console.error(err);

    return res.status(401).send({
      message: "Unauthorized access",
    });
  }
};
const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-9t5qh4y-shard-00-00.yvhjyyn.mongodb.net:27017,ac-9t5qh4y-shard-00-01.yvhjyyn.mongodb.net:27017,ac-9t5qh4y-shard-00-02.yvhjyyn.mongodb.net:27017/?ssl=true&replicaSet=atlas-8ao4ay-shard-0&authSource=admin&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Get method
app.get("/", (req, res) => {
  res.send("smart server is running");
});

async function run() {
  try {
    await client.connect();

    const db = client.db("smartdb");
    const productCollection = db.collection("products");
    const bidsCollection = db.collection("bids");
    const userCollection = db.collection("user");

    app.post("/users", async (req, res) => {
      const newUsers = req.body;
      const email = req.body.email;
      const query = { email: email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        res.send({ message: "user already existed" });
      } else {
        const result = await userCollection.insertOne(newUsers);

        res.send(result);
      }
    });

    app.get("/users", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/latest-products", async (req, res) => {
      const cursor = productCollection.find().sort({ created_at: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get method
    app.get("/products/home", async (req, res) => {
      try {
        const products = await productCollection
          .aggregate([
            {
              $sample: {
                size: 6,
              },
            },
          ])
          .toArray();

        res.send(products);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch products" });
      }
    });

    // Get all products with pagination
    app.get("/products", async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9;

        const skip = (page - 1) * limit;

        const products = await productCollection
          .find()
          .skip(skip)
          .limit(limit)
          .toArray();

        const totalProducts = await productCollection.countDocuments();

        res.send({
          products,
          totalProducts,
          totalPages: Math.ceil(totalProducts / limit),
          currentPage: page,
        });
      } catch (error) {
        res.status(500).send({
          message: "Failed to fetch products",
          error: error.message,
        });
      }
    });

    // Single Get method
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    // Post method
    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.send(result);
    });

    // Delete method
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    // Patch method
    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updatedProducts = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          name: updatedProducts.name,
          price: updatedProducts.price,
        },
      };
      const result = await productCollection.updateOne(query, update);
      res.send(result);
    });

    // Bids related api
    app.get("/bids", logger, verifyFirebaseToken, async (req, res) => {
      // console.log('header', req)
      const email = req.query.email;
      const query = {};
      if (email) {
        if(email !==req.token_email){
          return res.status(403).send({message: 'forbidden access'})
        }
        query.buyer_email = email;
      }
      const cursor = bidsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.delete("/bids/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bidsCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/products/bids/:productId", verifyFirebaseToken, async (req, res) => {
      const productId = req.params.productId;

      const query = {
        product: productId,
      };

      const result = await bidsCollection
        .find(query)
        .sort({ bid_price: -1 })
        .toArray();

      res.send(result);
    });

    app.post("/bids", async (req, res) => {
      const newBid = req.body;
      const result = await bidsCollection.insertOne(newBid);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`smart server running on port ${port}`);
});
