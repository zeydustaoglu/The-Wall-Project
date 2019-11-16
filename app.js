//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash");

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");


////////////////////////// image

const multer = require("multer");
const path = require("path");

//Set storage engine
const storage = multer.diskStorage({
  destination: "./public/uploads/",
  filename: function(req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  }
});

// Init Uplpoad
// Init Upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 },
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
}).single("myImage");

function checkFileType(file, cb) {
  const fileTypes = /jpeg|jpg|png|gif/;
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = fileTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Error:Image Only!");
  }
}

////////////////////////// image

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

app.use(
  session({
    secret: "Our little secret",
    resave: false,
    saveUninitialized: false
  })
);
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(
  "mongodb+srv://admin-zeyd:test1234@mycluster-qlk57.mongodb.net/dbWallProject",
  { useNewUrlParser: true, useUnifiedTopology: true }
);

// mongoose.connect("mongodb://localhost:27017/wallProjectDB", {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// });
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  googleId: String,
  imageUrl: String
});

const postSchema = new mongoose.Schema({
  autherName: String,
  title: String,
  content: String,
  likes: String,
  dislikes: String,
  imageUrl: String,
  dateTime: String,
  tagName: String,
  views: String
});

const postTypeSchema = new mongoose.Schema({
  postTypeName: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
const Post = new mongoose.model("Post", postSchema);
const PostType = new mongoose.model("PostType", postTypeSchema);

// PostType.insertMany([
//   {
//     postTypeName: "Economy"
//   },
//   {
//     postTypeName: "Social"
//   },
//   {
//     postTypeName: "World"
//   },
//   {
//     postTypeName: "Technology"
//   },
//   {
//     postTypeName: "Sport"
//   },
//   {
//     postTypeName: "Health"
//   },
//   {
//     postTypeName: "Politics"
//   },
//   {
//     postTypeName: "Art"
//   }
// ]);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function(accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function(err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/");
  }
);

/////////////////////////////////// GET LOGIN ///////////////////////////////////

app.get("/login", function(req, res) {
  res.render("login");
});

/////////////////////////////////// GET REGISTER ///////////////////////////////////

app.get("/register", function(req, res) {
  res.render("register", { isFalse: "false", err: null });
});

/////////////////////////////////// GET USERS ///////////////////////////////////

app.get("/users", function(req, res) {
  if (req.isAuthenticated()) {
    User.find({}, function(err, foundUsers) {
      if (err) {
        console.log(err);
      } else {
        if (foundUsers) {
          PostType.find({}, function(err, postTypes) {
            res.render("users", {
              postTypes: postTypes,
              users: foundUsers
            });
          });
        }
      }
    });
  } else {
    res.redirect("/login");
  }
});

/////////////////////////////////// GET PROFILE ///////////////////////////////////

app.get("/profile", function(req, res) {
  if (req.isAuthenticated()) {
    User.findOne({ _id: req.session.userId }, function(err, user) {
      if (err) {
        console.log(err);
      } else {
        if (user) {
          Post.find({ autherName: req.session.userName }, function(err, posts) {
            PostType.find({}, function(err, postTypes) {
              var totalPosts = posts.length;
              var totalLikes = 0;
              var totalViews = 0;

              for (let i = 0; i < posts.length; i++) {
                totalLikes = totalLikes + Number(posts[i].likes);
                totalViews = totalViews + Number(posts[i].views);
              }
              const errmessage = req.session.message
              
              res.render("profile", {
                user: user,
                postTypes: postTypes,
                posts: posts,
                totalPosts: totalPosts,
                totalLikes: totalLikes,
                totalViews: totalViews,
                errmessage:errmessage
              });
            });
          }).sort('-dateTime');;
        }
      }
    });
  } else {
    res.redirect("/login");
  }
});

/////////////////////////////////// GET WALL ///////////////////////////////////

app.get("/", function(req, res) {
  if (req.isAuthenticated()) {
    User.findOne({ username: req.session.userName }, function(err, user) {
      if (err) {
        console.log(err);
      } else {
        if (user) {
          Post.find({}, function(err, posts) {
            PostType.find({}, function(err, postTypes) {
              res.render("wall", {
                user: user,
                postTypes: postTypes,
                posts: posts
              });
            });
          }).sort('-dateTime');
        }
      }
    });
  } else {
    res.redirect("/login");
  }
});

/////////////////////////////////// GET LIKE  ///////////////////////////////////

