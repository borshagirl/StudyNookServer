import dns from "dns";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import { betterAuth } from "better-auth";
import { toNodeHandler } from "better-auth/node";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

dns.setServers(["8.8.8.8", "1.1.1.1"]);
dotenv.config();

const app = express();

const port = process.env.PORT || 5000;

const allowedOrigins = [
    "http://localhost:3000",
    "https://study-nook-server-delta.vercel.app"
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
}));

app.use(express.json());
app.use(cookieParser());

const client = new MongoClient(process.env.MONGO_DB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db;
let roomsCollection;
let usersCollection;
let bookingsCollection;

async function run() {
    try {
        await client.connect();

        db = client.db("studyNookDB");

        roomsCollection = db.collection("rooms");
        usersCollection = db.collection("users");
        bookingsCollection = db.collection("bookings");

        const auth = betterAuth({
            database: mongodbAdapter(db),

            emailAndPassword: {
                enabled: true
            },

            trustedOrigins: allowedOrigins,

            socialProviders: {
                google: {
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET
                }
            },

            secret: process.env.BETTER_AUTH_SECRET,
            baseURL: process.env.BETTER_AUTH_URL,

            session: {
                expiresIn: 60 * 60 * 24 * 7
            },

            advanced: {
                useSecureCookies: false
            }
        });

        app.use("/api/auth", toNodeHandler(auth));


       app.get("/rooms/latest", async (req, res) => {
    try {
        console.log("Latest route hit");

        const result = await roomsCollection
            .find()
            .sort({ createdAt: -1 })
            .limit(6)
            .toArray();

        console.log(result);

        res.status(200).json(result);

    } catch (err) {
        console.log("ROOM ERROR:", err);

        res.status(500).json({
            error: err.message
        });
    }
});


        app.get("/rooms", async (req, res) => {
     try {
        const { search, amenity } = req.query;

        let query = {};

        if (search) {
            query.roomName = { $regex: search, $options: "i" };
        }

        if (amenity) {
            query.amenities = amenity;
        }

        const result = await roomsCollection.find(query).toArray();

        res.json(result);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
 });


        app.get("/rooms/:id", async (req, res) => {
            try {
                const result = await roomsCollection.findOne({
                    _id: new ObjectId(req.params.id)
                });

                res.json(result);
            } catch (err) {
                res.status(500).json({ message: "Invalid ID" });
            }
        });


                app.delete("/rooms/:id", async (req, res) => {
          try {
            const id = req.params.id;
        
            const result = await roomsCollection.deleteOne({
              _id: new ObjectId(id)
            });
        
            if (result.deletedCount === 0) {
              return res.status(404).json({ message: "Room not found" });
            }
        
            res.json({ message: "Deleted successfully" });
        
          } catch (err) {
            res.status(500).json({ message: "Server error" });
          }
        });



       app.post("/rooms", async (req, res) => {
           try {
               const result = await roomsCollection.insertOne(req.body);
               res.status(201).json(result);
           } catch (err) {
               res.status(500).json({ message: "Failed to create room" });
           }
       });


       app.get("/my-rooms/:userId", async (req, res) => {
         try {
           const userId = req.params.userId;
       
           const result = await roomsCollection
             .find({ ownerId: userId })
             .toArray();
       
           res.json(result);
         } catch (err) {
           res.status(500).json({ message: "Server error" });
         }
       });


       app.post("/bookings", async (req, res) => {
           try {
             const booking = {
               ...req.body,
               status: "confirmed"
             };
         
             const result = await bookingsCollection.insertOne(booking);
             res.json(result);
         
           } catch (err) {
             res.status(500).json({ message: "Booking failed" });
           }
         });


           app.get("/my-bookings/:userId", async (req, res) => {
           
               const userId = req.params.userId;
           
               const result = await bookingsCollection
                   .find({ userId })
                   .toArray();
           
            res.json(result || []);
           
           });


          app.patch("/bookings/:id/cancel", async (req, res) => {
            try {
              const id = req.params.id;
          
              const result = await bookingsCollection.updateOne(
                { _id: new ObjectId(id) },
                {
                  $set: { status: "cancelled" }
                }
              );
          
              if (result.modifiedCount === 0) {
                return res.status(404).json({ message: "Booking not found" });
              }
          
              res.json({ message: "Cancelled successfully" });
          
            } catch (err) {
              res.status(500).json({ message: "Server error" });
            }
          });


        app.get("/", (req, res) => {
            res.send("StudyNook Server is Running 🚀");
        });

        app.use((req, res) => {
            res.status(404).json({
                success: false,
                message: "Route not found"
            });
        });

        console.log("Mongo Connected + Server Ready");

    } catch (err) {
        console.log("SERVER ERROR:", err);
    }
}

run().catch(console.dir);

export default app;

if (process.env.NODE_ENV !== "production") {
    app.listen(port, () => {
        console.log(`Server running on ${port}`);
    });
}