class ApiError extends Error {
    constructor(
        statusCode,//http status code 400,500
        message="Something went wrong",//default error message
        errors = [],//additional error details (e.g validation errors)
        stack = ""//custom stack trace(typo:should be `stack`)
    ){
        super(message);//calls the parent class
        this.statusCode = statusCode;//stores http satus code
        this.data = null;//represents additional data (not used here)
        this.message = message;// Stores the error message
        this.success = false;// Indicates the operation was unsuccessful
        this.errors = errors;// Stores any additional error details

        if(stack){
            this.stack = stack
        }
        else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {ApiError}

/**class ApiError extends Error {
    constructor(
        statusCode,  // ❌ Not a built-in property of Error
        message = "Something went wrong",  // ✅ Built-in property of Error
        errors = [],  // ❌ Not a built-in property of Error
        stack = ""  // ❌ Not a built-in property of Error
    ) {
        super(message); // ✅ Calls the parent Error class constructor
        this.statusCode = statusCode; // ❌ Not from Error class, added manually
        this.data = null; // ❌ Custom property, not from Error class Placeholder for extra data (default: null)
        this.message = message; // ✅ Overwrites inherited Error property
        this.success = false; // ❌ Custom property, not from Error class
        this.errors = errors; // ❌ Custom property, not from Error class

        if (stack) {//in which file error is occured
            this.stack = stack; // ✅ Overwrites inherited Error property
        } else {
            Error.captureStackTrace(this, this.constructor); // ✅ Creates a clean stack trace
        }
    }
}
 */