const express = require('express')
require('./db/mongoose');
const userRouter = require('./routers/userRouter')
const passRouter = require('./routers/passRouter')
const locationRouter = require('./routers/locationRouter')

const app = express()
const port = process.env.port

app.use(express.json())
app.use(userRouter)
app.use(passRouter)
app.use(locationRouter)

app.listen(port, ()=>{
    console.log('hall pass api server is up on port '+port)
})
