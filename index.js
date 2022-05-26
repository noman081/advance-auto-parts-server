const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;
const app = express();


app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    });
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tsxja.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const partCollection = client.db('Autoparts').collection('parts');
        const orderCollection = client.db('Autoparts').collection('orders');
        const userCollection = client.db('Autoparts').collection('users');
        const reviewCollection = client.db('Autoparts').collection('reviews');
        const paymentCollection = client.db('Autoparts').collection('payments');

        //users api
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const isExists = await userCollection.findOne(filter);
            console.log(user);
            console.log(isExists);
            if (isExists) {
                user.role = isExists.role;
            }
            console.log(user);
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        });

        app.get('/users', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        //parts api
        app.get('/parts', async (req, res) => {
            const home = req.query.home;
            if (home) {
                const result = await partCollection.find().limit(6).toArray();
            }
            else {
                const result = await partCollection.find().toArray();
            }
            res.send(result);
        });
        app.get('/part/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await partCollection.findOne(query);
            res.send(result);
        });

        app.post('/parts', async (req, res) => {
            const part = req.body;
            const result = await partCollection.insertOne(part);
            res.send(result);
        })

        app.delete('/part/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await partCollection.deleteOne(filter);
            res.send(result);
        })

        //orders api
        app.post('/orders', async (req, res) => {
            const order = req.body;
            console.log(order);
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });

        app.get('/orders', async (req, res) => {
            const orders = await orderCollection.find().toArray();
            res.send(orders);
        })

        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const order = await orderCollection.findOne(filter);
            res.send(order);
        })
        app.get('/order', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const orders = await orderCollection.find(query).toArray();
                res.send(orders);
            }
            else {
                return res.send({ message: 'Forbidden access' });
            }
        });


        //reviews api
        app.post('/reviews', verifyJWT, async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        })
        app.get('/reviews', verifyJWT, async (req, res) => {
            const reviews = await reviewCollection.find().limit(6).toArray();
            res.send(reviews);
        })

        //admin and user check
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            console.log(user);
            const isAdmin = user.role === 'admin';
            console.log('admin ', isAdmin);
            res.send({ admin: isAdmin });
        });

        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isUser = user.role === 'user';
            console.log('user ', isUser);
            res.send({ user: isUser });
        });
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        //payment apis
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });

        app.patch('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }

            const result = await paymentCollection.insertOne(payment);
            const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedOrder);
        })
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