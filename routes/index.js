const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const Campground = require("../models/campground");
const async = require("async");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

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
  if (req.body.password === req.body.confirm) {
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
  } else {
    req.flash("error", "Passwords do not match.");
    res.redirect("back");
  }
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
      Campground.find().where("author.id").equals(user._id).exec((err, campgrounds) => {
        if (err) {
          req.flash("error", "Something went wrong");
          res.redirect("/");
        } else {
          res.render("users/show", { user, campgrounds });
        }
      });
    }
  });
});

// Forgot password
router.get("/forgot", (req, res) => {
  res.render("forgot");
});

router.post("/forgot", (req, res, next) => {
  async.waterfall([
    (done) => {
      crypto.randomBytes(20, (err, buf) => {
        let token = buf.toString("hex");
        done(err, token);
      });
    },
    (token, done) => {
      User.findOne({ email: req.body.email }, (err, user) => {
        if (!user) {
          req.flash("error", "No account with that email address exists.");
          return res.redirect("/forgot");
        }
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        user.save((err) => {
          done(err, token, user);
        });
      });
    },
    (token, user, done) => {
      const smtpTransport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: "donotreplytomethanks@gmail.com",
          pass: process.env.GMAILPW,
        },
      });
      const mailOptions = {
        to: user.email,
        from: "donotreply@yelpcamp.com",
        subject: "YelpCamp Password Reset",
        text: `You are receiving this because you (or someone else) have requested the requested the reset of the password for your account.


Please click on the following link, or paste this into your browser to complete the process:


http://${req.headers.host}/reset/${token}


If you did not request this, please ignore this email and your password will remain unchanged.
`,
      };
      smtpTransport.sendMail(mailOptions, (err) => {
        console.log("mail sent");
        req.flash("success", `An e-mail has been sent to ${user.email} with further instructions.`);
        done(err, "done");
      });
    }
  ], (err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/forgot");
  });
});

router.get("/reset/:token", (req, res) => {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() }}, (err, user) => {
    if (!user) {
      req.flash("error", "Password reset token is invalid or has expired.");
      return res.redirect("/forgot");
    }
    res.render("reset", { token: req.params.token });
  });
});

router.post("/reset/:token", (req, res) => {
  async.waterfall([
    (done) => {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() }}, (err, user) => {
        if (!user) {
          req.flash("error", "Password reset token is invalid or has expired.");
          return res.redirect("back");
        }
        if (req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, (err) => {
            console.log(req.body.password);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            user.save((err) => {
              req.logIn(user, (err) => {
                done(err, user);
              });
            });
          });
        } else {
          req.flash("error", "Passwords do not match.");
          res.redirect("back");
        }
      });
    },
    (user, done) => {
      const smtpTransport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: "donotreplytomethanks@gmail.com",
          pass: process.env.GMAILPW,
        },
      });
      const mailOptions = {
        to: user.email,
        from: "donotreply@yelpcamp.com",
        subject: "YelpCamp Password Reset",
        text: `Hello,

This is a confirmation that the password for your account ${user.email} has just been changed.`,
      };
      smtpTransport.sendMail(mailOptions, (err) => {
        console.log("mail sent");
        req.flash("success", "Success! Your password has been changed.");
        done(err);
      });
    },
  ], (err) => {
    res.redirect("/campgrounds");
  });
});

module.exports = router;
