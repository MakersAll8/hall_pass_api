const express = require('express')
require('./db/mongoose');
const userRouter = require('./routers/userRouter')
const passRouter = require('./routers/passRouter')
const locationRouter = require('./routers/locationRouter')

const app = express()
const port = process.env.PORT

app.use(function (req, res, next){
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', '*')
    res.header('Access-Control-Allow-Methods', '*')
    next()
})
app.use(express.json())
app.use(userRouter)
app.use(passRouter)
app.use(locationRouter)

app.listen(port, ()=>{
    console.log('hall pass api server is up on port '+port)
})
