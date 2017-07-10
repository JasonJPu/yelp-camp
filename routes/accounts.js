const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const Campground = require("../models/campground");
const async = require("async");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// show register form
router.get("/register", (req, res) => {
  res.render("accounts/register", { page: "register" });
});

// sign up logic
router.post("/register", (req, res, next) => {
  if (req.body.password !== req.body.confirm) {
    req.flash("error", "Passwords do not match.");
    return res.redirect("back");
  }
  async.waterfall([
    (done) => {
      User.find({ email: req.body.email }, (err, foundUser) => {
        if (foundUser.length !== 0) {
          err = new Error("A user with the given email is already registered.");
        }
        done(err);
      });
    },
    (done) => {
      crypto.randomBytes(20, (err, buf) => {
        const token = buf.toString("hex");
        done(err, token);
      });
    },
    (token, done) => {
      const newUser = new User(
        {
          username: req.body.username,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          profilePic: req.body.profilePic,
          email: req.body.email,
          emailAuthenticationToken: token,
        });
      User.register(newUser, req.body.password, (err, user) => {
        done(err, user, token);
      });
    },
    (user, token, done) => {
      const smtpTransport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: "donotreplytomethanks@gmail.com",
          pass: process.env.GMAILPW,
        },
      });
      const mailOptions = {
        to: user.email,
        from: "donotreplytomethanks@gmail.com",
        subject: "YelpCamp Email Authentication",
        text: `Hi ${user.firstName},

Thanks for joining YelpCamp!

You're almost there. Just one more step!

Please confirm your email address by clicking on the link below.

http://${req.headers.host}/accounts/authenticate/${token}
`
      };
      smtpTransport.sendMail(mailOptions, (err) => {
        console.log("mail sent");
        done(err, "done");
      });
    },
  ], (err) => {
    if (err) {
      console.log(err);
      req.flash("error", err.message);
      return res.redirect("back");
    }
    User.findOne({ username: req.body.username }, (err, user) => {
      passport.authenticate("local")(req, res, () => {
        req.flash("success", `Successfully signed up! Welcome to YelpCamp, ${user.username}! We have sent you an e-mail to activate your account.`)
        res.redirect("/campgrounds");
      });
    });
  });
});

// email authentication route
router.get("/authenticate/:token", (req, res) => {
  User.findOne({ emailAuthenticationToken: req.params.token }, (err, user) => {
    if (!user) {
      req.flash("error", "Email authentication token is invalid");
      return res.redirect("/campgrounds");
    }
    user.isEmailAuthenticated = true;
    user.emailAuthenticationToken = undefined;
    user.save((err) => {
      if (err) {
        req.flash("error", "Something went wrong!");
        res.redirect("/campgrounds");
      }
      req.logout();
      req.flash("success", "Your account has been successfully authenticated!");
      res.redirect("/accounts/login");
    });
  });
});

// show login page
router.get("/login", (req, res) => {
  res.render("accounts/login", { page: "login" });
});

// handle login logic
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      req.flash("error", "Username or password is incorrect.");
      return res.redirect("back");
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

// Forgot password
router.get("/forgot", (req, res) => {
  res.render("accounts/forgot");
});

router.post("/forgot", (req, res, next) => {
  async.waterfall([
    (done) => {
      crypto.randomBytes(20, (err, buf) => {
        const token = buf.toString("hex");
        done(err, token);
      });
    },
    (token, done) => {
      User.findOne({ email: req.body.email }, (err, user) => {
        if (!user) {
          req.flash("error", "No account with that email address exists.");
          return res.redirect("back");
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


http://${req.headers.host}/accounts/reset/${token}


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
    res.redirect("back");
  });
});

router.get("/reset/:token", (req, res) => {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() }}, (err, user) => {
    if (!user) {
      req.flash("error", "Password reset token is invalid or has expired.");
      return res.redirect("/accounts/forgot");
    }
    res.render("accounts/reset", { token: req.params.token });
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
