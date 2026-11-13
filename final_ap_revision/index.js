const {PrismaClient} = require("./generated/prisma");

const prisma = new PrismaClient();
const express = require("express");





// async function main(){

// // fecth table content 
// // it is equivele to select
// const data = await prisma.todo.findMany()
// console.log(data)

// }
// main()

// making server to remember

const app = express();

app.use(express.json()) // will not work without it because we have not specified json

app.get("/todos", async (req,res)=> {

    const data = await prisma.todo.findMany()
    res.send(data)
})
// on specific id
// dynamic parameter

app.get("/todos/:id", async(req,res) => {
   const id =  req.params.id

  const todo = await prisma.todo.findUnique({

    where:{
        id: Number(req.params.id)
    }

  })

  res.send(todo)
})


app.post("/todos", async(req,res) => {
    await prisma.Todo.create({
        data: req.body
    })
    res.send("OK")
})

app.put("/todos/:id",async(req,res)=>{
    const id = req.params.id;
    const body = req.body;

    await prisma.Todo.update({
where:{
    id: Number(id)
},
data : body

    })
    res.send("ok")
})

app.delete("/todos/:id" ,async(req,res) => {

    const id = req.params.id;
    await prisma.Todo.delete({
        where: {
            id: Number(id)
        }

    })
    res.send("ok")
})

app.listen(3000)