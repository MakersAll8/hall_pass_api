const mongoose = require('mongoose')

// const url = "mongodb://127.0.0.1:27017/hall-pass-api";
mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
});
