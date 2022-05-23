const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const app = express();


app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Manufacturer company server is running....................');
})

app.listen(port, () => {
    console.log('Manufacture is running at port--> ', port);
});