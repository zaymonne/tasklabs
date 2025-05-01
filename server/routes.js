const bcrypt = require("bcrypt")
const nodemailer = require("nodemailer")
const express = require("express")
const router = express.Router()
const { ObjectId } = require("mongodb")
require("dotenv").config()

module.exports = db => {
   // =========================================USER
   
   // retrieve users
   router.get("/fetch-users", async (req, res) => {
      try {
         const users = await db.collection("users").find().toArray()
   
         res.json({ success: true, users })
      }
      catch (err) {
         console.error("Error fetching users: ", err)
         res.status(500).json({ success: false, msg: "failed to fetch users" })
      }
   })
   
   // user sign-up
   router.post("/sign-up-user", async (req, res) => {
      const { username, email, password } = req.body

      // server-side validation
      if (
         username === undefined || email === undefined || password === undefined ||
         username.trim().length == 0 || email.trim().length == 0 || password.trim().length == 0
      ) {
         return res.status(400).json({ success: false, msg: "Please fill-up all the fields." })
      }
      
      try {
         // hashing the raw password
         const hashedPassword = await bcrypt.hash(password.trim(), 10)
         // inserting the user
         const result = await db.collection("users").insertOne({ username, email, hashedPassword })

         res.status(201).json({ success: true, userID: result.insertedId })
      }
      catch (err) {
         console.error("Error fetching users: ", err)
         res.status(500).json({ success: false, msg: "failed to add user" })
      }
   })

   // user log-in
   router.post("/log-in-user", async (req, res) => {
      const { email, password } = req.body

      if (
         email === undefined || password === undefined ||
         email.trim().length == 0 || password.trim().length == 0
      ) {
         return res.status(400).json({ success: false, msg: "Please fill-up all the fields." })
      }
      
      try {
         const user = await db.collection("users").findOne({ email })

         if (!user) {
            return res.status(401).json({ success: false, msg: "Inavlid credentials. Please try again." })
         }
         
         // matching hashed to raw
         const passwordMatched = await bcrypt.compare(password, user.hashedPassword)
         
         // successful login
         if (passwordMatched) {
            res.status(200).json({ success: true, msg: `Welcome back ${user.username}`, id: user._id })
         }
         // unsuccessful login
         else {
            return res.status(401).json({ success: false, msg: "Inavlid credentials. Please try again." })
         }
      }
      catch (err) {
         console.error("Error while logging the user in: ", err)
         res.status(500).json({ success: false, msg: "Failed to log-in." })
      }
   })

   // update user
   router.patch("/update-user", async (req, res) => {
      const { id, username, email } = req.body

      try {
         const result = await db.collection("users").updateOne(
            { "_id": new ObjectId(id) },
            { $set: { username, email } }
         )

         if (result.modifiedCount == 0) {
            return res.status(404).json({ success: false, msg: "No changes made. User not found." })
         }

         res.status(201).json({ success: true, msg: "Your profile has been updated." })
      }
      catch (err) {
         console.error("Error while updating user:", err)
         res.status(500).json({ success: false, msg: "Failed to update user." })
      }
   })

   // =========================================MAILING
   
   // sending email notification
   router.post("/notify-user", async (req, res) => {
      const { email } = req.body
      
      if (email === undefined || email.trim().length == 0) {
         return res.status(401).json({ success: false, msg: "Email is required" })
      }

      try {
         const gmailAddress = process.env.GMAIL_ADDRESS
         const gmailPassword = process.env.GMAIL_APP_PASSWORD

         console.log(gmailAddress, gmailPassword)
         
         const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
               user: gmailAddress,
               pass: gmailPassword
            }
         })

         const mailOptions = {
            from: gmailAddress,
            to: email,
            subject: "Tasklabs",
            text: "goodevening, yawyaw"
         }

         transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
               console.error("Error while mailing the user: ", error)
               res.status(500).json({ success: false, msg: "Unable to send the email." })
            }
            else {
               res.json({ success: true, msg: `Email has been sent. ${info.response}` })
            }
         })
      }
      catch (err) {
         console.error("Error while mailing the user: ", err)
         res.status(500).json({ success: false, msg: "Failed to mail the user." })
      }
   })

   // =========================================SINGLE_TASK

   // fetching single tasks only
   router.get("/fetch-single-tasks", async (req, res) => {
      try {
         const singleTasks = await db.collection("single_tasks").find().toArray()

         res.json({ success: true, singleTasks })
      }
      catch (err) {
         console.error("Error fetching single tasks: ", err)
         res.status(500).json({ success: false, msg: "Failed to fetch single tasks." })
      }
   })

   // adding single task
   router.post("/add-single-task", async (req, res) => {
      const { ownerID, title, description, tags, priority } = req.body
      
      try {
         const dueDate = new Date()
         const singleTasks = await db.collection("single_tasks").insertOne({ ownerID, title, description, tags, priority, dueDate, done: false })

         res.status(201).json({ success: true, id: singleTasks.insertedId })
      }
      catch (err) {
         console.error("Error adding single task: ", err)
         res.status(500).json({ success: false, msg: "Failed to add single task." })
      }
   })

   // updating single task
   router.patch("/update-single-task", async (req, res) => {
      const { id, title, description, tags, priority, done } = req.body

      try {
         const result = await db.collection("single_tasks").updateOne(
            { _id: new ObjectId(id) },
            { $set: { title, description, tags, priority, done } }
         )

         if (result.modifiedCount == 0) {
            return res.status(404).json({ success: false, msg: "No changes made. Task not found." })
         }

         res.status(201).json({ success: true, msg: "Task has been updated." })
      }
      catch (err) {
         console.error("Error while updating the single task:", err)
         res.status(500).json({ success: false, msg: "Failed to update single task due to an error." })
      }
   })

   // deleting single task
   router.delete("/delete-single-task", async (req, res) => {
      const { id } = req.body

      try {
         await db.collection("single_tasks").deleteOne({ _id: new ObjectId(id) })

         res.status(201).json({ success: true, msg: "Task has been deleted." })
      }
      catch (err) {
         console.error("Error while deleting the task:", err)
         res.status(500).json({ success: false, msg: "Failed to delete the task due to an error." })
      }
   })

   // =========================================GROUPED_TASK

   // fetching grouped tasks only
   router.get("/fetch-grouped-tasks", async (req, res) => {
      try {
         const groupedTasks = await db.collection("grouped_tasks").find().toArray()

         res.json({ success: true, groupedTasks })
      }
      catch (err) {
         console.error("Error fetching grouped tasks: ", err)
         res.status(500).json({ success: false, msg: "Failed to fetch grouped tasks." })
      }
   })

   // adding grouped tasks
   router.post("/add-grouped-task", async (req, res) => {
      const { ownerID, title, description, tags, priority } = req.body
      
      try {
         const dueDate = new Date()
         const groupedTasks = await db.collection("grouped_tasks").insertOne({ ownerID, title, description, tags, priority, done: false, dueDate })

         res.status(201).json({ success: true, id: groupedTasks.insertedId })
      }
      catch (err) {
         console.error("Error adding single task: ", err)
         res.status(500).json({ success: false, msg: "Failed to add grouped task." })
      }
   })

   router.patch("/update-grouped-task", async (req, res) => {
      const { id, title, description, tags, priority } = req.body

      try {
         const result = db.collection("grouped_tasks").updateOne(
            { _id: new ObjectId(id) },
            { $set: { title, description, tags, priority } }
         )

         if (result.modifiedCount == 0) {
            return res.status(404).json({ success: false, msg: "No changes made. Task was not found." })
         }

         res.status(201).json({ success: true, msg: "Task has been updated." })
      }
      catch (err) {
         console.error("Error while updating the task:", err)
         res.status(500).json({ success: false, msg: "Failed to update the task due to an error." })
      }
   })

   // deleting grouped task
   router.delete("/delete-grouped-task", async (req, res) => {
      const { id } = req.body

      try {
         await db.collection("grouped_tasks").deleteOne({ _id: new ObjectId(id) })

         res.status(201).json({ success: true, msg: "Task has been deleted." })
      }
      catch (err) {
         console.error("Error while deleting the task:", err)
         res.status(500).json({ success: false, msg: "Failed to delete the task due to an error." })
      }
   })
   
   // =========================================GT_TASK
   
   // fetching gt tasks
   router.get("/fetch-gt-tasks", async (req, res) => {
      try {
         const gtTasks = await db.collection("gt_tasks").find().toArray()

         res.json({ success: true, gtTasks })
      }
      catch (err) {
         console.error("Error fetching gt tasks: ", err)
         res.status(500).json({ success: false, msg: "Failed to fetch gt tasks." })
      }
   })

   // adding gt task
   router.post("/add-gt-task", async (req, res) => {
      const { groupedTaskID, title, description, tags, priority } = req.body
      
      try {
         const dueDate = new Date()
         const gtTasks = await db.collection("gt_tasks").insertOne({ groupedTaskID, title, description, tags, priority, done: false, dueDate })

         res.status(201).json({ success: true, id: gtTasks.insertedId })
      }
      catch (err) {
         console.error("Error adding single task: ", err)
         res.status(500).json({ success: false, msg: "Failed to add gt task." })
      }
   })

   // updating gt task
   router.patch("/update-gt-task", async (req, res) => {
      const { id, title, description, tags, priority, done } = req.body

      try {
         const result = db.collection("gt_tasks").updateOne(
            { _id: new ObjectId(id) },
            { $set: { title, description, tags, priority, done } }
         )

         if (result.modifiedCount == 0) {
            return res.status(404).json({ success: false, msg: "No changes made. Task was not found." })
         }

         res.status(201).json({ success: true, msg: "Task has been updated." })
      }
      catch (err) {
         console.error("Error while updating the task.")
         res.status(500).json({ success: false, msg: "Failed to update the task due to an error." })
      }
   })

   // deleting gt task
   router.delete("/delete-gt-task", async (req, res) => {
      const { id } = req.body

      try {
         await db.collection("gt_tasks").deleteOne({ _id: new ObjectId(id) })

         res.status(201).json({ success: true, msg: "Task has been deleted." })
      }
      catch (err) {
         console.error("Error while deleting the task:", err)
         res.status(500).json({ success: false, msg: "Failed to delete the task due to an error." })
      }
   })
   
   // =========================================TAG

   // fetching tag
   router.get("/fetch-tags", async (req, res) => {
      try {
         const tags = await db.collection("tags").find().toArray()

         res.json({ success: true, tags })
      }
      catch (err) {
         console.error("Error while fetching tags:", err)
         res.status(500).json({ success: false, msg: "Failed to fetch tags due to an error." })
      }
   })
   
   // adding tag
   router.post("/add-tag", async (req, res) => {
      const { name, color } = req.body

      try {
         const result = await db.collection("tags").insertOne({ name, color })
         
         res.status(201).json({ success: true, id: result.insertedId })
      }
      catch (err) {
         console.error("Error while adding tag:", err)
         res.status(500).json({ success: false, msg: "Failed to add the tag due to an error." })
      }
   })

   // updating tag
   router.patch("/update-tag", async (req, res) => {
      const { id, name, color } = req.body

      try {
         const result = db.collection("tags").updateOne(
            { _id: new ObjectId(id) },
            { $set: { name, color } }
         )

         if (result.modifiedCount == 0) {
            return res.status(404).json({ success: false, msg: "No changes made. Tag was not found." })
         }

         res.status(201).json({ success: true, msg: "Tag has been updated." })
      }
      catch (err) {
         console.error("Error while updating the tag:", err)
         res.status(500).json({ success: false, msg: "Failed to update the tag due to an error." })
      }
   })
   
   // deleting tag
   router.delete("/delete-tag", async (req, res) => {
      const { id } = req.body

      try {
         await db.collection("tags").deleteOne({ _id: new ObjectId(id) })

         res.status(201).json({ success: true, msg: "Tag has been deleted." })
      }
      catch (err) {
         console.error("Error while deleting the tag:", err)
         res.status(500).json({ success: false, msg: "Failed to delete the tag due to an error." })
      }
   })

   return router
}