const cors = require("cors")
const express = require("express")
const jwt = require("jsonwebtoken")
const { MongoClient } = require("mongodb")
const cookieParser = require("cookie-parser")
require("dotenv").config()

const app = express()
const port = 3000
const dbURI = process.env.DB_URI
const dbName = process.env.DB_NAME
const dbClient = new MongoClient(dbURI)
const apiRoutes = require("./routes")

async function getDatabaseConnection() {
   try {
      await dbClient.connect()
      return dbClient.db(dbName)
   } catch (err) {
      throw new Error("An error occurred while connecting to the database: " + err)
   }
}

app.use(cors())
app.use(express.json())
app.use(cookieParser())

async function startServer() {
   try {
      const db = await getDatabaseConnection()
      
      console.log("Database connected")
      app.use("/api", apiRoutes(db))
      app.listen(port, () => {
         console.log(`Server running on port ${port}...`)
      })
   } catch (err) {
      console.error("Failed to connect to database:", err)
   }
}

startServer()