import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/temp')
    },
    filename: function (req, file, cb) {
      
      cb(null, file.originalname)
    }
  })
  
  export const upload = multer({ storage: storage })
  //console.log(file); test it
  //yaha se localfilepath milega. yeh function return karega.
