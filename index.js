const express = require('express')
const cors = require('cors')
require('dotenv').config()
var jwt = require('jsonwebtoken');
const app = express()
const port = process.env.PORT || 5000 

// middleware 
app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.PROJECT_NAME}:${process.env.PROJECT_PASS}@cluster0.iimwc2a.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const menuCollection = client.db("bossDb").collection('menu')
const usersCollection = client.db("bossDb").collection('users')
const reviewCollection = client.db("bossDb").collection('reviews')
const cartCollection = client.db("bossDb").collection('carts')

const verifyToken = ( req, res, next) =>{
  console.log('token iin the middleware',req.headers.authorization)
  if(!req.headers.authorization){
    return res.status(401).send({message: 'unauthorize-access'})
  }
  const token = req.headers.authorization.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) =>{
    if(error){
      return res.status(401).send({message: 'unauthorize-access'})
    }
    req.decoded = decoded
    next()
  } )
  
}

const verifyAdmin = async (req, res, next) =>{
    const email = req.decoded.email;
    const query = {email: email}
    const user = await usersCollection.findOne(query)
    const isAdmin = user?.role === 'admin'
    if(!isAdmin){
      return res.status(403).send({message: 'forbidden-access'})
    }
    next()
} 

// jwt related api 
app.post('/jwt', async(req, res) =>{
  const user = req.body
  const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
    expiresIn: '1hr'
  })
  res.send({token})
})



// users related api 

// get all users 
app.get('/users', verifyToken, verifyAdmin, async(req, res) =>{
  try {
    // console.log(req.headers)
    const result = await usersCollection.find().toArray()
    res.send(result)

  } catch (error) {
    console.log(error)
  }

})

// get admin users data 
app.get('/users/admin/:email', verifyToken, verifyAdmin, async(req, res) =>{
  const email = req.params.email 
  if(email !== req.decoded.email){
    return res.status(403).send({message: 'forbidden access'})
  }
  const query = {email: email}
  const user = await usersCollection.findOne(query)
  let admin = false 
  if(user){
    admin = user?.role === 'admin';
  }
  res.send({admin})
})


// post uses data 
app.post('/users', async(req, res) =>{
  try {
    const user = req.body 
    // insert user if user is a new user \
    const query = {email: user.email}
    const isExist = await usersCollection.findOne(query)
    if(isExist){
      return res.send({message: 'user already exist', insertedId : null})
    }

    const result = await usersCollection.insertOne(user)
    res.send(result) 
      
  } catch (error) {
    
  }
})

// delete users by admin 
app.delete('/users/:id',verifyToken, verifyAdmin, async(req, res) =>{
try {
  const id = req.params.id 
  const query = {_id: new ObjectId(id)}
  const result = await usersCollection.deleteOne(query)
  res.send(result)

} catch (error) {
  console.log(error)
}
})

// make user admin 
app.patch('/users/admin/:id', verifyAdmin, verifyToken, async(req, res) =>{
 try {
  const id = req.params.id 
  const filter = {_id: new ObjectId(id)}
  const updateDoc = {
    $set:{
      role: 'admin'
    }  
  }
  const result = await usersCollection.updateOne(filter, updateDoc)
  res.send(result)
  
 } catch (error) {
  console.log(error)
 }
})


// menu related api 

app.get('/menu', async(req, res) =>{
  try {
    const query = menuCollection.find()
    const result = await query.toArray()
    res.send(result)
  } catch (error) {
    console.log(error)
  }
})

// get a single item for update 
app.get('/menu/:id', async(req, res) =>{
  const id = req.params.id 
  const query = {_id: new ObjectId(id)}
  const result = await menuCollection.findOne(query)
  res.send(result)
})

// update to the menu 
app.patch('/menu/:id', async(req, res) =>{
  try {
    const id = req.params.id 
  const item = req.body 
  const filter = {_id: new ObjectId(id)}
  const updateDoc ={
    $set:{
      name: item.name,
      price: item.price,
      category: item.category,
      image: item.image,
      recipe: item.recipe
    }
  }
  const result = await menuCollection.updateOne(filter, updateDoc)
  res.send(result)
    
  } catch (error) {
    console.log(error)
  }
})



app.get('/review', async(req, res) =>{
  try {
    const query = reviewCollection.find()
    const result = await query.toArray()
    res.send(result)
  } catch (error) {
    console.log(error)
  }
})


// added menu to menu form 
app.post('/menu', verifyToken, verifyAdmin, async(req, res) =>{
  try {
    const items = req.body 
    const result = await menuCollection.insertOne(items)
    res.send(result)
    
  } catch (error) {
    console.log(error)
  }

})

// delete a menu items 
app.delete('/menu/:id', verifyToken, verifyAdmin, async(req, res) =>{
  try {
    const id = req.params.id 
  const query = {_id: new ObjectId(id)}
  const result = await menuCollection.deleteOne(query)
  res.send(result)
    
  } catch (error) {
    console.log(error)
  }
})


// post cart item 
app.post('/carts', async(req, res) =>{
  try {
    const cartItem = req.body 
    const result = await cartCollection.insertOne(cartItem)
    res.send(result)
  } catch (error) {
    console.log(error)
  }
})

// get cart item 
app.get('/carts', async(req, res) =>{
  try {
    const email = req.query.email 
    // console.log(email)
    let query = {email: email}
      const collection = cartCollection.find(query)
      const result = await collection.toArray()
      res.send(result)
  } catch (error) {
    console.log(error)
  }
})

// delete cart items 
app.delete('/carts/:id', async(req, res) =>{
try {
  const id = req.params.id
  const query = {_id: new ObjectId(id)}
  const result = await cartCollection.deleteOne(query)
  res.send(result)
} catch (error) {
  console.log(error)
}
})



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();





    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) =>{
    res.send('Boss Is Running')
})

app.listen(port, () =>{
    console.log(`Boss Restaurant is Open Port ${port}`)
})