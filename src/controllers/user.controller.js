import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from '../utils/ApiResponse.js';


//this function is used to register the user.
const registerUser = asyncHandler(async (req, res) => {
    //get user detais from frontend.
    //validation - not empty
    //check if user already exists:username,email.
    //check for images , check for avatar.
    //upload them to cloudinary. clodinary se ek response ayega then usse url nikalna padega aur ek bar avatar 
    //ko check karenge.
    //create user object - create entry in db
    //remove password and refresh token field from response.
    //check for user creation
    //return res.
    let { username, fullname, email, password } = req.body;
    console.log(req.body);

    //validation check. 

    //here if function check that all field is 
    // empty or not if one of the field is empty then it returnd true.

    if (
        [fullname, email, username, password].some((field) =>
            field?.trim() === "")

    ) {
        throw new ApiError(400, "All fields are required")
    }

    //checking existed user.
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    //taking localpath.

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;
    
    //doubt
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    //uploading
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }
    //why we returned it.
    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered succesfully")
    )
})


export { registerUser };//object type se export.
