const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();


app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tsxja.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const partCollection = client.db('Autoparts').collection('parts');


        //parts api
        app.get('/parts', async (req, res) => {
            const result = await partCollection.find().toArray();
            res.send(result);
        });
        app.get('/part/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await partCollection.findOne(query);
            res.send(result);
        });
    }
    finally {

    }
}


run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Manufacturer company server is running....................');
})

app.listen(port, () => {
    console.log('Manufacture is running at port--> ', port);
});