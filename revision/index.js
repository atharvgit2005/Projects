const express = require('express');

const app = express();

app.use(express.json());

app.get('/', (req,res) =>{
    res.send("worg")
})

app.listen(3002, () => {
    console.log('Server is running on port 3002');
})
