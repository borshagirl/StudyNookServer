
const dns = require("dns")
dns.setServers(['8.8.8.8', '1.1.1.1'])

const express = require("express")
const dotenv = require("dotenv")
const cors = require("cors")
const cookieParser = require("cookie-parser");
const { betterAuth } = require("better-auth");
const { toNodeHandler } = require("better-auth/node");
const { mongodbAdapter } = require("better-auth/adapters/mongodb");
dotenv.config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const uri = process.env.MONGO_DB_URI;
const port = process.env.PORT || 5000

const app = express()

app.use(cors({
    origin:"http://localhost:3000",
    credentials:true
}));
app.use(express.json())
app.use(cookieParser());


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

    auth = betterAuth({
        database: mongodbAdapter(client.db("studyNookDB")),
        emailAndPassword: {
            enabled: true
        },
        trustedOrigins: [
            "http://localhost:3000"
        ],
        secret: process.env.BETTER_AUTH_SECRET,
        baseURL: process.env.BETTER_AUTH_URL,
        advanced: {
            useSecureCookies: false
        }
    });

    app.all("/api/auth/{*any}", toNodeHandler(auth));




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


    app.get("/rooms", async (req, res) => {

        const search = req.query.search || "";
        const amenity = req.query.amenity || "";

        let query = {};

        if (search) {
            query.roomName = {
                $regex: search,
                $options: "i"
            };
        }

        if (amenity) {
            query.amenities = {
                $in: [amenity]
            };
        }

        const result = await roomsCollection.find(query).toArray();
        res.send(result);
    });


    app.get("/rooms/:id", async(req,res)=>{
        const id = req.params.id;

        const result= await roomsCollection.findOne({_id:new ObjectId(id)});
        res.send(result);
    });






    app.post("/bookings", async (req, res) => {

    const bookingData = req.body;

    const existingBooking = await bookingsCollection.findOne({
            roomId: bookingData.roomId,
            date: bookingData.date,
            status: "confirmed",

            startHour: {
                $lt: bookingData.endHour
            },
            endHour: {
                $gt: bookingData.startHour
            }
        });

    if (existingBooking) {
        return res.status(400).send({
            message: "Time slot already booked"
        });
    }

    bookingData.status = "confirmed";
    bookingData.createdAt = new Date();

    const result = await bookingsCollection.insertOne(bookingData);

    await roomsCollection.updateOne(
        {_id: new ObjectId(bookingData.roomId)},
        {$inc: { bookingCount: 1 }});

    res.send(result);
    console.log(result)

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
