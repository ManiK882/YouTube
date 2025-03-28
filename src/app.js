import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
const app = express();

//app.use is used for middleware.
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())


//routes import

import userRouter from './routes/user.routes.js';


//routes declaration router ko lane k liye middleware lana padega.
app.use("/api/v1/users",userRouter)


//http://localhosthost:800/api/v1/users/register
export {app};