app.get("/like/:postId", function(req, res) {
  const postId = req.params.postId;

  Post.findOne({ _id: postId }, function(err, post) {
    post.likes = Number(post.likes) + 1;
    post.save();
    
    res.redirect(req.get("referer"));
  });
});
/////////////////////////////////// GET DISLIKE  ///////////////////////////////////
app.get("/dislike/:postId", function(req, res) {
  const postId = req.params.postId;

  Post.findOne({ _id: postId }, function(err, post) {
    post.dislikes = Number(post.dislikes) + 1;
    post.save();

    res.redirect(req.get("referer"));
  });
});
/////////////////////////////////// GET WALL PARAM ///////////////////////////////////

app.get("/:param", function(req, res) {
  if(req.params.param !== 'logout'){
    const param = _.capitalize(req.params.param);
    if (req.isAuthenticated()) {
      User.findOne({ _id: req.session.userId }, function(err, user) {
        PostType.findOne({ postTypeName: param }, function(err, postType) {
          if (postType === null) {
            console.log(param)
            Post.findOne({ _id: param }, function(err, post) {
              PostType.find({}, function(err, postTypes) {
                post.views = Number(post.views) + 1;
                post.save();
                res.render("wall", {
                  user: user,
                  postTypes: postTypes,
                  post: post,
                  pageName: param
                });
              });
            }).sort('-dateTime');;
          } else {
            if (postType) {
              Post.find({ tagName: postType.postTypeName }, function(err, posts) {
                PostType.find({}, function(err, postTypes) {
                  res.render("wall", {
                    user: user,
                    postTypes: postTypes,
                    posts: posts,
                    pageName: param
                  });
                });
              }).sort('-dateTime');;
            }
          }
        });
      });
    } else {
      res.redirect("/login");
    }
  }else{
    req.logOut();
    res.redirect("/");
  }
  
});

/////////////////////////////////// POST REGISTER  ///////////////////////////////////

app.post("/register", function(req, res) {
  if (req.body.password === req.body.passwordconf) {
    if(req.body.password.lengths >= 6){
      User.register(
        { username: req.body.username, email: req.body.email },
        req.body.password,
        function(err, user) {
          if (err) {
            res.render("register", { err: err.message, isFalse: "false" });
          } else {
            passport.authenticate("local")(req, res, function() {
              User.findOne({ username: req.body.username }, function(err, user) {
                req.session.userId = user._id;
                res.redirect("/");
              });
            });
          }
        }
      );
    }else{
      res.render("register", { err: 'Password needs to be at least 6 characters ', isFalse: "false", });
    }
  } else {
    res.render("register", { err: null, isFalse: "true" });
  }
});

///////////////////////////////////  POST LOGIN  ///////////////////////////////////

app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  User.findOne({ username: user.username }, function(err, user) {
    if (user) {
      const userId = user._id;

      req.login(user, function(err) {
        if (err) {
          console.log(err);
        } else {
          passport.authenticate("local")(req, res, function() {
            req.session.userId = userId;
            req.session.userName = user.username;
            res.redirect("/");
          });
        }
      });
    } else {
      res.redirect("/login");
    }
  });
});

///////////////////////////////////  POST UPLOAD-POST  ///////////////////////////////////

app.post("/profile", function(req, res) {
 
  upload(req, res, (err) => {   
 
    if(err){
     console.log(err)
     req.session.message = err.message;
     
     res.redirect("/profile");
    } else {
      if(req.file == undefined){      
        console.log( 'Error: No File Selected!')
        res.redirect("/profile");
     
      } else {
        const postType = req.body.postType;
        const username = req.body.username;
        const postTitle = req.body.postTitle;
        const postContent = req.body.postContent;
             
        var today = new Date();
        var dd = today.getDate();
      
        var mm = today.getMonth() + 1;
        var yyyy = today.getFullYear();
        var hour = today.getHours();
        var min = today.getMinutes();
        var second = today.getSeconds();
      
        let date = dd + "-" + mm + "-" + yyyy + "/"+ hour+":"+min+":"+second;
     
        const post = new Post({
          autherName: username,
          title: postTitle,
          content: postContent,
          likes: 0,
          dislikes: 0,
          imageUrl: `uploads/${req.file.filename}`,
          dateTime: date,
          tagName: postType,
          views: 0
          
        });
        post.save();
        req.session.message = null
        res.redirect("/profile");
      }
    }
  });

 
});

/////////////////////////////////// POST DELETE ///////////////////////////////////

app.get("/delpost/:postId", function(req, res){
  const postId = req.params.postId;

    Post.findByIdAndRemove( postId, function(err){
      if (!err) {
        console.log("Successfully deleted checked item.");
        res.redirect("/profile");
      }else{
        console.log(err)
      }
    });
});

/////////////////////////////////// GET LOGOUT  ///////////////////////////////////

app.get("/logout", function(req, res) {
  req.logOut();
  res.redirect("/");
});

/////////////////////////////////// LISTEN ///////////////////////////////////
let port = process.env.PORT;

if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server has started successfully!");
});
