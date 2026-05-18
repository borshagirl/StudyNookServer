
const dns = require("dns")
dns.setServers(['8.8.8.8', '1.1.1.1'])

const express = require("express")
const dotenv = require("dotenv")
const cors = require("cors")
dotenv.config()
const { MongoClient, ServerApiVersion } = require('mongodb');


const uri = process.env.MONGO_DB_URI;
const port = process.env.PORT || 5000

const app = express()

app.use(cors())
app.use(express.json())


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    // Database
    const db = client.db("studyNookDB");

    // Collections
    const usersCollection = db.collection("users");
    const roomsCollection = db.collection("rooms");
    const bookingsCollection = db.collection("bookings");


    app.get("/rooms/latest", async(req,res)=>{

        const roomsCollection = db.collection("rooms");
        const result = await roomsCollection.find().sort({createdAt:-1}).limit(6).toArray();

        res.send(result);

    });





    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);


 app.get("/", (req,res) => {
        res.send("StudyNook Server is Fine")

    })

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})
