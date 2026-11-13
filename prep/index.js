const express = require('express')

const app = express()

app.use(express.json())

app.get("/get",(req,res)=>{
    console.log("hi")
    res.send("hi")
})

app.listen(4001,()=>{
    console.log("server is listening on 4001")
})