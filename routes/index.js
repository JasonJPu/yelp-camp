const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");

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
  const newUser = new User({ username: req.body.username });
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
router.post("/login", passport.authenticate("local", {
  failureRedirect: "/login",
  failureFlash: true
}), (req, res) => {
  req.flash("success", `Welcome back ${req.body.username}!`);
  res.redirect("/campgrounds");
});

// logout route
router.get("/logout", (req, res) => {
  req.logout();
  req.flash("success", "Successfully logged out!")
  res.redirect("/campgrounds");
});

// middleware
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

module.exports = router;
