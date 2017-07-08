const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const Campground = require("../models/campground");

// root route
router.get("/", (req, res) => {
  res.render("landing");
});

// show register form
router.get("/register", (req, res) => {
  res.render("register", { page: "register" });
});

// sign up logic
router.post("/register", (req, res) => {
  const newUser = new User(
    {
      username: req.body.username,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      profilePic: req.body.profilePic,
      email: req.body.email,
    });
  User.register(newUser, req.body.password, (err, user) => {
    if (err) {
      console.log(err);
      req.flash("error", err.message);
      return res.redirect("/register");
    }
    passport.authenticate("local")(req, res, () => {
      req.flash("success", `Successfully signed up! Welcome to YelpCamp, ${user.username}!`)
      res.redirect("/campgrounds");
    });
  });
});

// show login page
router.get("/login", (req, res) => {
  res.render("login", { page: "login" });
});

// handle login logic
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      req.flash("error", "Username or password is incorrect.");
      return res.redirect("/login");
    }
    req.logIn(user, (err) => {
      if (err) { return next(err); }
      const redirectTo = req.session.redirectTo ? req.session.redirectTo : "/campgrounds";
      delete req.session.redirectTo;
      req.flash("success", `Welcome back ${req.body.username}!`);
      return res.redirect(redirectTo);
    });
    return;
  })(req, res, next);
});

// logout route
router.get("/logout", (req, res) => {
  req.logout();
  req.flash("success", "Successfully logged out!")
  res.redirect("/campgrounds");
});

// USERS PROFILE
router.get("/users/:id", (req, res) => {
  User.findById(req.params.id, (err, user) => {
    if (err) {
      req.flash("error", "Something went wrong");
      res.redirect("/");
    } else {
      Campground.find().where('author.id').equals(user._id).exec((err, campgrounds) => {
        if (err) {
          req.flash("error", "Something went wrong");
          res.redirect("/");
        } else {
          res.render("users/show", { user, campgrounds });
        }
      });
    }
  })
});

module.exports = router;
