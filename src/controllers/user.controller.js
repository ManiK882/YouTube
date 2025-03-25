import {asyncHandler} from '../utils/asyncHandler.js';


//this function is used to register the user.
const registerUser = asyncHandler( async(req,res)=>{
    
    res.status(200).json({
        message:"ok"
    })
})


export {registerUser};//object type se export.
