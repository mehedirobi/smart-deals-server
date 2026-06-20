const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const uri =
  "mongodb://smartdbUser:JTBGv6732CsJp71n@ac-9t5qh4y-shard-00-00.yvhjyyn.mongodb.net:27017,ac-9t5qh4y-shard-00-01.yvhjyyn.mongodb.net:27017,ac-9t5qh4y-shard-00-02.yvhjyyn.mongodb.net:27017/?ssl=true&replicaSet=atlas-8ao4ay-shard-0&authSource=admin&appName=Cluster0";

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

    app.post('/users', async(req, res) => {
      const newUsers = req.body;
      const email = req.body.email;
      const query = {email: email}
      const existingUser = await userCollection.findOne(query)
      if(existingUser){
        res.send({message:"user already existed"})
      }
      else{
        const result = await userCollection.insertOne(newUsers)

      res.send(result)
      }
      

    })

    app.get('/users', async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    
    
    app.get("/latest-products", async (req, res) => {
      const cursor = productCollection.find().sort({created_at: -1}).limit(6);
      const result = await cursor.toArray()
      res.send(result)
    })

    // Get method
    app.get("/products", async (req, res) => {
      const cursor = productCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    // Single Get method
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await productCollection.findOne(query);
      res.send(result);
    })


    // Post method
    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.send(result);
    });

    // Delete method
    app.delete("/products/:id", async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await productCollection.deleteOne(query);
      res.send(result);
    })

    // Patch method
    app.patch("/products/:id", async(req ,res) => {
      const id = req.params.id;
      const updatedProducts = req.body;
      const query = {_id: new ObjectId(id)}
      const update = {
        $set: {
          name: updatedProducts.name,
          price: updatedProducts.price
        }
      }
      const result = await productCollection.updateOne(query, update)
      res.send(result)
    })

    // Bids related api
    app.get("/bids", async (req, res) => {
      const email = req.query.email;
      const query = {};
      if(email){
        query.buyer_email = email
      }
      const cursor = bidsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('product/bids/:productId', async (req, res) => {
      const productId = req.params.productId;
      const query = {product: productId}
      const cursor = bidsCollection.find(query).sort({bid_price: -1})
      const result = await cursor.toArray()
      res.send(result)
    })


    app.post("/bids", async (req, res) => {
      const newBid = req.body;
      const result = await bidsCollection.insertOne(newBid);
      res.send(result)
    })



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
