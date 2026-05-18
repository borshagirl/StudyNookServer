
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

// 


 app.get("/", (req,res) => {
        res.send("StudyNook Server is Fine")

    })

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})
