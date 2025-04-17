import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'
import { User } from "../models/user.model.js"
import { uploadOnCloudinary ,deleteImageFromCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        //database me dalenge 
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

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


const loginUser = asyncHandler(async (req, res) => {
    //req body ->data
    //username or email se authenticate.
    //find the user.
    //password check
    //access and refresh token
    //send cookie.

    const { email, username, password } = req.body;
    console.log(email, password);
    if (!(username || email)) {
        throw new ApiError(400, "username or email is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "user doesn't exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "invalid user credtials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    //cookies me vejo
    const loggedInUser = await User.findById(user._id).
        select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200, {
                user: loggedInUser, accessToken,
                refreshToken
            },
                "User logged in succesfully"
            )
        )
})


const logoutUser = asyncHandler(async (req, res) => {
    //req.user._id ishe login user ka info milega.
    User.findByIdAndUpdate(
        req.user._id, {
        $set: {
            refreshToken: undefined
        }
    },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))
})


const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

        if (!incomingRefreshToken) {
            throw new ApiError(401, "unauthorized request");
        }

        //doubt decode token kyun?
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refrah token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access Token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, "Invalid refresh Toke" || error?.message)
    }
})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
})


const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(200, req.user, "current user fetched successfully");
})


const updateAcoountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body;

    if (!fullname || !email) {
        throw new ApiError(400, "All fields are required ");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname: fullname,
                email: email
            }
        },
        { new: true }//this helps to return updated value.
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))

});


const updateUserAvatar = asyncHandler(async(req,res)=>{

const avatarLocalPath = req.file?.path;

//Todo: delete old image - assingment.
if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is missing");
}

const avatar = await uploadOnCloudinary(avatarLocalPath);

if(!avatar.url){
    throw new ApiError(400,"Error while uploading on avatar");
}

/**
 * const currentUser = await User.findById(req.user._id);
 * if(currentUser.avatar){
 * const segments = currentUser.avatar.split('/');
 * const publicIdWithExtension = segments[segments.length - 1];
 * const publicId = publicIdWithExtension.split('.');
 * }
 * 
 * await deleteImageFromCloudinary(publicId);
 */
const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
        $set:{
            avatar:avatar.url
        }
    },
    {new:true}
).select("-password")

return res.status(200)
.json(new ApiResponse(200,user,"Avatar Image is updated successfully"));

})

const updateUserCoverImage = asyncHandler(async(req,res)=>{

    const coverImageLocalPath = req.file?.path;
    
    if(!coverImageLocalPath){
        throw new ApiError(400,"Avatar file is missing");
    }
    
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    
    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading on avatar");
    }
    
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password");
    

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover Image updated successfully"));

    })
 

const getUserChannelProfile = asyncHandler(async(req,res) =>{
        const {username} = req.params;

        if(!username?.trim()){
            throw new ApiError(400,"username is missing");
        }

        const channel = await User.aggregate([
            {
                $match:{
                    username:username?.toLowerCase()
                }
            },
            {//this field finds the no of subscriber.
                $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
                }
                
            },
            {//this field finds the no of channel that subcribed.
                $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"subscriber",
                    as:"subscribedTo"
                }
            },
            {
                $addFields:{
                    subscribersCount:{
                        $size:"$subscribers"
                    },
                    channelsSubscribedToCount:{
                        $size:"$subscribedTo"
                    },
                    isSubscribed:{
                        $cond:{
                            if:
                            {
                                $in:[req.user?._id,"$subscribers.subscriber"]
                            },
                            then:true,
                            else:false
                        }
                    }
                }
            },
            {
                $project:{//selected thing 
                    fullname:1,
                    username:1,
                    subscribersCount:1,
                    channelsSubscribedToCount:1,
                    isSubscribed:1,
                    avatar:1,
                    coverImage:1,
                    email:1
                }
            }
        ])

        if(!channel?.length){
            throw new ApiError(404,"channel does not exist")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,channel[0],"User channel fetched successfully")
        )
    })

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:
                            {
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "watch history fetched successfully"
        )
    )

}) 
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAcoountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};//object type se export.
