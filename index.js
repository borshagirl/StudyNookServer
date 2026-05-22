
import dns from "dns";
import express from "express";
import dotenv from "dotenv";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config();
import cors from "cors";
import cookieParser from "cookie-parser";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import { betterAuth } from "better-auth";
import { toNodeHandler } from "better-auth/node";
import { mongodbAdapter } from "better-auth/adapters/mongodb";


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
    // await client.connect();

   let auth = betterAuth({
        database: mongodbAdapter(
            client.db("studyNookDB")
        ),

        emailAndPassword:{
            enabled:true
        },

        trustedOrigins:[
            process.env.NEXT_CLIENT_SIDE_URL
        ],

        socialProviders:{
            google:{
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET
            }
        },

        secret: process.env.BETTER_AUTH_SECRET,

        baseURL: process.env.BETTER_AUTH_URL,

        session: {
            expiresIn: 60 * 60 * 24 * 7
        },

        advanced:{
            useSecureCookies:false
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


    app.get("/my-rooms/:userId", async (req, res) => {
        try {
            const userId = req.params.userId;

            const rooms = await roomsCollection.find({
                ownerId: userId
            }).toArray();

            res.send(rooms);

        } catch (error) {
            res.status(500).send({ message: "Server error" });
        }
    });


  app.post("/rooms", async (req, res) => {

        const { roomName, description, image, floor, capacity, hourlyRate, amenities, ownerId } = req.body;

        if (!ownerId) {
            return res.status(400).send({
                message: "Owner ID missing"
            });
        }

        const room = { roomName, description, image, floor, capacity: Number(capacity), hourlyRate: Number(hourlyRate), amenities: amenities || [], ownerId, bookingCount: 0, createdAt: new Date()};

        const result = await roomsCollection.insertOne(room);

        res.send({
            message: "Room added successfully",
            result
        });
    });


    app.patch("/rooms/:id", async (req, res) => {
        try {
            const id = req.params.id;
            const updatedData = req.body;

            const result = await roomsCollection.updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: updatedData
                }
            );

            res.send(result);

        } catch (error) {
            res.status(500).send({ message: "Update failed" });
        }
    });


    app.delete("/rooms/:id", async (req, res) => {
        try {
            const id = req.params.id;
        
            const result = await roomsCollection.deleteOne({
                _id: new ObjectId(id)
            });
            
            res.send(result);
        
        } catch (error) {
            res.status(500).send({ message: "Delete failed" });
        }
    });







    app.post("/bookings", async (req, res) => {

    const { roomId, roomName, image, date, startHour, endHour, specialNote, userId} = req.body;

    const existingBooking = await bookingsCollection.findOne({
        roomId,
        date,
        status:"confirmed",

        startHour:{
            $lt:Number(endHour)
        },
        endHour:{
            $gt:Number(startHour)
        }
    });

    if(existingBooking){
        return res.status(400).send({
            message:"Time slot already booked"
        });
    }
    const bookingData={ roomId, roomName, image, date, startHour:Number(startHour), endHour:Number(endHour), specialNote, userId, status:"confirmed", createdAt:new Date()}

    const result=await bookingsCollection.insertOne(bookingData);

    await roomsCollection.updateOne(
        {
            _id:new ObjectId(roomId)
        },
        {
            $inc:{
                bookingCount:1
            }
        }

    );

    res.send(result);
});


app.get("/my-bookings/:userId", async(req,res)=>{

    const userId=req.params.userId;

    const result=await bookingsCollection.find({

        userId

    }).toArray();

    res.send(result);

});


  app.patch("/bookings/:id/cancel", async (req, res) => {

  const id = req.params.id;

  const result = await bookingsCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: { status: "cancelled" }
    }
  );

  res.send(result);
});




    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);


 app.get("/", (req,res) => {
        res.send("StudyNook Server is Fine")

    })



// if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Server running on ${port}`);
  });


// module.exports = app;
